import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { ensureUniqueSlug } from '@/lib/slug'

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
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return createErrorResponse('Title is required', 400)
    }

    const safeData: Record<string, any> = { title: body.title.trim() }
    if (typeof body.teaType === 'string') safeData.teaType = body.teaType
    if (typeof body.description === 'string') safeData.description = body.description
    if (typeof body.waterTemp === 'string') safeData.waterTemp = body.waterTemp
    if (typeof body.steepingTime === 'string') safeData.steepingTime = body.steepingTime
    if (typeof body.leafQuantity === 'string') safeData.leafQuantity = body.leafQuantity
    if (typeof body.image === 'string') safeData.image = body.image
    if (typeof body.isActive === 'boolean') safeData.isActive = body.isActive
    if (typeof body.steps !== 'undefined' && body.steps !== null) safeData.steps = body.steps
    if (typeof body.ingredients !== 'undefined' && body.ingredients !== null) safeData.ingredients = body.ingredients

    const slugInput =
      typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : body.title
    safeData.slug = await ensureUniqueSlug(slugInput, async (c) => {
      const exists = await prisma.brewingGuide.findUnique({ where: { slug: c }, select: { id: true } })
      return !!exists
    })

    const guide = await prisma.brewingGuide.create({ data: safeData as any })
    return createResponse(guide, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
