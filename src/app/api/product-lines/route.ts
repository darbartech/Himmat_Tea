import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const adminUser = await getCurrentAdmin();
    const isAdmin = !!adminUser;
    const where = isAdmin ? {} : { isActive: true };
    const productWhere = isAdmin ? {} : { isActive: true };
    const productLines = await prisma.productLine.findMany({
      where,
      include: {
        products: { where: productWhere },
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
    if (adminUser.role !== 'superadmin') {
      return createErrorResponse('Only SuperAdmin can create product lines', 403);
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

