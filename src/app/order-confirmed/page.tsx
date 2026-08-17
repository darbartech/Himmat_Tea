import { Suspense } from "react";
import OrderConfirmed from "@/app/pages/OrderConfirmed";

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <OrderConfirmed />
    </Suspense>
  );
}