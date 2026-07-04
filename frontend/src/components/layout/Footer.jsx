import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-afriland-gray-200 bg-white py-4">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-xs text-afriland-gray-600 sm:flex-row sm:px-6">
        <p>
          © {year} {t('app.bank')} — {t('footer.islamicWindow')}. {t('footer.rights')}.
        </p>
        <p className="font-medium text-afriland-red">{t('app.name')}</p>
      </div>
    </footer>
  );
}
