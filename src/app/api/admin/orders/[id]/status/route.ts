import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError, SAFE_CUSTOMER_SELECT } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { z } from 'zod'

interface Params {
  params: Promise<{ id: string }>
}

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  AWAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
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

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id: orderId } = await params
    const adminUser = await getCurrentAdmin()

    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }

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

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: any = { status }
      if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
      if (courierPartner !== undefined) updateData.courierPartner = courierPartner

      const cancelledNeedsRestock =
        status === 'CANCELLED' &&
        (currentStatus === 'AWAITING_PAYMENT' || currentStatus === 'CONFIRMED' || currentStatus === 'PROCESSING')

      if (cancelledNeedsRestock) {
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
                reason: cancelReason || `Order cancelled by admin ${adminUser.username}`,
                referenceId: orderId,
              },
            })
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
    })

    return createResponse({ success: true, data: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
