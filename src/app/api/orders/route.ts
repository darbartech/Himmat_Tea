import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return createErrorResponse('Unauthorized', 401)
    }

    let orders
    if ('username' in currentUser) {
      // Admin user - get all orders
      orders = await prisma.order.findMany({
        include: {
          customer: true,
          items: true
        },
        orderBy: { orderDate: 'desc' }
      })
    } else {
      // Customer user - get only their orders
      orders = await prisma.order.findMany({
        where: { customerId: currentUser.id },
        include: {
          items: true
        },
        orderBy: { orderDate: 'desc' }
      })
    }

    return createResponse({ success: true, data: orders })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    const body = await request.json()
    const { items, ...orderData } = body
    
    // Validate all productIds exist in the database
    const productIds = items.map((item: any) => item.productId)
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true }
    })
    const existingProductIds = new Set(existingProducts.map(p => p.id))
    
    const invalidProductIds = productIds.filter((id: number) => !existingProductIds.has(id))
    if (invalidProductIds.length > 0) {
      return createErrorResponse(`Invalid product IDs: ${invalidProductIds.join(', ')}`, 400)
    }
    
    let customerId = orderData.customerId
    if (!customerId && currentUser && !('username' in currentUser)) {
      customerId = currentUser.id
    }
    
    const order = await prisma.order.create({
      data: {
        ...orderData,
        customerId: customerId || 1,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            name: item.productName || item.name,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: {
        customer: true,
        items: true
      }
    })
    
    // Update customer stats
    if (order.customerId) {
      await prisma.customer.update({
        where: { id: order.customerId },
        data: {
          ordersCount: { increment: 1 },
          totalSpent: { increment: order.grandTotal }
        }
      })
    }
    
    return createResponse({ success: true, data: order }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
