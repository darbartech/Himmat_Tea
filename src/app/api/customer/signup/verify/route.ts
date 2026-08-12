import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { setAuthCookie } from '@/lib/auth'
import { rateLimitAuth } from '@/lib/rate-limit'
import { generateOtp, OTP_LENGTH } from '@/lib/password-reset'
import { SIGNUP_OTP_TTL_MINUTES, MAX_SIGNUP_OTP_ATTEMPTS } from '@/lib/signup-verification'
import { sendSignupVerificationEmail } from '@/lib/email'
import { normalizeEmail, isEmailRegistered } from '@/lib/email-validation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const verifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code from your email`)
})

const CUSTOMER_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  loyaltyPoints: true,
  tier: true,
  ordersCount: true,
  totalSpent: true,
  createdAt: true,
  updatedAt: true
}

/**
 * Step 2 of customer signup. Verifies the emailed one-time code and only then
 * creates the customer account, signs the user in, and invalidates the code.
 */
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

    const email = normalizeEmail(parsed.data.email)
    const { otp } = parsed.data

    const verification = await prisma.signupVerification.findUnique({
      where: { email }
    })

    if (!verification || verification.usedAt !== null || verification.expiresAt.getTime() < Date.now()) {
      return createErrorResponse('Your verification code has expired. Please start the signup again.', 400)
    }

    if (verification.attempts >= MAX_SIGNUP_OTP_ATTEMPTS) {
      return createErrorResponse('Too many attempts. Please request a new code.', 400)
    }

    let otpMatches = false
    try {
      otpMatches = await bcrypt.compare(otp, verification.otpHash)
    } catch {
      otpMatches = false
    }

    if (!otpMatches) {
      await prisma.signupVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } }
      })
      return createErrorResponse('Invalid verification code. Please try again.', 400)
    }

    const alreadyRegistered = await isEmailRegistered(email, 'customer')
    if (alreadyRegistered) {
      return createErrorResponse('This email is already registered. Please sign in instead.', 400)
    }

    const customer = await prisma.customer.create({
      data: {
        name: verification.name,
        email,
        phone: verification.phone,
        address: verification.address,
        passwordHash: verification.passwordHash,
        tier: 'Bronze',
        loyaltyPoints: 0,
        ordersCount: 0,
        totalSpent: 0
      },
      select: CUSTOMER_USER_SELECT
    })

    await prisma.signupVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() }
    })

    await setAuthCookie({
      id: customer.id,
      email: customer.email,
      type: 'customer'
    }, {
      currentUserCookieValue: JSON.stringify({ ...customer, type: 'customer' }),
      userTypeCookieValue: 'customer'
    })

    return createResponse({
      success: true,
      user: customer
    })
  } catch (error) {
    return handleApiError(error)
  }
}
