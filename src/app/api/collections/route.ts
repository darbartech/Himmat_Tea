import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { ensureUniqueSlug } from '@/lib/slug'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAdminView = searchParams.get('admin') === 'true'

    const where: any = {}
    if (!isAdminView) {
      where.isActive = true
    }

    const collections = await prisma.collection.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return createResponse(collections)
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
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return createErrorResponse('Title is required', 400)
    }
    const { items, ...restBody } = body

    const safeData: Record<string, any> = { title: body.title.trim() }
    if (typeof restBody.description === 'string') safeData.description = restBody.description
    if (typeof restBody.image === 'string') safeData.image = restBody.image
    if (typeof restBody.isActive === 'boolean') safeData.isActive = restBody.isActive

    const slugInput =
      typeof restBody.slug === 'string' && restBody.slug.trim() ? restBody.slug.trim() : body.title
    safeData.slug = await ensureUniqueSlug(slugInput, async (c) => {
      const exists = await prisma.collection.findUnique({ where: { slug: c }, select: { id: true } })
      return !!exists
    })

    const result = await prisma.$transaction(async (tx) => {
      const collection = await tx.collection.create({
        data: safeData as any,
      })

      if (Array.isArray(items) && items.length > 0) {
        const productIds = items
          .map((it: any) => Number(it.productId || it))
          .filter((n: number) => !isNaN(n))

        if (productIds.length > 0) {
          const uniqueIds = [...new Set(productIds)]
          await tx.collectionItem.createMany({
            data: uniqueIds.map((pid: number) => ({
              collectionId: collection.id,
              productId: pid,
            })),
          })
        }
      }

      return await tx.collection.findUnique({
        where: { id: collection.id },
        include: { items: { include: { product: true } } },
      })
    })

    return createResponse(result, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
