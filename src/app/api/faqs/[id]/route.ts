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
    const faq = await prisma.fAQ.findUnique({
      where: { id },
    })
    if (!faq) {
      return createErrorResponse('FAQ not found', 404)
    }
    return createResponse(faq)
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

    const existing = await prisma.fAQ.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('FAQ not found', 404)
    }

    const safeData: Record<string, any> = {}
    if (typeof body.question === 'string') safeData.question = body.question
    if (typeof body.answer === 'string') safeData.answer = body.answer
    if (typeof body.category === 'string') safeData.category = body.category
    if (typeof body.isActive === 'boolean') safeData.isActive = body.isActive
    if (typeof body.order === 'number') safeData.order = body.order

    const faq = await prisma.fAQ.update({
      where: { id },
      data: safeData,
    })
    return createResponse(faq)
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

    const existing = await prisma.fAQ.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('FAQ not found', 404)
    }

    await prisma.fAQ.delete({ where: { id } })
    return createResponse({ message: 'FAQ deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
