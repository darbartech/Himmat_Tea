import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) },
      include: { product: true, customer: true },
    })
    if (!review) {
      return createErrorResponse('Review not found', 404)
    }
    return createResponse(review)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }
    const { id } = await params
    const body = await request.json()

    const safeData: Record<string, any> = {}
    if (typeof body.rating === 'number') safeData.rating = body.rating
    if (typeof body.title === 'string') safeData.title = body.title
    if (typeof body.comment === 'string') safeData.comment = body.comment
    if (typeof body.approved === 'boolean') safeData.approved = body.approved
    if (typeof body.status === 'string') safeData.status = body.status

    const review = await prisma.review.update({
      where: { id: parseInt(id) },
      data: safeData,
      include: { product: true, customer: true },
    })
    return createResponse(review)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }
    const { id } = await params
    await prisma.review.delete({
      where: { id: parseInt(id) },
    })
    return createResponse({ message: 'Review deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
