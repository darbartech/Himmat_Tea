import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAdminView = searchParams.get('admin') === 'true'

    const where: any = {}
    if (!isAdminView) {
      where.isActive = true
    }

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: { order: 'asc' }
    })
    return createResponse(faqs)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }
    const body = await request.json()
    const faq = await prisma.fAQ.create({
      data: body
    })
    return createResponse(faq, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
