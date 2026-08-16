import ResetPasswordPage from "@/app/pages/ResetPassword";
import { Suspense } from "react";

import { useTranslation } from '../../context/TranslationContext';
export default function ResetPasswordRoute() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div>{t('common.loading')}</div>}>
      <ResetPasswordPage />
    </Suspense>
  );
}
