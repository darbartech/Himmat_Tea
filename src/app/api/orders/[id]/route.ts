import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        internalNotes: true
      }
    })
    
    if (!order) {
      return createErrorResponse('Order not found', 404)
    }
    
    return createResponse(order)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const order = await prisma.order.update({
      where: { id },
      data: body,
      include: {
        customer: true,
        items: true,
        internalNotes: true
      }
    })
    
    return createResponse(order)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    
    await prisma.order.delete({
      where: { id }
    })
    
    return createResponse({ message: 'Order deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
