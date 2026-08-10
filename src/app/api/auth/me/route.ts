import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentUser, decodeToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('himmat_sessionToken')?.value

    if (!token) {
      return createResponse({ success: false }, 401)
    }

    const payload = decodeToken(token)
    if (!payload) {
      return createResponse({ success: false }, 401)
    }

    if (payload.type === 'customer') {
      const customer = await prisma.customer.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          loyaltyPoints: true,
          tier: true,
          ordersCount: true,
          totalSpent: true,
          createdAt: true,
          updatedAt: true
        }
      })
      if (!customer) return createResponse({ success: false }, 401)
      return createResponse({ success: true, user: { ...customer, type: 'customer' as const } })
    }

    if (payload.type === 'admin') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      })
      if (!admin || !admin.isActive) return createResponse({ success: false }, 401)
      return createResponse({ success: true, user: { ...admin, type: 'admin' as const } })
    }

    return createResponse({ success: false }, 401)
  } catch (error) {
    return handleApiError(error)
  }
}
