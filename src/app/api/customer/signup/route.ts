import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { setAuthCookie, passwordSchema } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

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

const signupServerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(5, 'Address must be at least 5 characters').max(500)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, password, address } = body

    const parsed = signupServerSchema.safeParse({ name, email, password, phone, address })
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0].message, 400)
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email }
    })

    if (existingCustomer) {
      return createErrorResponse('Email already exists', 400)
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        passwordHash,
        tier: 'Bronze',
        loyaltyPoints: 0,
        ordersCount: 0,
        totalSpent: 0
      },
      select: CUSTOMER_USER_SELECT
    })

    await setAuthCookie({
      id: customer.id,
      email: customer.email,
      type: 'customer'
    })

    return createResponse({
      success: true,
      user: customer
    })
  } catch (error) {
    return handleApiError(error)
  }
}
