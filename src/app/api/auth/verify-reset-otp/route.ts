import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { rateLimitAuth } from '@/lib/rate-limit'
import { signResetToken, MAX_OTP_ATTEMPTS, OTP_LENGTH } from '@/lib/password-reset'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const verifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), 'Enter the 6-digit code from your email')
})

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitAuth(request)
    if (!rl.allowed) {
      return createErrorResponse(rl.error || 'Too many requests. Please try again later.', 429)
    }

    const body = await request.json()
    const parsed = verifyOtpSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0].message, 400)
    }

    const email = parsed.data.email.trim().toLowerCase()
    const { otp } = parsed.data

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: { id: true }
    })

    if (!customer) {
      return createErrorResponse('Invalid or expired code', 400)
    }

    const token = await prisma.passwordResetToken.findFirst({
      where: {
        customerId: customer.id,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!token) {
      return createErrorResponse('Invalid or expired code', 400)
    }

    if (token.attempts >= MAX_OTP_ATTEMPTS) {
      await prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() }
      })
      return createErrorResponse('Too many attempts. Please request a new code.', 400)
    }

    let otpMatches = false
    try {
      otpMatches = await bcrypt.compare(otp, token.otpHash)
    } catch {
      otpMatches = false
    }

    if (!otpMatches) {
      await prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } }
      })
      return createErrorResponse('Invalid or expired code', 400)
    }

    const resetToken = signResetToken({ customerId: customer.id, tokenId: token.id })

    return createResponse({ success: true, resetToken })
  } catch (error) {
    return handleApiError(error)
  }
}
