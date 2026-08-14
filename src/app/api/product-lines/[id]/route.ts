import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
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
    return createResponse(productLine)
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
    const productLine = await prisma.productLine.update({
      where: { id: parseInt(id) },
      data: body,
      include: { products: true },
    })
    return createResponse(productLine)
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

