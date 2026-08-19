import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createResponse,
  createErrorResponse,
  handleApiError,
} from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

const normalize = (value: unknown) =>
  Array.isArray(value)
    ? JSON.stringify(value)
    : typeof value === 'string'
      ? value
      : ''

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAdminView = searchParams.get('admin') === 'true'

    const jobs = await prisma.careerJob.findMany({
      where: isAdminView ? {} : { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return createResponse(
      jobs.map(job => ({
        ...job,

        // Database: employmentType
        // Frontend: type
        type: job.employmentType,

        responsibilities: JSON.parse(
          job.responsibilities || '[]'
        ),

        requirements: JSON.parse(
          job.requirements || '[]'
        ),
      }))
    )
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin()

    if (!adminUser) {
      return createErrorResponse(
        'Unauthorized - admin only',
        401
      )
    }

    const body = await request.json()

    const required = [
      'title',
      'department',
      'location',
      'type',
      'level',
      'description',
    ]

    if (
      required.some(
        key =>
          typeof body[key] !== 'string' ||
          !body[key].trim()
      )
    ) {
      return createErrorResponse(
        'Title, department, location, type, level and description are required',
        400
      )
    }

    const job = await prisma.careerJob.create({
      data: {
        title: body.title.trim(),
        department: body.department.trim(),
        location: body.location.trim(),

        // FIX
        employmentType: body.type.trim(),

        level: body.level.trim(),

  

        description: body.description.trim(),

        responsibilities: normalize(
          body.responsibilities || []
        ),

        requirements: normalize(
          body.requirements || []
        ),

        isActive:
          typeof body.isActive === 'boolean'
            ? body.isActive
            : true,

        sortOrder:
          typeof body.sortOrder === 'number'
            ? body.sortOrder
            : 0,
      },
    })

    return createResponse(
      {
        ...job,

        // Return the field expected by frontend
        type: job.employmentType,

        responsibilities: JSON.parse(
          job.responsibilities || '[]'
        ),

        requirements: JSON.parse(
          job.requirements || '[]'
        ),
      },
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}