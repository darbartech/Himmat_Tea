import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, handleApiError } from '@/lib/api-utils'

export async function GET() {
  try {
    const visuals = await prisma.heroVisual.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    })
    return createResponse(visuals)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const visual = await prisma.heroVisual.create({ data: body })
    return createResponse(visual, 201)
  } catch (error) {
    return handleApiError(error)
  }
}