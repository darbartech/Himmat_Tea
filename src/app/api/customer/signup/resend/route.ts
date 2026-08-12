import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { rateLimitAuth } from '@/lib/rate-limit'
import { sendSignupVerificationEmail } from '@/lib/email'
import { generateOtp } from '@/lib/password-reset'
import { SIGNUP_OTP_TTL_MINUTES } from '@/lib/signup-verification'
import { normalizeEmail } from '@/lib/email-validation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const resendSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

/**
 * Resends the signup verification code for a pending signup. Responds
 * identically whether or not a pending signup exists (no account enumeration).
 */
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitAuth(request)
    if (!rl.allowed) {
      return createErrorResponse(rl.error || 'Too many requests. Please try again later.', 429)
    }

    const body = await request.json()
    const parsed = resendSchema.safeParse(body)
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0].message, 400)
    }

    const email = normalizeEmail(parsed.data.email)

    const verification = await prisma.signupVerification.findUnique({
      where: { email }
    })

    if (verification && verification.usedAt === null) {
      const otp = generateOtp()
      const otpHash = await bcrypt.hash(otp, 12)
      const expiresAt = new Date(Date.now() + SIGNUP_OTP_TTL_MINUTES * 60_000)

      await prisma.signupVerification.update({
        where: { id: verification.id },
        data: { otpHash, attempts: 0, expiresAt }
      })

      await sendSignupVerificationEmail(email, otp, SIGNUP_OTP_TTL_MINUTES, verification.name)
    }

    return createResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
