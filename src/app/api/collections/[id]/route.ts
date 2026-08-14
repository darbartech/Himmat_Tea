import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    })
    if (!collection) {
      return createErrorResponse('Collection not found', 404)
    }
    return createResponse(collection)
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
    const body = await request.json()

    const existing = await prisma.collection.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('Collection not found', 404)
    }

    const { items, ...restBody } = body

    const safeData: Record<string, any> = {}
    if (typeof restBody.title === 'string') safeData.title = restBody.title
    if (typeof restBody.slug === 'string') safeData.slug = restBody.slug
    if (typeof restBody.description === 'string') safeData.description = restBody.description
    if (typeof restBody.image === 'string') safeData.image = restBody.image
    if (typeof restBody.isActive === 'boolean') safeData.isActive = restBody.isActive

    if (safeData.slug && safeData.slug !== existing.slug) {
      const slugExists = await prisma.collection.findUnique({ where: { slug: safeData.slug } })
      if (slugExists) {
        return createErrorResponse(`Slug "${safeData.slug}" already exists`, 409)
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.collection.update({
        where: { id },
        data: safeData,
        include: { items: { include: { product: true } } },
      })

      if (Array.isArray(items)) {
        await tx.collectionItem.deleteMany({ where: { collectionId: id } })

        const productIds = items
          .map((it: any) => Number(it.productId || it))
          .filter((n: number) => !isNaN(n))

        if (productIds.length > 0) {
          const uniqueIds = [...new Set(productIds)]
          await tx.collectionItem.createMany({
            data: uniqueIds.map((pid: number) => ({
              collectionId: id,
              productId: pid,
            })),
          })
        }

        return await tx.collection.findUnique({
          where: { id },
          include: { items: { include: { product: true } } },
        })
      }

      return updated
    })

    return createResponse(result)
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

    const existing = await prisma.collection.findUnique({ where: { id } })
    if (!existing) {
      return createErrorResponse('Collection not found', 404)
    }

    await prisma.$transaction(async (tx) => {
      await tx.collectionItem.deleteMany({ where: { collectionId: id } })
      await tx.collection.delete({ where: { id } })
    })

    return createResponse({ message: 'Collection deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
