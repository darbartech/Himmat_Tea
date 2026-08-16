import ForgotPasswordPage from "@/app/pages/ForgotPassword";
import { Suspense } from "react";

import { useTranslation } from '../../context/TranslationContext';
export default function ForgotPasswordRoute() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div>{t('common.loading')}</div>}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
