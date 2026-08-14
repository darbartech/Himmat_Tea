import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { ensureUniqueSlug } from '@/lib/slug'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAdminView = searchParams.get('admin') === 'true'
    const adminUser = isAdminView ? await getCurrentAdmin() : null

    const where: any = {}
    if (!adminUser) {
      where.isActive = true
    }

    const include: any = isAdminView ? { products: true } : undefined
    const productLines = await prisma.productLine.findMany({
      where,
      include,
      orderBy: { sortOrder: 'asc' },
    })
    return createResponse(productLines)
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
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return createErrorResponse('Name is required', 400)
    }

    const safeData: Record<string, any> = { name: body.name.trim() }
    if (typeof body.description === 'string') safeData.description = body.description
    if (typeof body.heroHeadline === 'string') safeData.heroHeadline = body.heroHeadline
    if (typeof body.heroImage === 'string') safeData.heroImage = body.heroImage
    if (typeof body.color === 'string') safeData.color = body.color
    if (typeof body.ctaTitle === 'string') safeData.ctaTitle = body.ctaTitle
    if (typeof body.ctaDescription === 'string') safeData.ctaDescription = body.ctaDescription
    if (typeof body.ctaLinkText === 'string') safeData.ctaLinkText = body.ctaLinkText
    if (typeof body.ctaLink === 'string') safeData.ctaLink = body.ctaLink
    if (typeof body.isActive === 'boolean') safeData.isActive = body.isActive
    if (typeof body.sortOrder === 'number' && !isNaN(body.sortOrder)) safeData.sortOrder = body.sortOrder
    if (typeof body.categories !== 'undefined' && body.categories !== null) {
      safeData.categories = body.categories
    }

    const slugInput =
      typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : body.name
    safeData.slug = await ensureUniqueSlug(slugInput, async (c) => {
      const exists = await prisma.productLine.findUnique({ where: { slug: c }, select: { id: true } })
      return !!exists
    })

    const productLine = await prisma.productLine.create({
      data: safeData as any,
      include: { products: true },
    })
    return createResponse(productLine, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

