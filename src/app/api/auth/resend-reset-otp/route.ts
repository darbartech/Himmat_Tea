import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { rateLimitAuth } from '@/lib/rate-limit'
import { sendPasswordResetEmail } from '@/lib/email'
import { generateOtp, RESET_TTL_MINUTES } from '@/lib/password-reset'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const resendSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

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

    const email = parsed.data.email.trim().toLowerCase()

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: { id: true, name: true, email: true }
    })

    if (customer) {
      const otp = generateOtp()
      const otpHash = await bcrypt.hash(otp, 10)
      const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000)

      const token = await prisma.passwordResetToken.findFirst({
        where: {
          customerId: customer.id,
          usedAt: null,
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      })

      if (token) {
        await prisma.passwordResetToken.update({
          where: { id: token.id },
          data: { otpHash, attempts: 0, expiresAt }
        })
      } else {
        await prisma.passwordResetToken.create({
          data: { customerId: customer.id, otpHash, expiresAt }
        })
      }

      await sendPasswordResetEmail(customer.email, otp, RESET_TTL_MINUTES, customer.name)
    }

    return createResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
