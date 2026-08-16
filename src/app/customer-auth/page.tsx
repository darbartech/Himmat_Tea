import CustomerAuth from "@/app/pages/CustomerAuth";
import { Suspense } from "react";

import { useTranslation } from '../../context/TranslationContext';
export default function CustomerAuthPage() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div>{t('common.loading')}</div>}>
      <CustomerAuth />
    </Suspense>
  );
}
