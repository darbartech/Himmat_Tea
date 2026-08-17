import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError, SAFE_CUSTOMER_SELECT } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { sendCustomerOrderStatusEmail } from '@/lib/email'
import { z } from 'zod'

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">

interface Params {
  params: Promise<{ id: string }>
}

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  AWAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'DELIVERED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
}

const statusUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  trackingNumber: z.string().optional().nullable(),
  courierPartner: z.string().optional().nullable(),
  cancelReason: z.string().optional(),
  refundReason: z.string().optional(),
  refundAmount: z.number().min(0).optional().nullable(),
}).strict()

async function resolveOrderByIdentifier(idOrOrderNumber: string) {
  let order = await prisma.order.findUnique({ where: { id: idOrOrderNumber } })
  if (!order) {
    order = await prisma.order.findUnique({ where: { orderNumber: idOrOrderNumber } })
  }
  return order
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const adminUser = await getCurrentAdmin()

    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }

    const resolved = await resolveOrderByIdentifier(id)
    if (!resolved) {
      return createErrorResponse('Order not found', 404)
    }
    const orderId = resolved.id

    const body = await request.json()
    const parsed = statusUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return createErrorResponse(
        `Invalid field: ${firstError.path.join('.')} - ${firstError.message}`,
        400
      )
    }

    const { status, trackingNumber, courierPartner, cancelReason, refundReason, refundAmount } = parsed.data

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
      },
    })

    if (!order) {
      return createErrorResponse('Order not found', 404)
    }

    const currentStatus = order.status
    const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || []

    if (!allowed.includes(status)) {
      return createErrorResponse(
        `Invalid order transition: ${currentStatus} → ${status}`,
        409
      )
    }

    const now = new Date()

    const updated = await prisma.$transaction(async (tx: Tx) => {
      const updateData: any = { status }
      if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
      if (courierPartner !== undefined) updateData.courierPartner = courierPartner

      const cancelledNeedsRestock =
        status === 'CANCELLED' &&
        (currentStatus === 'AWAITING_PAYMENT' || currentStatus === 'CONFIRMED' || currentStatus === 'PROCESSING')

      if (cancelledNeedsRestock) {
        const productIds = order.items.map(i => i.productId)
        const productsBefore = productIds.length > 0
          ? await tx.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, stock: true, name: true },
            })
          : []
        const productMap = new Map<number, { id: number; stock: number; name: string }>(productsBefore.map((p: { id: number; stock: number; name: string }) => [p.id, p]))

        if (productIds.length > 0) {
          const qtyByProduct = new Map<number, number>()
          for (const item of order.items) {
            qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.quantity)
          }
          const ids = Array.from(qtyByProduct.keys())
          const qtys = ids.map(id => qtyByProduct.get(id) || 0)
          // Atomic batched increment via CASE — avoids N round-trips
          await tx.$executeRawUnsafe(
            `UPDATE "Product" SET "stock" = "stock" + CASE "id" ${ids.map((_, i) => `WHEN ${ids[i]} THEN ${qtys[i]}`).join(' ')} END WHERE "id" IN (${ids.join(',')})`
          ).catch(() => {})

          const txnData = order.items
            .map(item => {
              const prev = productMap.get(item.productId)
              if (!prev) return null
              const qty = item.quantity
              return {
                productId: item.productId,
                productName: prev.name,
                type: 'ORDER_CANCELLED_RESTOCK' as const,
                quantity: qty,
                previousStock: prev.stock,
                newStock: prev.stock + qty,
                reason: cancelReason || `Order cancelled by admin ${adminUser.username}`,
                referenceId: orderId,
              }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
          if (txnData.length > 0) {
            await tx.inventoryTransaction.createMany({ data: txnData }).catch(() => {})
          }
        }

        if (order.customerId && order.status !== 'CANCELLED' && order.status !== 'REFUNDED') {
          await tx.customer.update({
            where: { id: order.customerId },
            data: {
              ordersCount: { decrement: 1 },
              totalSpent: { decrement: order.grandTotal },
            },
          })
        }

        if (order.payment && order.payment.status === 'PAID') {
          await tx.payment.update({
            where: { orderId },
            data: { status: 'REFUNDED' },
          })
        } else if (order.payment && order.payment.status === 'PENDING') {
          await tx.payment.update({
            where: { orderId },
            data: { status: 'FAILED' },
          })
        }

        if (cancelReason || status === 'CANCELLED') {
          updateData.refundReason = cancelReason || `Admin cancelled by ${adminUser.username}`
        }
      }

      if (status === 'REFUNDED') {
        if (order.payment && order.payment.status === 'PAID') {
          await tx.payment.update({
            where: { orderId },
            data: { status: 'REFUNDED' },
          })
        }
        if (refundReason) updateData.refundReason = refundReason
        if (refundAmount !== undefined) updateData.refundAmount = refundAmount
      }

      const orderUpd = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: { items: true, payment: true, customer: { select: SAFE_CUSTOMER_SELECT }, internalNotes: true },
      })

      const changeParts: string[] = [`${currentStatus} → ${status}`]
      if (trackingNumber) changeParts.push(`tracking: ${trackingNumber}`)
      if (courierPartner) changeParts.push(`courier: ${courierPartner}`)
      if (cancelReason) changeParts.push(`reason: ${cancelReason}`)
      if (refundReason) changeParts.push(`refund reason: ${refundReason}`)
      if (refundAmount !== undefined && refundAmount !== null) changeParts.push(`refund amount: ${refundAmount}`)
      if (cancelledNeedsRestock) changeParts.push('stock restored')

      await tx.internalNote.create({
        data: {
          orderId,
          text: `Admin ${adminUser.username} updated order: ${changeParts.join(', ')}`,
          adminId: String(adminUser.id),
          adminName: adminUser.username,
        },
      })

      return orderUpd
    }, { timeout: 15_000, maxWait: 15_000 })

    if (updated) {
      const updAny = updated as any
      const orderNum = updAny.orderNumber || ('orderNumber' in order ? (order as any).orderNumber : String(orderId))
      const custName = (updAny.customerName as string) || order.customerName
      const custEmail = (updAny.customerEmail as string) || order.customerEmail
      const grandTot = Number((updAny.grandTotal as number) ?? order.grandTotal)
      const trackNum = (status === 'SHIPPED' && trackingNumber) ? (trackingNumber === null ? undefined : trackingNumber) : undefined
      const courier = (status === 'SHIPPED' && courierPartner) ? (courierPartner === null ? undefined : courierPartner) : undefined

      const titleMap: Record<string, string> = {
        CONFIRMED: 'Order confirmed',
        PROCESSING: 'Order processing',
        SHIPPED: 'Order shipped',
        DELIVERED: 'Order delivered',
        CANCELLED: 'Order cancelled',
        REFUNDED: 'Order refunded',
      }
      const msgMap: Record<string, string> = {
        CONFIRMED: `Order ${orderNum} has been confirmed and is being prepared.`,
        PROCESSING: `Order ${orderNum} is now being processed.`,
        SHIPPED: `Order ${orderNum} has been shipped${trackNum ? ` — tracking: ${trackNum}` : ''}.`,
        DELIVERED: `Order ${orderNum} has been delivered successfully.`,
        CANCELLED: `Order ${orderNum} has been cancelled${cancelReason ? `: ${cancelReason}` : ''}.`,
        REFUNDED: `Order ${orderNum} refund has been processed${refundReason ? `: ${refundReason}` : ''}.`,
      }

      prisma.notification.create({
        data: {
          title: titleMap[status] || 'Order update',
          message: msgMap[status] || `Order ${orderNum} status updated to ${status}.`,
          orderId: orderId,
        }
      }).catch(() => {})

      sendCustomerOrderStatusEmail({
        to: custEmail,
        customerName: custName,
        orderNumber: orderNum,
        status,
        grandTotal: grandTot,
        trackingNumber: trackNum,
        courierPartner: courier,
      }).catch(err => console.error('[status] customer email failed', err))
    }

    return createResponse({ success: true, data: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
