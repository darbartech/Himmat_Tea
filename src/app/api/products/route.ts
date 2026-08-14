import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, handleApiError } from '@/lib/api-utils'

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

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        productLine: true,
        productVariants: true,
        batches: true,
        reviews: true,
        collectionItems: { include: { collection: true } },
        inventoryTransactions: true
      },
      orderBy: { id: 'desc' }
    })
    
    // Parse JSON strings back to objects
    const parsedProducts = products.map(product => ({
      ...product,
      variantOptions: product.variantOptions ? JSON.parse(product.variantOptions) : null,
      productLine: parseProductLine(product.productLine),
      productVariants: product.productVariants.map(variant => ({
        ...variant,
        variants: JSON.parse(variant.variants)
      }))
    }))
    
    return createResponse(parsedProducts)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const data: any = {}
    if (body.productLineId != null) data.productLineId = Number(body.productLineId)
    if (body.name != null) data.name = String(body.name)
    if (body.category != null) data.category = String(body.category)
    if (body.price != null) data.price = Number(body.price)
    if (body.stock != null) data.stock = Number(body.stock)
    if (body.status != null) data.status = String(body.status)
    if (body.description != null) data.description = String(body.description)
    if (body.imageUrl != null) data.imageUrl = String(body.imageUrl)
    if (body.sku != null && body.sku !== "") data.sku = String(body.sku)
    else if (body.sku === "") data.sku = null
    if (body.reorderPoint != null && body.reorderPoint !== "") data.reorderPoint = Number(body.reorderPoint)
    if (body.hasVariants != null) data.hasVariants = Boolean(body.hasVariants)
    if (body.variantOptions != null) data.variantOptions = JSON.stringify(body.variantOptions)
    if (body.isBestseller != null) data.isBestseller = Boolean(body.isBestseller)
    if (body.isActive != null) data.isActive = Boolean(body.isActive)
    if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder)

    const product = await prisma.product.create({
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
    
    // Parse back for response
    const parsedProduct = {
      ...product,
      variantOptions: product.variantOptions ? JSON.parse(product.variantOptions) : null,
      productLine: parseProductLine(product.productLine),
      productVariants: product.productVariants.map(variant => ({
        ...variant,
        variants: JSON.parse(variant.variants)
      }))
    }
    
    return createResponse(parsedProduct, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
