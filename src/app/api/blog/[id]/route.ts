import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const post = await prisma.blogPost.findUnique({
      where: { id }
    })
    
    if (!post) {
      return createErrorResponse('Blog post not found', 404)
    }
    
    return createResponse(post)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const post = await prisma.blogPost.update({
      where: { id },
      data: body
    })
    
    return createResponse(post)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    
    await prisma.blogPost.delete({
      where: { id }
    })
    
    return createResponse({ message: 'Blog post deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
