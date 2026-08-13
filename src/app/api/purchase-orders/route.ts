import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { id: 'desc' }
    })
    return createResponse(purchaseOrders)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const body = await request.json()
    const { items, ...poData } = body

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        ...poData,
        items: items
          ? {
              create: items.map((item: any) => {
                const { id: _id, purchaseOrderId, product, ...rest } = item
                return rest
              }),
            }
          : undefined,
      },
      include: { items: { include: { product: true } } }
    })
    return createResponse(purchaseOrder, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
