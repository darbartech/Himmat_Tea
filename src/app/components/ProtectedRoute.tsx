'use client';

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn, userType, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!isLoggedIn || userType !== 'admin')) {
      if (pathname !== '/himmat_admin_8526') {
        router.push("/himmat_admin_8526");
      }
    }
  }, [isLoggedIn, userType, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Checking Authentication...</div>
      </div>
    );
  }

  if (isLoggedIn && userType === 'admin') {
    return <>{children}</>;
  }

  return null;
}
