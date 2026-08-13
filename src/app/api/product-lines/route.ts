import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const productLines = await prisma.productLine.findMany({
      include: {
        products: true,
      },
      orderBy: { sortOrder: 'asc' },
    })
    return createResponse(productLines)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const body = await request.json()
    const productLine = await prisma.productLine.create({
      data: body,
      include: {
        products: true,
      },
    })
    return createResponse(productLine, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

