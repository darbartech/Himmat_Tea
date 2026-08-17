import CustomerAuth from "@/app/pages/CustomerAuth";
import { Suspense } from "react";

export default function CustomerAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eef4ea] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d5a3d]"></div></div>}>
      <CustomerAuth />
    </Suspense>
  );
}
