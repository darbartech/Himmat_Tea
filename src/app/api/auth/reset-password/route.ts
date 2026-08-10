import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { rateLimitAuth } from '@/lib/rate-limit'
import { passwordSchema, clearAuthCookies } from '@/lib/auth'
import { verifyResetToken } from '@/lib/password-reset'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset session is required'),
  newPassword: passwordSchema
})

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitAuth(request)
    if (!rl.allowed) {
      return createErrorResponse(rl.error || 'Too many requests. Please try again later.', 429)
    }

    const body = await request.json()
    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0].message, 400)
    }

    const { resetToken, newPassword } = parsed.data

    const payload = verifyResetToken(resetToken)
    if (!payload) {
      return createErrorResponse('Your reset session has expired. Please start over.', 400)
    }

    const token = await prisma.passwordResetToken.findUnique({
      where: { id: payload.tokenId }
    })

    if (
      !token ||
      token.customerId !== payload.customerId ||
      token.usedAt !== null ||
      token.expiresAt.getTime() < Date.now()
    ) {
      return createErrorResponse('Your reset session has expired. Please start over.', 400)
    }

    const customer = await prisma.customer.findUnique({
      where: { id: payload.customerId },
      select: { id: true }
    })

    if (!customer) {
      return createErrorResponse('Your reset session has expired. Please start over.', 400)
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)

    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash }
    })

    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() }
    })

    await clearAuthCookies()

    return createResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
