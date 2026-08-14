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

    const guides = await prisma.brewingGuide.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    return createResponse(guides)
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
    const guide = await prisma.brewingGuide.create({
      data: body
    })
    return createResponse(guide, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
