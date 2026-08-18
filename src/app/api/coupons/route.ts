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
    const { searchParams } = new URL(request.url)
    const isPublic = searchParams.get('public') === 'true'
    const validateCode = searchParams.get('validate') || searchParams.get('code')
    const subtotalRaw = searchParams.get('subtotal')

    // --- Public coupon validation endpoint: ?code=XYZ&subtotal=N ---
    if (validateCode) {
      const subtotal = subtotalRaw ? Number(subtotalRaw) : 0
      const now = new Date()
      const nowISO = now.toISOString()

      const coupon = await prisma.coupon.findUnique({
        where: { code: validateCode },
      })

      if (!coupon || !coupon.isActive) {
        return createResponse(
          { valid: false, error: 'Coupon code is invalid or no longer active.' },
          200
        )
      }

      try {
        const validFrom = new Date(coupon.validFrom)
        const validTo = new Date(coupon.validTo)
        // Tolerant parse: if date strings stored without timezone, compare as
        // date-only (day granularity) to avoid TZ surprises.
        const startOk = isNaN(validFrom.getTime()) || validFrom.getTime() <= now.getTime()
        const endOk = isNaN(validTo.getTime()) || validTo.getTime() + 24 * 60 * 60 * 1000 >= now.getTime()
        if (!startOk || !endOk) {
          return createResponse(
            { valid: false, error: 'This coupon has expired or is not yet valid.' },
            200
          )
        }
      } catch {
        // Invalid date format — treat as expired
        return createResponse(
          { valid: false, error: 'This coupon has expired or is not yet valid.' },
          200
        )
      }

      if (coupon.usedCount >= coupon.usageLimit) {
        return createResponse(
          { valid: false, error: 'This coupon has reached its usage limit.' },
          200
        )
      }

      if (Number.isFinite(subtotal) && subtotal > 0 && coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
        return createResponse(
          {
            valid: false,
            error: `Minimum order amount of ${coupon.minOrderAmount.toFixed(2)} required for this coupon.`,
            minOrderAmount: coupon.minOrderAmount,
          },
          200
        )
      }

      // --- Calculate discount server-side (never trust client math) ---
      let discountAmount = 0
      const dt = String(coupon.discountType).toLowerCase()
      if (dt === 'percent' || dt === 'percentage') {
        discountAmount = Number.isFinite(subtotal) && subtotal > 0
          ? Math.max(0, Math.round((subtotal * coupon.discountValue) / 100))
          : 0
        if (coupon.maxDiscount > 0 && discountAmount > coupon.maxDiscount) {
          discountAmount = Math.round(coupon.maxDiscount)
        }
      } else {
        discountAmount = Math.round(Math.max(0, coupon.discountValue))
      }
      if (Number.isFinite(subtotal) && discountAmount > subtotal) {
        discountAmount = Math.max(0, Math.round(subtotal))
      }

      return createResponse({
        valid: true,
        data: {
          id: coupon.id,
          code: coupon.code,
          discountType: dt === 'percentage' ? 'percent' : (dt as 'percent' | 'fixed'),
          discountValue: coupon.discountValue,
          minOrderAmount: coupon.minOrderAmount,
          maxDiscount: coupon.maxDiscount,
          discountAmount,
        },
      }, 200)
    }

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
