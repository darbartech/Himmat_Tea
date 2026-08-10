import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { setAuthCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const CUSTOMER_USER_SELECT = {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    const customer = await prisma.customer.findUnique({
      where: { email }
    })

    if (!customer) {
      return createErrorResponse('Invalid credentials', 401)
    }

    let passwordMatch = false
    try {
      passwordMatch = await bcrypt.compare(password, customer.passwordHash ?? '')
    } catch {
      return createErrorResponse('Invalid credentials', 401)
    }

    if (!passwordMatch) {
      return createErrorResponse('Invalid credentials', 401)
    }

    await setAuthCookie({
      id: customer.id,
      email: customer.email,
      type: 'customer'
    })

    const user = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: CUSTOMER_USER_SELECT
    })

    return createResponse({
      user,
      success: true
    })
  } catch (error) {
    return handleApiError(error)
  }
}
