import { NextRequest, NextResponse } from 'next/server'
import { createResponse, handleApiError } from '@/lib/api-utils'
import { clearAuthCookies } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await clearAuthCookies()
    return createResponse({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
