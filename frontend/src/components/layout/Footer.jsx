import { useTranslation } from 'react-i18next';
import { USE_MOCK } from '../../api/axiosClient';
import { resetDemoData } from '../../api/referenceDataApi';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  function handleReset() {
    if (!window.confirm(t('common.resetConfirm'))) return;
    resetDemoData();
    window.location.assign('/');
  }

  return (
    <footer className="border-t border-afriland-gray-200 bg-white py-4">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-afriland-gray-600 sm:flex-row sm:px-6">
        <p>
          © {year} {t('app.bank')} — {t('footer.islamicWindow')}. {t('footer.rights')}.
        </p>
        <div className="flex items-center gap-3">
          {USE_MOCK && (
            <button type="button" onClick={handleReset} className="text-afriland-gray-600 underline hover:text-afriland-red">
              {t('common.resetDemoData')}
            </button>
          )}
          <p className="font-medium text-afriland-red">{t('app.name')}</p>
        </div>
      </div>
    </footer>
  );
}
