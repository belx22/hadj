import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-afriland-gray-50 px-4 text-center">
      <p className="text-6xl font-bold text-afriland-red">404</p>
      <p className="text-afriland-gray-600">Page introuvable</p>
      <Link to="/" className="btn-primary mt-2">
        {t('common.back')}
      </Link>
    </div>
  );
}
