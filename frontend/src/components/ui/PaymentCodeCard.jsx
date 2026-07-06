import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function PaymentCodeCard({ code }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé) — pas bloquant.
    }
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 border-afriland-red/20 bg-afriland-red/5">
      <div>
        <p className="text-xs font-medium uppercase text-afriland-gray-600">{t('paymentPage.paymentCode')}</p>
        <p className="font-mono text-xl font-bold text-afriland-red">{code}</p>
        <p className="mt-1 text-xs text-afriland-gray-600">{t('paymentPage.paymentCodeHelp')}</p>
      </div>
      <button type="button" className="btn-secondary" onClick={handleCopy}>
        {copied ? t('paymentPage.codeCopied') : t('paymentPage.copyCode')}
      </button>
    </div>
  );
}
