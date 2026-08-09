import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, handleApiError } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.heroVisual.delete({
      where: { id }
    })
    return createResponse({ message: 'Hero visual deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}