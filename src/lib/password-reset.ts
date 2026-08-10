import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '@/lib/auth'

export const RESET_TTL_MINUTES = 15
export const MAX_OTP_ATTEMPTS = 5
export const OTP_LENGTH = 6

export function generateOtp(): string {
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0')
}

export function signResetToken(payload: { customerId: number; tokenId: number }): string {
  return jwt.sign(
    { ...payload, purpose: 'password-reset' },
    getJwtSecret(),
    { expiresIn: RESET_TTL_MINUTES * 60, algorithm: 'HS256' }
  )
}

export function verifyResetToken(
  token: string
): { customerId: number; tokenId: number } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256']
    }) as { purpose?: string; customerId?: unknown; tokenId?: unknown }

    if (
      decoded.purpose === 'password-reset' &&
      typeof decoded.customerId === 'number' &&
      typeof decoded.tokenId === 'number'
    ) {
      return { customerId: decoded.customerId, tokenId: decoded.tokenId }
    }
    return null
  } catch {
    return null
  }
}
