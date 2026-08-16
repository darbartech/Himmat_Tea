import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { ensureUniqueSlug } from '@/lib/slug'

interface Params {
  params: Promise<{ id: string }>
}

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

export async function GET(request: NextRequest, { params }: Params) {
  try {
<<<<<<< HEAD
=======
    const adminUser = await getCurrentAdmin();
    const isAdmin = !!adminUser;
>>>>>>> 82a9e5e369f08e2d34aad73619dcf89a4e6b59a4
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
    if (!isAdmin && !productLine.isActive) {
      return NextResponse.json({ error: 'Product line not found' }, { status: 404 })
    }

    const parsed = {
      ...productLine,
      categories: parseCategories(productLine.categories),
      products: productLine.products.map(p => ({
        ...p,
        variantOptions: p.variantOptions ? JSON.parse(p.variantOptions) : null,
      })),
    }

    return createResponse(parsed)
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
    if (adminUser.role !== 'superadmin') {
      return createErrorResponse('Only SuperAdmin can update product lines', 403);
    }
    const { id } = await params
    const parsedId = parseInt(id)
    if (isNaN(parsedId)) {
      return createErrorResponse('Invalid product line id', 400)
    }
    const body = await request.json()

<<<<<<< HEAD
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
=======
    const data: any = {}
    if (body.slug != null) data.slug = String(body.slug)
    if (body.name != null) data.name = String(body.name)
    if (body.description != null) data.description = String(body.description)
    if (body.heroHeadline !== undefined) data.heroHeadline = body.heroHeadline ? String(body.heroHeadline) : null
    if (body.heroImage !== undefined) data.heroImage = body.heroImage ? String(body.heroImage) : null
    if (body.color !== undefined) data.color = body.color ? String(body.color) : null
    if (body.categories !== undefined) {
      data.categories = Array.isArray(body.categories)
        ? JSON.stringify(body.categories)
        : JSON.stringify([])
    }
    if (body.ctaTitle !== undefined) data.ctaTitle = body.ctaTitle ? String(body.ctaTitle) : null
    if (body.ctaDescription !== undefined) data.ctaDescription = body.ctaDescription ? String(body.ctaDescription) : null
    if (body.ctaLinkText !== undefined) data.ctaLinkText = body.ctaLinkText ? String(body.ctaLinkText) : null
    if (body.ctaLink !== undefined) data.ctaLink = body.ctaLink ? String(body.ctaLink) : null
    if (body.isActive != null) data.isActive = Boolean(body.isActive)
    if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder)

    const productLine = await prisma.productLine.update({
      where: { id: parseInt(id) },
      data,
>>>>>>> 82a9e5e369f08e2d34aad73619dcf89a4e6b59a4
      include: { products: true },
    })

    const parsed = {
      ...productLine,
      categories: parseCategories(productLine.categories),
      products: productLine.products.map(p => ({
        ...p,
        variantOptions: p.variantOptions ? JSON.parse(p.variantOptions) : null,
      })),
    }

    return createResponse(parsed)
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
    if (adminUser.role !== 'superadmin') {
      return createErrorResponse('Only SuperAdmin can delete product lines', 403);
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

