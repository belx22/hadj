import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';

const CARDS = [
  { to: '/login/staff', titleKey: 'auth.staffSpace', descKey: 'auth.staffSpaceDesc' },
  { to: '/visa/pelerin', titleKey: 'auth.pilgrimSpace', descKey: 'auth.pilgrimSpaceDesc' },
  { to: '/login/staff', titleKey: 'auth.encadreurSpace', descKey: 'auth.encadreurSpaceDesc' },
];

export default function LoginChoicePage() {
  const { t } = useTranslation();

  return (
    <AuthLayout subtitle={t('auth.chooseSpace')}>
      <div className="space-y-3">
        {CARDS.map((card, index) => (
          <Link
            key={`${card.to}-${index}`}
            to={card.to}
            className="block rounded-lg border border-afriland-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-afriland-red"
          >
            <p className="font-semibold text-afriland-black">{t(card.titleKey)}</p>
            <p className="mt-1 text-xs text-afriland-gray-600">{t(card.descKey)}</p>
          </Link>
        ))}
      </div>
    </AuthLayout>
  );
}
