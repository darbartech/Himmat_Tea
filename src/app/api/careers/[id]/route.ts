import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

const normalize = (value: unknown) =>
  Array.isArray(value) ? JSON.stringify(value) : typeof value === 'string' ? value : undefined

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const job = await prisma.careerJob.findUnique({ where: { id } })
    if (!job) return createErrorResponse('Career job not found', 404)
    return createResponse({
      ...job,
      responsibilities: JSON.parse(job.responsibilities || '[]'),
      requirements: JSON.parse(job.requirements || '[]'),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) return createErrorResponse('Unauthorized - admin only', 401)

    const { id } = await params
    const existing = await prisma.careerJob.findUnique({ where: { id } })
    if (!existing) return createErrorResponse('Career job not found', 404)

    const body = await request.json()
    const data: Record<string, unknown> = {}
    for (const key of ['title', 'department', 'location', 'type', 'level', 'posted', 'description']) {
      if (typeof body[key] === 'string') data[key] = body[key].trim()
    }
    if (Array.isArray(body.responsibilities)) data.responsibilities = normalize(body.responsibilities)
    if (Array.isArray(body.requirements)) data.requirements = normalize(body.requirements)
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder

    const job = await prisma.careerJob.update({ where: { id }, data })
    return createResponse({
      ...job,
      responsibilities: JSON.parse(job.responsibilities || '[]'),
      requirements: JSON.parse(job.requirements || '[]'),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) return createErrorResponse('Unauthorized - admin only', 401)

    const { id } = await params
    const existing = await prisma.careerJob.findUnique({ where: { id } })
    if (!existing) return createErrorResponse('Career job not found', 404)

    await prisma.careerJob.delete({ where: { id } })
    return createResponse({ message: 'Career job deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
