import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError, SAFE_CUSTOMER_SELECT } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }
    const [
      totalOrders, 
      totalProducts, 
      totalCustomers, 
      totalRevenue, 
      recentOrders, 
      topProducts
    ] = await Promise.all([
      prisma.order.count(),
      prisma.product.count(),
      prisma.customer.count(),
      prisma.order.aggregate({
        _sum: {
          grandTotal: true
        }
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { orderDate: 'desc' },
        include: { customer: { select: SAFE_CUSTOMER_SELECT } }
      }),
      prisma.product.findMany({
        take: 5,
        orderBy: { stock: 'asc' }
      })
    ])

    return createResponse({
      totalOrders,
      totalProducts,
      totalCustomers,
      totalRevenue: totalRevenue._sum.grandTotal || 0,
      recentOrders,
      topProducts
    })
  } catch (error) {
    return handleApiError(error)
  }
}
