import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { ensureUniqueSlug } from '@/lib/slug'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const isAdminView = searchParams.get('admin') === 'true'
    const adminUser = isAdminView ? await getCurrentAdmin() : null

    const where: any = {}
    const parsed = parseInt(id)
    if (!isNaN(parsed)) {
      where.id = parsed
    } else {
      where.slug = id
    }

    const productLine = await prisma.productLine.findFirst({
      where,
      include: { products: true },
    })
    if (!productLine) {
      return createErrorResponse('Product line not found', 404)
    }
    if (!adminUser && !productLine.isActive) {
      return createErrorResponse('Product line not found', 404)
    }
    return createResponse(productLine)
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
    const parsedId = parseInt(id)
    if (isNaN(parsedId)) {
      return createErrorResponse('Invalid product line id', 400)
    }
    const body = await request.json()

    const existing = await prisma.productLine.findUnique({ where: { id: parsedId } })
    if (!existing) {
      return createErrorResponse('Product line not found', 404)
    }

    const safeData: Record<string, any> = {}
    if (typeof body.name === 'string' && body.name.trim()) safeData.name = body.name.trim()
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

    if (typeof body.slug === 'string' || typeof safeData.name === 'string') {
      const slugInput =
        typeof body.slug === 'string' && body.slug.trim()
          ? body.slug.trim()
          : (safeData.name || existing.name)
      const candidate = slugInput === existing.slug ? existing.slug : await ensureUniqueSlug(slugInput, async (c) => {
        const taken = await prisma.productLine.findUnique({ where: { slug: c }, select: { id: true } })
        return !!taken && taken.id !== parsedId
      })
      safeData.slug = candidate
    }

    const productLine = await prisma.productLine.update({
      where: { id: parsedId },
      data: safeData,
      include: { products: true },
    })
    return createResponse(productLine)
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
    const parsedId = parseInt(id)
    if (isNaN(parsedId)) {
      return createErrorResponse('Invalid product line id', 400)
    }
    const existing = await prisma.productLine.findUnique({ where: { id: parsedId } })
    if (!existing) {
      return createErrorResponse('Product line not found', 404)
    }
    await prisma.productLine.delete({ where: { id: parsedId } })
    return createResponse({ message: 'Product line deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}

