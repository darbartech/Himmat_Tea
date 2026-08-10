import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin, getCurrentUser } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

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

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const admin = await getCurrentAdmin()
    const currentUser = await getCurrentUser()
    const { id } = await params
    const numericId = parseInt(id)

    if (!admin && (!currentUser || currentUser.type !== 'customer' || currentUser.id !== numericId)) {
      return createErrorResponse('Unauthorized', 401)
    }

    const customer = await prisma.customer.findUnique({
      where: { id: numericId },
      select: {
        ...CUSTOMER_SELECT,
        orders: true
      }
    })

    if (!customer) {
      return createErrorResponse('Customer not found', 404)
    }

    return createResponse({ success: true, data: customer })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const admin = await getCurrentAdmin()
    const currentUser = await getCurrentUser()
    const { id } = await params
    const numericId = parseInt(id)

    if (!admin && (!currentUser || currentUser.type !== 'customer' || currentUser.id !== numericId)) {
      return createErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const { passwordHash, ...data } = body

    const customer = await prisma.customer.update({
      where: { id: numericId },
      data,
      select: {
        ...CUSTOMER_SELECT,
        orders: true
      }
    })

    return createResponse({ success: true, data: customer })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return createErrorResponse('Unauthorized', 401)
    }

    const { id } = await params

    await prisma.customer.delete({
      where: { id: parseInt(id) }
    })

    return createResponse({ success: true, message: 'Customer deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
