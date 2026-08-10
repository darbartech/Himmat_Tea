import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'
import { z } from 'zod'

const settingsUpdateSchema = z.object({
  taxRate: z.number().min(0).max(100).optional(),
  shippingFlatRate: z.number().min(0).optional(),
  qrImageUrl: z.string().optional().nullable(),
  currency: z.string().min(1).max(10).optional(),
  storeName: z.string().min(1).optional(),
  storeEmail: z.string().email().optional(),
  storePhone: z.string().min(1).optional(),
  notificationsEnabled: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  gstNumber: z.string().optional().nullable(),
}).strict()

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst()

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          taxRate: 18,
          shippingFlatRate: 0,
          qrImageUrl: null,
          currency: '₹',
          storeName: 'Himmat Tea',
          storeEmail: 'support@himmattea.com',
          storePhone: '+977 9800000000',
          notificationsEnabled: true,
          lowStockThreshold: 30,
        }
      })
    }

    return createResponse({ success: true, data: settings })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }

    const body = await request.json()
    const parsed = settingsUpdateSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return createErrorResponse(
        `Invalid field: ${firstError.path.join('.')} - ${firstError.message}`,
        400
      )
    }

    const existingSettings = await prisma.settings.findFirst()

    let settings

    if (existingSettings) {
      settings = await prisma.settings.update({
        where: { id: existingSettings.id },
        data: parsed.data
      })
    } else {
      settings = await prisma.settings.create({
        data: {
          taxRate: 18,
          shippingFlatRate: 0,
          currency: '₹',
          storeName: 'Himmat Tea',
          storeEmail: 'support@himmattea.com',
          storePhone: '+977 9800000000',
          notificationsEnabled: true,
          lowStockThreshold: 30,
          ...parsed.data,
        }
      })
    }

    return createResponse({ success: true, data: settings })
  } catch (error) {
    return handleApiError(error)
  }
}
