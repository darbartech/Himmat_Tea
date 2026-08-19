import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

const CAREER_APPLICATION_STATUSES = [
  'New',
  'Reviewing',
  'Shortlisted',
  'Interview',
  'Selected',
  'Rejected',
] as const

const updateSchema = z.object({
  status: z.enum(CAREER_APPLICATION_STATUSES).optional(),
  adminNotes: z.string().max(5000).optional().nullable(),
})

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) return createErrorResponse('Unauthorized - admin only', 401)

    const { id } = await params
    const application = await prisma.careerApplication.findUnique({
      where: { id },
      include: {
        careerJob: {
          select: { id: true, title: true, department: true, location: true, employmentType: true, level: true },
        },
      },
    })
    if (!application) return createErrorResponse('Application not found', 404)

    return createResponse(application)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) return createErrorResponse('Unauthorized - admin only', 401)

    const { id } = await params
    const existing = await prisma.careerApplication.findUnique({ where: { id } })
    if (!existing) return createErrorResponse('Application not found', 404)

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0]?.message || 'Invalid update data', 400)
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.status !== undefined) data.status = parsed.data.status
    if (parsed.data.adminNotes !== undefined) data.adminNotes = parsed.data.adminNotes

    const application = await prisma.careerApplication.update({
      where: { id },
      data,
      include: {
        careerJob: {
          select: { id: true, title: true, department: true, location: true },
        },
      },
    })

    return createResponse(application)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) return createErrorResponse('Unauthorized - admin only', 401)

    const { id } = await params
    const existing = await prisma.careerApplication.findUnique({ where: { id } })
    if (!existing) return createErrorResponse('Application not found', 404)

    await prisma.careerApplication.delete({ where: { id } })
    return createResponse({ message: 'Application deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
