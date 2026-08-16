import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { rateLimitAuth } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/email'
import { generateOtp, RESET_TTL_MINUTES } from '@/lib/password-reset'
import { USER_ERRORS } from '@/lib/error-messages'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email(USER_ERRORS.VALIDATION.INVALID_EMAIL)
})

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitAuth(request)
    if (!rl.allowed) {
      return createErrorResponse(USER_ERRORS.AUTH.TOO_MANY_ATTEMPTS, 429)
    }

    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0].message, 400)
    }

    const email = parsed.data.email.trim().toLowerCase()

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: { id: true, name: true, email: true }
    })

    if (!customer) {
      return createErrorResponse('AUTH_EMAIL_NOT_FOUND', 404)
    }

    await prisma.passwordResetToken.deleteMany({
      where: { customerId: customer.id, usedAt: null }
    })

    const otp = generateOtp()
    const otpHash = await bcrypt.hash(otp, 12)

    await prisma.passwordResetToken.create({
      data: {
        customerId: customer.id,
        otpHash,
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000)
      }
    })

    await sendPasswordResetEmail(customer.email, otp, RESET_TTL_MINUTES, customer.name)

    return createResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
