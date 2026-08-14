import { NextResponse } from 'next/server'
import { USER_ERRORS, resolveErrorMessage } from './error-messages'

export function createResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function createErrorResponse(message: string, status: number = 400) {
  const userFriendly = resolveErrorMessage(message)
  return NextResponse.json({ error: userFriendly, rawError: message }, { status })
}

export async function handleApiError(error: unknown) {
  console.error('API Error:', error)

  if (process.env.NODE_ENV === 'production') {
    return createErrorResponse(USER_ERRORS.GENERAL.SERVER_ERROR, 500)
  }

  const devMessage = error instanceof Error ? error.message : String(error)
  return createErrorResponse(devMessage, 500)
}

export const SAFE_CUSTOMER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  ordersCount: true,
  totalSpent: true,
  loyaltyPoints: true,
  tier: true,
  createdAt: true,
} as const
