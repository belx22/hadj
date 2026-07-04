import { useTranslation } from 'react-i18next';
import logo from '../../assets/logo-afriland.png';
import KaabaIllustration from '../illustrations/KaabaIllustration';
import ArabesquePattern from '../illustrations/ArabesquePattern';
import LanguageSwitcher from '../ui/LanguageSwitcher';

export default function AuthLayout({ children, subtitle }) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-afriland-black md:flex">
        <ArabesquePattern className="absolute inset-0" tone="#FFFFFF" opacity={0.05} />
        <div className="relative z-10 flex max-w-sm flex-col items-center px-8 text-center">
          <KaabaIllustration className="mb-6 w-56" />
          <h2 className="text-xl font-bold text-white">{t('app.name')}</h2>
          <p className="mt-2 text-sm text-afriland-gray-200/80">{t('app.tagline')}</p>
        </div>
      </div>

      <div className="app-shell-bg flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto flex w-full max-w-sm flex-col">
          <div className="mb-6 flex items-center justify-between">
            <img src={logo} alt="Afriland First Bank" className="h-10 w-auto" />
            <LanguageSwitcher />
          </div>
          <h1 className="text-2xl font-bold text-afriland-black">{t('app.name')}</h1>
          {subtitle && <p className="mt-1 text-sm text-afriland-gray-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
