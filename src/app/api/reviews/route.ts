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
    const reviews = await prisma.review.findMany({
      include: { product: true, customer: true },
      orderBy: { id: 'desc' }
    })
    return createResponse(reviews)
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
    const review = await prisma.review.create({
      data: body,
      include: { product: true, customer: true }
    })
    return createResponse(review, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
