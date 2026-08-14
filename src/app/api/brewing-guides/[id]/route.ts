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
    const guide = await prisma.brewingGuide.findUnique({
      where: { id },
    })
    if (!guide) {
      return createErrorResponse('Brewing guide not found', 404)
    }
    return createResponse(guide)
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

    const existing = await prisma.brewingGuide.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('Brewing guide not found', 404)
    }

    const safeData: Record<string, any> = {}
    if (typeof body.title === 'string') safeData.title = body.title
    if (typeof body.slug === 'string') safeData.slug = body.slug
    if (typeof body.teaType === 'string') safeData.teaType = body.teaType
    if (typeof body.description === 'string') safeData.description = body.description
    if (typeof body.waterTemp === 'string') safeData.waterTemp = body.waterTemp
    if (typeof body.steepingTime === 'string') safeData.steepingTime = body.steepingTime
    if (typeof body.leafQuantity === 'string') safeData.leafQuantity = body.leafQuantity
    if (typeof body.image === 'string') safeData.image = body.image
    if (typeof body.isActive === 'boolean') safeData.isActive = body.isActive

    if (safeData.slug && safeData.slug !== existing.slug) {
      const slugExists = await prisma.brewingGuide.findUnique({ where: { slug: safeData.slug } })
      if (slugExists) {
        return createErrorResponse(`Slug "${safeData.slug}" already exists`, 409)
      }
    }

    const guide = await prisma.brewingGuide.update({
      where: { id },
      data: safeData,
    })
    return createResponse(guide)
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

    const existing = await prisma.brewingGuide.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('Brewing guide not found', 404)
    }

    await prisma.brewingGuide.delete({ where: { id } })
    return createResponse({ message: 'Brewing guide deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
