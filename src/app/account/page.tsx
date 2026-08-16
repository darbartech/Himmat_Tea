import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import CustomerAccount from "@/app/pages/CustomerAccount";
import { Suspense } from "react";

import { useTranslation } from '../../context/TranslationContext';
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'development') {
      return 'himmat-tea-dev-secret-change-in-production'
    }
    throw new Error('JWT_SECRET is required')
  }
  return secret
}

async function verifyCustomerTokenServerSide(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('himmat_sessionToken')?.value
  if (!token) return false
  try {
    const secret = getJwtSecret()
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { id: number; type: string }
    return decoded?.type === 'customer' && typeof decoded.id === 'number'
  } catch {
    return false
  }
}

export default async function AccountPage() {
  const isCustomer = await verifyCustomerTokenServerSide()

  if (!isCustomer) {
    redirect('/customer-auth?redirect=/account')
  }

  return (
    <Suspense fallback={<div>{"Loading account..."}</div>}>
      <CustomerAccount />
    </Suspense>
  );
}
