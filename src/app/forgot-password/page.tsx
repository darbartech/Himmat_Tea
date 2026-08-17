import ForgotPasswordPage from "@/app/pages/ForgotPassword";
import { Suspense } from "react";

export default function ForgotPasswordRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eef4ea] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d5a3d]"></div></div>}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
