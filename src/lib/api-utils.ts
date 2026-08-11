import { NextResponse } from 'next/server'

export function createResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function handleApiError(error: unknown) {
  console.error('API Error:', error)

  const message =
    process.env.NODE_ENV !== 'production' && error instanceof Error
      ? error.message
      : 'Internal server error'

  return createErrorResponse(message, 500)
}

// Never expose passwordHash in order responses.
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
