import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { ensureUniqueSlug } from '@/lib/slug'

<<<<<<< HEAD
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
=======
function parseCategories(raw: string | null | undefined): any[] | null {
  if (!raw) return null
  if (raw === '{}') return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') return []
    return []
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const adminUser = await getCurrentAdmin();
    const isAdmin = !!adminUser;
    const where = isAdmin ? {} : { isActive: true };
    const productWhere = isAdmin ? {} : { isActive: true };
    const productLines = await prisma.productLine.findMany({
      where,
      include: {
        products: { where: productWhere },
      },
>>>>>>> 82a9e5e369f08e2d34aad73619dcf89a4e6b59a4
      orderBy: { sortOrder: 'asc' },
    })

    const parsedLines = productLines.map(pl => ({
      ...pl,
      categories: parseCategories(pl.categories),
      products: pl.products.map(p => ({
        ...p,
        variantOptions: p.variantOptions ? JSON.parse(p.variantOptions) : null,
      })),
    }))

    return createResponse(parsedLines)
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
    if (adminUser.role !== 'superadmin') {
      return createErrorResponse('Only SuperAdmin can create product lines', 403);
    }
    const body = await request.json()
<<<<<<< HEAD
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
=======

    const data: any = {}
    if (body.slug != null) data.slug = String(body.slug)
    if (body.name != null) data.name = String(body.name)
    if (body.description != null) data.description = String(body.description)
    if (body.heroHeadline != null) data.heroHeadline = body.heroHeadline ? String(body.heroHeadline) : null
    if (body.heroImage != null) data.heroImage = body.heroImage ? String(body.heroImage) : null
    if (body.color != null) data.color = body.color ? String(body.color) : null
    if (body.categories != null) {
      data.categories = Array.isArray(body.categories)
        ? JSON.stringify(body.categories)
        : JSON.stringify([])
    }
    if (body.ctaTitle != null) data.ctaTitle = body.ctaTitle ? String(body.ctaTitle) : null
    if (body.ctaDescription != null) data.ctaDescription = body.ctaDescription ? String(body.ctaDescription) : null
    if (body.ctaLinkText != null) data.ctaLinkText = body.ctaLinkText ? String(body.ctaLinkText) : null
    if (body.ctaLink != null) data.ctaLink = body.ctaLink ? String(body.ctaLink) : null
    if (body.isActive != null) data.isActive = Boolean(body.isActive)
    if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder)

    const productLine = await prisma.productLine.create({
      data,
      include: {
        products: true,
      },
>>>>>>> 82a9e5e369f08e2d34aad73619dcf89a4e6b59a4
    })

    const parsed = {
      ...productLine,
      categories: parseCategories(productLine.categories),
      products: productLine.products.map(p => ({
        ...p,
        variantOptions: p.variantOptions ? JSON.parse(p.variantOptions) : null,
      })),
    }

    return createResponse(parsed, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

