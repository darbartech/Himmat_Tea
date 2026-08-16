import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

type BaseProduct = Awaited<ReturnType<typeof prisma.product.findMany>>[number] & {
  productVariants: Array<{ variants: string | Array<any>; [k: string]: any }>
}

function parseProduct(p: BaseProduct) {
  const variantOptions = p.variantOptions
    ? (typeof p.variantOptions === 'string' ? JSON.parse(p.variantOptions) : p.variantOptions)
    : null
  const productVariants = p.productVariants.map((v) => {
    const variants =
      typeof v.variants === 'string' ? JSON.parse(v.variants) : Array.isArray(v.variants) ? v.variants : []
    return { ...v, variants }
  })
  return { ...p, variantOptions, productVariants } as any
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAdminView = searchParams.get('admin') === 'true'
    const adminUser = isAdminView ? await getCurrentAdmin() : null

    const where: any = {}
    if (!adminUser) {
      where.isActive = true
    }

    const adminInclude: any = adminUser
      ? {
          batches: true,
          inventoryTransactions: true,
        }
      : {}

    const products = await prisma.product.findMany({
      where,
      include: {
        productLine: true,
        productVariants: true,
        reviews: true,
        collectionItems: { include: { collection: true } },
        ...adminInclude,
      },
      orderBy: { id: 'desc' },
    })
<<<<<<< HEAD

    return createResponse((products as any[]).map(parseProduct))
=======
    
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
>>>>>>> 82a9e5e369f08e2d34aad73619dcf89a4e6b59a4
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
<<<<<<< HEAD
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return createErrorResponse('Product name is required', 400)
    }
    if (
      typeof body.price !== 'number' ||
      isNaN(body.price) ||
      body.price < 0
    ) {
      return createErrorResponse('Valid product price is required', 400)
    }

    const safeData: Record<string, any> = {
      name: body.name.trim(),
      price: Number(body.price),
    }
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
      const created = await tx.product.create({ data: safeData as any })

      if (Array.isArray(body.productVariants) && body.productVariants.length > 0) {
        await tx.productVariant.createMany({
          data: body.productVariants.map((v: any) => ({
            productId: created.id,
            sku: typeof v.sku === 'string' ? v.sku : `VAR-${created.id}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
            price: typeof v.price === 'number' ? v.price : 0,
            stock: typeof v.stock === 'number' ? v.stock : 0,
            imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : null,
            variants: JSON.stringify(Array.isArray(v.variants) ? v.variants : []),
          })),
        })
=======

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
>>>>>>> 82a9e5e369f08e2d34aad73619dcf89a4e6b59a4
      }

      if (Array.isArray(body.batches) && body.batches.length > 0) {
        await tx.batch.createMany({
          data: body.batches
            .filter((b: any) => b && typeof b.batchNumber === 'string')
            .map((b: any) => ({
              productId: created.id,
              batchNumber: b.batchNumber,
              quantity: typeof b.quantity === 'number' ? b.quantity : 0,
              receivedDate: b.receivedDate ? new Date(b.receivedDate) : new Date(),
              expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
              supplier: typeof b.supplier === 'string' ? b.supplier : null,
              costPrice: typeof b.costPrice === 'number' ? b.costPrice : 0,
            })),
        })
      }

      return await tx.product.findUnique({
        where: { id: created.id },
        include: {
          productVariants: true,
          batches: true,
          reviews: true,
          collectionItems: { include: { collection: true } },
          inventoryTransactions: true,
          productLine: true,
        },
      })
    })
<<<<<<< HEAD

    return createResponse(parseProduct(result as any), 201)
=======
    
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
>>>>>>> 82a9e5e369f08e2d34aad73619dcf89a4e6b59a4
  } catch (error) {
    return handleApiError(error)
  }
}
