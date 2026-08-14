import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

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
    const { items, ...restBody } = body

    const result = await prisma.$transaction(async (tx) => {
      const collection = await tx.collection.create({
        data: restBody,
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
