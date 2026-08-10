import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

const CUSTOMER_SELECT = {
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

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return createErrorResponse('Unauthorized', 401)
    }

    const customers = await prisma.customer.findMany({
      select: {
        ...CUSTOMER_SELECT,
        orders: true
      },
      orderBy: { id: 'desc' }
    })
    return createResponse({ success: true, data: customers })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return createErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { passwordHash, ...rest } = body
    const customer = await prisma.customer.create({
      data: rest,
      select: {
        ...CUSTOMER_SELECT,
        orders: true
      }
    })
    return createResponse({ success: true, data: customer }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
