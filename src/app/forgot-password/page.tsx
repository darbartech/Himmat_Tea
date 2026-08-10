import ForgotPasswordPage from "@/app/pages/ForgotPassword";
import { Suspense } from "react";

export default function ForgotPasswordRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
