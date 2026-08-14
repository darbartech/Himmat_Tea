import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

type BaseProduct = Awaited<ReturnType<typeof prisma.product.findUnique>> & NonNullable<any>

function parseProduct(p: any) {
  if (!p) return p
  const variantOptions = p.variantOptions
    ? (typeof p.variantOptions === 'string' ? JSON.parse(p.variantOptions) : p.variantOptions)
    : null
  const productVariants = Array.isArray(p.productVariants)
    ? p.productVariants.map((v: any) => {
        const variants =
          typeof v.variants === 'string' ? JSON.parse(v.variants) : Array.isArray(v.variants) ? v.variants : []
        return { ...v, variants }
      })
    : []
  return { ...p, variantOptions, productVariants }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const isAdminView = searchParams.get('admin') === 'true'
    const adminUser = isAdminView ? await getCurrentAdmin() : null

    const parsed = parseInt(id)
    if (isNaN(parsed)) {
      return createErrorResponse('Invalid product id', 400)
    }

    const adminInclude: any = adminUser
      ? { batches: true, inventoryTransactions: true }
      : {}

    const product = await prisma.product.findUnique({
      where: { id: parsed },
      include: {
        productLine: true,
        productVariants: true,
        reviews: true,
        collectionItems: { include: { collection: true } },
        ...adminInclude,
      },
    })

    if (!product) {
      return createErrorResponse('Product not found', 404)
    }
    if (!adminUser && !(product as any).isActive === false) {
      return createErrorResponse('Product not found', 404)
    }

    return createResponse(parseProduct(product))
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
    const parsed = parseInt(id)
    if (isNaN(parsed)) {
      return createErrorResponse('Invalid product id', 400)
    }
    const body = await request.json()

    const existing = await prisma.product.findUnique({ where: { id: parsed } })
    if (!existing) {
      return createErrorResponse('Product not found', 404)
    }

    const safeData: Record<string, any> = {}
    if (typeof body.name === 'string' && body.name.trim()) safeData.name = body.name.trim()
    if (typeof body.price === 'number' && !isNaN(body.price) && body.price >= 0) safeData.price = body.price
    if (typeof body.productLineId !== 'undefined' && body.productLineId !== null && body.productLineId !== '') {
      safeData.productLineId = String(body.productLineId)
    }
    if (typeof body.category === 'string') safeData.category = body.category
    if (typeof body.stock === 'number' && !isNaN(body.stock)) safeData.stock = body.stock
    if (typeof body.description === 'string') safeData.description = body.description
    if (typeof body.imageUrl === 'string') safeData.imageUrl = body.imageUrl
    if (typeof body.images === 'string') safeData.images = body.images
    if (typeof body.reviewsEnabled === 'boolean') safeData.reviewsEnabled = body.reviewsEnabled
    if (typeof body.sku === 'string') safeData.sku = body.sku
    if (typeof body.reorderPoint === 'number' && !isNaN(body.reorderPoint)) safeData.reorderPoint = body.reorderPoint
    if (typeof body.hasVariants === 'boolean') safeData.hasVariants = body.hasVariants
    if (typeof body.isBestseller === 'boolean') safeData.isBestseller = body.isBestseller
    if (typeof body.weight === 'string') safeData.weight = body.weight
    if (typeof body.isActive === 'boolean') safeData.isActive = body.isActive
    if (typeof body.status === 'string') safeData.status = body.status

    if (typeof body.variantOptions !== 'undefined' && body.variantOptions !== null) {
      safeData.variantOptions = JSON.stringify(body.variantOptions)
    }

    const result = await prisma.$transaction(async (tx) => {
      let updated = await tx.product.update({
        where: { id: parsed },
        data: safeData,
      })

      if (Array.isArray(body.productVariants)) {
        await tx.productVariant.deleteMany({ where: { productId: parsed } })
        if (body.productVariants.length > 0) {
          await tx.productVariant.createMany({
            data: body.productVariants.map((v: any) => ({
              productId: parsed,
              sku: typeof v.sku === 'string' ? v.sku : `VAR-${parsed}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
              price: typeof v.price === 'number' ? v.price : 0,
              stock: typeof v.stock === 'number' ? v.stock : 0,
              imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : null,
              variants: JSON.stringify(Array.isArray(v.variants) ? v.variants : []),
            })),
          })
        }
      }

      if (Array.isArray(body.batches)) {
        await tx.batch.deleteMany({ where: { productId: parsed } })
        if (body.batches.length > 0) {
          await tx.batch.createMany({
            data: body.batches
              .filter((b: any) => b && typeof b.batchNumber === 'string')
              .map((b: any) => ({
                productId: parsed,
                batchNumber: b.batchNumber,
                quantity: typeof b.quantity === 'number' ? b.quantity : 0,
                receivedDate: b.receivedDate ? new Date(b.receivedDate) : new Date(),
                expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
                supplier: typeof b.supplier === 'string' ? b.supplier : null,
                costPrice: typeof b.costPrice === 'number' ? b.costPrice : 0,
              })),
          })
        }
      }

      return await tx.product.findUnique({
        where: { id: parsed },
        include: {
          productLine: true,
          productVariants: true,
          batches: true,
          reviews: true,
          collectionItems: { include: { collection: true } },
          inventoryTransactions: true,
        },
      })
    })

    return createResponse(parseProduct(result))
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
    const parsed = parseInt(id)
    if (isNaN(parsed)) {
      return createErrorResponse('Invalid product id', 400)
    }
    const existing = await prisma.product.findUnique({ where: { id: parsed } })
    if (!existing) {
      return createErrorResponse('Product not found', 404)
    }

    await prisma.$transaction(async (tx) => {
      await tx.batch.deleteMany({ where: { productId: parsed } })
      await tx.productVariant.deleteMany({ where: { productId: parsed } })
      await tx.inventoryTransaction.deleteMany({ where: { productId: parsed } })
      await tx.collectionItem.deleteMany({ where: { productId: parsed } })
      await tx.review.deleteMany({ where: { productId: parsed } })
      await tx.orderItem.deleteMany({ where: { productId: parsed } })
      await tx.product.delete({ where: { id: parsed } })
    })

    return createResponse({ message: 'Product deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
