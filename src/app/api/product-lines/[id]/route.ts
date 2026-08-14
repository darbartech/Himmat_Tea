import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

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
    const adminUser = await getCurrentAdmin();
    const isAdmin = !!adminUser;
    const { id } = await params
    const productLine = await prisma.productLine.findUnique({
      where: { id: parseInt(id) },
      include: { products: true },
    })
    if (!productLine) {
      return NextResponse.json({ error: 'Product line not found' }, { status: 404 })
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
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    if (adminUser.role !== 'superadmin') {
      return createErrorResponse('Only SuperAdmin can update product lines', 403);
    }
    const { id } = await params
    const body = await request.json()

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
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    if (adminUser.role !== 'superadmin') {
      return createErrorResponse('Only SuperAdmin can delete product lines', 403);
    }
    const { id } = await params
    await prisma.productLine.delete({
      where: { id: parseInt(id) },
    })
    return createResponse({ message: 'Product line deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}

