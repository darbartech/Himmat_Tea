import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError, SAFE_CUSTOMER_SELECT } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { sendCustomerPaymentApprovedEmail, sendCustomerPaymentRejectedEmail } from '@/lib/email'
import { z } from 'zod'

interface Params {
  params: Promise<{ id: string }>
}

const paymentDecisionSchema = z.object({
  decision: z.enum(['PAID', 'FAILED']),
  transactionReference: z.string().optional(),
  rejectReason: z.string().max(500).optional(),
}).strict()

const ALLOWED_PAYMENT_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PAID', 'FAILED'],
  PAID: ['REFUNDED'],
  FAILED: [],
  REFUNDED: [],
}

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
    const parsed = paymentDecisionSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return createErrorResponse(
        `Invalid field: ${firstError.path.join('.')} - ${firstError.message}`,
        400
      )
    }

    const { decision, transactionReference, rejectReason } = parsed.data

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

    if (!order.payment) {
      return createErrorResponse('Payment record not found for this order', 400)
    }

    const currentPaymentStatus = order.payment.status
    const allowed = ALLOWED_PAYMENT_TRANSITIONS[currentPaymentStatus] || []

    if (!allowed.includes(decision)) {
      return createErrorResponse(
        `Invalid payment transition: ${currentPaymentStatus} → ${decision}`,
        409
      )
    }

    const now = new Date()

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let newOrderStatus = order.status

      if (decision === 'PAID') {
        if (order.status === 'AWAITING_PAYMENT') {
          newOrderStatus = 'CONFIRMED'
        }

        const payment = await tx.payment.update({
          where: { orderId },
          data: {
            status: 'PAID',
            paidAt: now,
            verifiedAt: now,
            verifiedByAdminId: adminUser.id,
            transactionReference: transactionReference || undefined,
          },
        })

        const orderUpd = await tx.order.update({
          where: { id: orderId },
          data: {
            status: newOrderStatus,
          },
          include: { items: true, payment: true, customer: { select: SAFE_CUSTOMER_SELECT }, internalNotes: true },
        })

        await tx.internalNote.create({
          data: {
            orderId,
            text: `Admin ${adminUser.username} verified payment (MANUAL_QR → PAID). Order status: ${order.status} → ${newOrderStatus}.${transactionReference ? ` Reference: ${transactionReference}` : ''}`,
            adminId: String(adminUser.id),
            adminName: adminUser.username,
          },
        })

        return { ...orderUpd, payment }
      }

      if (decision === 'FAILED') {
        if (order.status === 'AWAITING_PAYMENT' || order.status === 'CONFIRMED') {
          newOrderStatus = 'CANCELLED'
        }

        const payment = await tx.payment.update({
          where: { orderId },
          data: {
            status: 'FAILED',
            verifiedAt: now,
            verifiedByAdminId: adminUser.id,
            transactionReference: transactionReference || undefined,
          },
        })

        const productIds = order.items.map(i => i.productId)
        const productsBefore = productIds.length > 0
          ? await tx.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, stock: true, name: true },
            })
          : []
        const productMap = new Map(productsBefore.map(p => [p.id, p]))

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

          // Restored stock (for the inventory-transaction records) = before + qty
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
                reason: `Payment rejected by admin ${adminUser.username} - stock restored`,
                referenceId: orderId,
              }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
          if (txnData.length > 0) {
            await tx.inventoryTransaction.createMany({ data: txnData }).catch(() => {})
          }
        }

        const orderUpd = await tx.order.update({
          where: { id: orderId },
          data: {
            status: newOrderStatus,
          },
          include: { items: true, payment: true, customer: { select: SAFE_CUSTOMER_SELECT }, internalNotes: true },
        })

        if (order.customerId) {
          await tx.customer.update({
            where: { id: order.customerId },
            data: {
              ordersCount: { decrement: 1 },
              totalSpent: { decrement: order.grandTotal },
            },
          })
        }

        await tx.internalNote.create({
          data: {
            orderId,
            text: `Admin ${adminUser.username} rejected payment (→ FAILED). Order status: ${order.status} → ${newOrderStatus}. Stock restored.${transactionReference ? ` Reference: ${transactionReference}` : ''}${rejectReason ? ` Reason: ${rejectReason}` : ''}`,
            adminId: String(adminUser.id),
            adminName: adminUser.username,
          },
        })

        return { ...orderUpd, payment }
      }

      throw new Error('Unhandled decision')
    }, { timeout: 120_000, maxWait: 30_000 })

    if (decision === 'PAID' && updated) {
      const updAny = updated as any
      const orderNum = updAny.orderNumber || ('orderNumber' in order ? (order as any).orderNumber : String(orderId))
      const custName = (updAny.customerName as string) || order.customerName
      const custEmail = (updAny.customerEmail as string) || order.customerEmail
      const grandTot = Number((updAny.grandTotal as number) ?? order.grandTotal)

      sendCustomerPaymentApprovedEmail({
        to: custEmail,
        customerName: custName,
        orderNumber: orderNum,
        grandTotal: grandTot,
      }).catch(err => console.error('[payment] customer email failed', err))

      prisma.notification.create({
        data: {
          title: 'Payment verified',
          message: `Payment confirmed for order ${orderNum}.`,
          orderId: orderId,
        }
      }).catch(() => {})
    }

    if (decision === 'FAILED' && updated) {
      const updAny = updated as any
      const orderNum = updAny.orderNumber || ('orderNumber' in order ? (order as any).orderNumber : String(orderId))
      const custName = (updAny.customerName as string) || order.customerName
      const custEmail = (updAny.customerEmail as string) || order.customerEmail
      const grandTot = Number((updAny.grandTotal as number) ?? order.grandTotal)

      sendCustomerPaymentRejectedEmail({
        to: custEmail,
        customerName: custName,
        orderNumber: orderNum,
        grandTotal: grandTot,
        reason: rejectReason,
      }).catch(err => console.error('[payment] customer reject email failed', err))

      prisma.notification.create({
        data: {
          title: 'Payment not verified',
          message: rejectReason
            ? `Payment for order ${orderNum} was rejected. ${rejectReason}`
            : `Payment for order ${orderNum} was rejected. The order has been cancelled.`,
          orderId: orderId,
        }
      }).catch(() => {})
    }

    return createResponse({ success: true, data: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
