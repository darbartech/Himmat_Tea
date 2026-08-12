import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { z } from 'zod'

const couponSchema = z.object({
  code: z.string().min(2, 'Coupon code must be at least 2 characters'),
  discountType: z.enum(['percent', 'fixed', 'percentage']),
  discountValue: z.number().min(0, 'Discount value must be non-negative'),
  minOrderAmount: z.number().min(0, 'Min order amount must be non-negative').default(0),
  maxDiscount: z.number().min(0, 'Max discount must be non-negative').default(0),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().min(1, 'Valid to date is required'),
  usageLimit: z.number().int().min(1, 'Usage limit must be at least 1').default(1),
  usedCount: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
})

const couponUpdateSchema = couponSchema.partial()

function normalizeDiscountType(type: string): 'percent' | 'fixed' {
  if (type === 'percentage') return 'percent'
  return type as 'percent' | 'fixed'
}

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin()
    const isPublic = request.nextUrl.searchParams.get('public') === 'true'

    if (isPublic) {
      const activeCoupons = await prisma.coupon.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          discountType: true,
          discountValue: true,
          minOrderAmount: true,
          maxDiscount: true,
          validFrom: true,
          validTo: true,
        },
        orderBy: { createdAt: 'desc' }
      })
      return createResponse({ success: true, data: activeCoupons })
    }

    if (!adminUser) {
      return createErrorResponse('Unauthorized', 401)
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return createResponse({ success: true, data: coupons })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized', 401)
    }

    const body = await request.json()
    const normalized = { ...body, discountType: normalizeDiscountType(body.discountType) }
    const parsed = couponSchema.safeParse(normalized)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      const field = firstError.path.join('.') || 'request'
      return createErrorResponse(`${field}: ${firstError.message}`, 400)
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: parsed.data.code }
    })
    if (existing) {
      return createErrorResponse(`Coupon code "${parsed.data.code}" already exists`, 409)
    }

    const coupon = await prisma.coupon.create({
      data: parsed.data
    })
    return createResponse({ success: true, data: coupon }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return createErrorResponse('Coupon id is required', 400)
    }

    const body = await request.json()
    const normalized = body.discountType
      ? { ...body, discountType: normalizeDiscountType(body.discountType) }
      : body
    const parsed = couponUpdateSchema.safeParse(normalized)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      const field = firstError.path.join('.') || 'request'
      return createErrorResponse(`${field}: ${firstError.message}`, 400)
    }

    const existing = await prisma.coupon.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('Coupon not found', 404)
    }

    if (parsed.data.code && parsed.data.code !== existing.code) {
      const codeExists = await prisma.coupon.findUnique({ where: { code: parsed.data.code } })
      if (codeExists) {
        return createErrorResponse(`Coupon code "${parsed.data.code}" already exists`, 409)
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: parsed.data
    })
    return createResponse({ success: true, data: coupon })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return createErrorResponse('Coupon id is required', 400)
    }

    const existing = await prisma.coupon.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('Coupon not found', 404)
    }

    await prisma.coupon.delete({ where: { id } })
    return createResponse({ success: true, message: 'Coupon deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
