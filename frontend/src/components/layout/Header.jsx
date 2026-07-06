import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo-afriland.png';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useAuth } from '../../context/AuthContext';
import { usePilgrim } from '../../context/PilgrimContext';
import { ROLE_HOME } from '../../utils/constants';

export default function Header({ children }) {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const { dossier } = usePilgrim();

  let homeHref = '/';
  if (isAuthenticated) {
    homeHref = ROLE_HOME[user.role] || '/dashboard';
  } else if (dossier) {
    homeHref = '/visa/pelerin/dossier';
  }

  return (
    <header className="border-b border-afriland-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to={homeHref} className="flex items-center gap-3">
          <img src={logo} alt="Afriland First Bank" className="h-9 w-auto" />
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight text-afriland-black">{t('app.name')}</p>
            <p className="text-xs leading-tight text-afriland-gray-600">{t('app.tagline')}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {children}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
