'use client';

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import { useTranslation } from '../../context/TranslationContext';
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslation();

  const { isLoggedIn, userType, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || userType !== 'admin')) {
      if (pathname !== '/himmat_admin_8526') {
        router.push("/himmat_admin_8526");
      }
    }
  }, [isLoggedIn, userType, isLoading, router, pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid rendering the loading UI on the server to prevent hydration mismatches.
  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">{t('auth.checkingAuthentication')}</div>
      </div>
    );
  }

  if (isLoggedIn && userType === 'admin') {
    return <>{children}</>;
  }

  return null;
}
