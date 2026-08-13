import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const { id } = await params
    const visual = await prisma.heroVisual.findUnique({
      where: { id },
    })
    if (!visual) {
      return createErrorResponse('Hero visual not found', 404)
    }
    return createResponse(visual)
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
    const { id } = await params
    const body = await request.json()
    const visual = await prisma.heroVisual.update({
      where: { id },
      data: body
    })
    return createResponse(visual)
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
    const { id } = await params
    await prisma.heroVisual.delete({
      where: { id }
    })
    return createResponse({ message: 'Hero visual deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}