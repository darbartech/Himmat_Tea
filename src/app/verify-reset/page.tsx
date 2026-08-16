import VerifyResetPage from "@/app/pages/VerifyReset";
import { Suspense } from "react";

import { useTranslation } from '../../context/TranslationContext';
export default function VerifyResetRoute() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div>{t('common.loading')}</div>}>
      <VerifyResetPage />
    </Suspense>
  );
}
