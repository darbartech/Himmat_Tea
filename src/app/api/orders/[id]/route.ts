import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError, SAFE_CUSTOMER_SELECT } from '@/lib/api-utils'
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth'
import { z } from 'zod'

interface Params {
  params: Promise<{ id: string }>
}

const customerOrderUpdateSchema = z.object({
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().min(1).optional(),
  shippingAddress: z.string().min(1).optional(),
}).strict()

async function resolveOrderByIdentifier(idOrOrderNumber: string) {
  let order = await prisma.order.findUnique({
    where: { id: idOrOrderNumber },
  })
  if (!order) {
    order = await prisma.order.findUnique({
      where: { orderNumber: idOrOrderNumber },
    })
  }
  return order
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return createErrorResponse('Please sign in to view this order.', 401)
    }

    const isAdmin = 'username' in currentUser

    const resolved = await resolveOrderByIdentifier(id)
    if (!resolved) {
      return createErrorResponse('This order could not be found.', 404)
    }

    const order = await prisma.order.findUnique({
      where: { id: resolved.id },
      include: {
        customer: { select: SAFE_CUSTOMER_SELECT },
        items: true,
        internalNotes: isAdmin,
        payment: true,
      }
    })

    if (!order) {
      return createErrorResponse('This order could not be found.', 404)
    }

    const isOwner = !isAdmin && order.customerId === currentUser.id

    if (!isOwner && !isAdmin) {
      return createErrorResponse('This order could not be found.', 404)
    }

    const responseOrder = isAdmin
      ? order
      : {
          id: order.id,
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          shippingAddress: order.shippingAddress,
          total: order.total,
          shippingCost: order.shippingCost,
          tax: order.tax,
          grandTotal: order.grandTotal,
          status: order.status,
          orderDate: order.orderDate,
          trackingNumber: order.trackingNumber,
          courierPartner: order.courierPartner,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.items,
          payment: order.payment ? {
            method: order.payment.method,
            status: order.payment.status,
            amount: order.payment.amount,
            transactionReference: order.payment.transactionReference,
          } : null,
        }

    return createResponse({ success: true, data: responseOrder })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return createErrorResponse('Unauthorized', 401)
    }

    const isAdmin = 'username' in currentUser

    if (!isAdmin) {
      return createErrorResponse('Forbidden - customers may not update orders via this endpoint.', 403)
    }

    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Forbidden', 403)
    }

    const resolved = await resolveOrderByIdentifier(id)
    if (!resolved) {
      return createErrorResponse('Order not found', 404)
    }
    const orderId = resolved.id

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: SAFE_CUSTOMER_SELECT } }
    })

    if (!order) {
      return createErrorResponse('Order not found', 404)
    }

    const body = await request.json()
    const validated = customerOrderUpdateSchema.safeParse(body)
    if (!validated.success) {
      const firstError = validated.error.issues[0]
      return createErrorResponse(
        `Invalid field: ${firstError.path.join('.')} - ${firstError.message}. Use the admin PATCH endpoints for status/payment changes.`,
        400
      )
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: validated.data,
      include: {
        customer: { select: SAFE_CUSTOMER_SELECT },
        items: true,
        internalNotes: true,
        payment: true,
      }
    })

    await prisma.internalNote.create({
      data: {
        orderId,
        text: `Admin ${adminUser.username} updated contact/shipping details`,
        adminId: String(adminUser.id),
        adminName: adminUser.username,
      }
    })

    return createResponse({ success: true, data: updatedOrder })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return createErrorResponse('Unauthorized', 401)
    }

    const isAdmin = 'username' in currentUser
    if (!isAdmin) {
      return createErrorResponse('Forbidden', 403)
    }

    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Forbidden', 403)
    }

    const resolved = await resolveOrderByIdentifier(id)
    const resolvedId = resolved?.id || id

    return createErrorResponse(
      'Hard delete is disabled. Use PATCH /api/admin/orders/' + resolvedId + '/status with status "CANCELLED" to preserve audit history.',
      405
    )
  } catch (error) {
    return handleApiError(error)
  }
}
