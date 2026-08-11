import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError, SAFE_CUSTOMER_SELECT } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { z } from 'zod'

interface Params {
  params: Promise<{ id: string }>
}

const paymentDecisionSchema = z.object({
  decision: z.enum(['PAID', 'FAILED']),
  transactionReference: z.string().optional(),
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

    const { decision, transactionReference } = parsed.data

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

    const updated = await prisma.$transaction(async (tx) => {
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

        for (const item of order.items) {
          const prev = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, name: true },
          })
          if (prev) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
            await tx.inventoryTransaction.create({
              data: {
                productId: item.productId,
                productName: prev.name,
                type: 'ORDER_CANCELLED_RESTOCK',
                quantity: item.quantity,
                previousStock: prev.stock,
                newStock: prev.stock + item.quantity,
                reason: `Payment rejected by admin ${adminUser.username} - stock restored`,
                referenceId: orderId,
              },
            })
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
            text: `Admin ${adminUser.username} rejected payment (→ FAILED). Order status: ${order.status} → ${newOrderStatus}. Stock restored.${transactionReference ? ` Reference: ${transactionReference}` : ''}`,
            adminId: String(adminUser.id),
            adminName: adminUser.username,
          },
        })

        return { ...orderUpd, payment }
      }

      throw new Error('Unhandled decision')
    })

    return createResponse({ success: true, data: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
