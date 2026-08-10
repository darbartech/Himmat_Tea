import VerifyResetPage from "@/app/pages/VerifyReset";
import { Suspense } from "react";

export default function VerifyResetRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyResetPage />
    </Suspense>
  );
}
