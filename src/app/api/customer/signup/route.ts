import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { passwordSchema } from '@/lib/auth'
import { rateLimitAuth } from '@/lib/rate-limit'
import { sendSignupVerificationEmail } from '@/lib/email'
import { generateOtp } from '@/lib/password-reset'
import { SIGNUP_OTP_TTL_MINUTES } from '@/lib/signup-verification'
import { validateSignupEmail, normalizeEmail } from '@/lib/email-validation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const signupServerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
  phone: z.string().min(1, 'Phone number is required').max(40),
  address: z.string().min(5, 'Address must be at least 5 characters').max(500)
})

/**
 * Step 1 of customer signup. Validates the submitted details (including a
 * production-grade email check: syntax, disposable domains, DNS deliverability
 * and whether the email is already registered), then emails a one-time code
 * that must be verified before the account is created.
 */
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitAuth(request)
    if (!rl.allowed) {
      return createErrorResponse(rl.error || 'Too many requests. Please try again later.', 429)
    }

    const body = await request.json()
    const parsed = signupServerSchema.safeParse({
      name: body?.name,
      email: body?.email,
      password: body?.password,
      phone: body?.phone,
      address: body?.address
    })

    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0].message, 400)
    }

    const { name, password, phone, address } = parsed.data
    const email = normalizeEmail(parsed.data.email)

    const emailCheck = await validateSignupEmail(email, 'customer')
    if (!emailCheck.ok) {
      return createErrorResponse(emailCheck.error || 'Invalid email address', 400)
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const otp = generateOtp()
    const otpHash = await bcrypt.hash(otp, 12)
    const expiresAt = new Date(Date.now() + SIGNUP_OTP_TTL_MINUTES * 60_000)

    await prisma.$transaction([
      prisma.signupVerification.deleteMany({ where: { email, usedAt: null } }),
      prisma.signupVerification.create({
        data: { email, name, phone, address, passwordHash, otpHash, expiresAt }
      })
    ])

    await sendSignupVerificationEmail(email, otp, SIGNUP_OTP_TTL_MINUTES, name)

    return createResponse({
      success: true,
      message: 'A verification code has been sent to your email. Enter it to complete your registration.'
    })
  } catch (error) {
    return handleApiError(error)
  }
}
