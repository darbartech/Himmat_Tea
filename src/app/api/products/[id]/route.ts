import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'

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

function parseProductLine(pl: any) {
  if (!pl) return pl
  return {
    ...pl,
    categories: parseCategories(pl.categories),
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        productLine: true,
        productVariants: true,
        batches: true,
        reviews: true,
        collectionItems: { include: { collection: true } },
        inventoryTransactions: true
      }
    })
    
    if (!product) {
      return createErrorResponse('Product not found', 404)
    }
    
    // Parse JSON strings back to objects
    const parsedProduct = {
      ...product,
      variantOptions: product.variantOptions ? JSON.parse(product.variantOptions) : null,
      productLine: parseProductLine(product.productLine),
      productVariants: product.productVariants.map(variant => ({
        ...variant,
        variants: JSON.parse(variant.variants)
      }))
    }
    
    return createResponse(parsedProduct)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const data: any = {}
    if (body.productLineId !== undefined) data.productLineId = body.productLineId != null ? Number(body.productLineId) : null
    if (body.name != null) data.name = String(body.name)
    if (body.category != null) data.category = String(body.category)
    if (body.price != null) data.price = Number(body.price)
    if (body.stock != null) data.stock = Number(body.stock)
    if (body.status != null) data.status = String(body.status)
    if (body.description != null) data.description = String(body.description)
    if (body.imageUrl != null) data.imageUrl = String(body.imageUrl)
    if (body.sku !== undefined) data.sku = body.sku && body.sku !== "" ? String(body.sku) : null
    if (body.reorderPoint !== undefined) data.reorderPoint = body.reorderPoint && body.reorderPoint !== "" ? Number(body.reorderPoint) : null
    if (body.hasVariants != null) data.hasVariants = Boolean(body.hasVariants)
    if (body.variantOptions !== undefined) data.variantOptions = body.variantOptions ? JSON.stringify(body.variantOptions) : null
    if (body.isBestseller != null) data.isBestseller = Boolean(body.isBestseller)
    if (body.isActive != null) data.isActive = Boolean(body.isActive)
    if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder)
    
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data,
      include: {
        productLine: true,
        productVariants: true,
        batches: true,
        reviews: true,
        collectionItems: { include: { collection: true } },
        inventoryTransactions: true
      }
    })
    
    // Parse JSON strings back to objects
    const parsedProduct = {
      ...product,
      variantOptions: product.variantOptions ? JSON.parse(product.variantOptions) : null,
      productLine: parseProductLine(product.productLine),
      productVariants: product.productVariants.map(variant => ({
        ...variant,
        variants: JSON.parse(variant.variants)
      }))
    }
    
    return createResponse(parsedProduct)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    
    await prisma.product.delete({
      where: { id: parseInt(id) }
    })
    
    return createResponse({ message: 'Product deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
