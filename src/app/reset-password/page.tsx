import ResetPasswordPage from "@/app/pages/ResetPassword";
import { Suspense } from "react";

export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
