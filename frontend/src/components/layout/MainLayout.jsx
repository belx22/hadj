import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';
import { USE_MOCK } from '../../api/axiosClient';

const NAV_ITEMS = [
  { to: '/dashboard', key: 'nav.dashboard', roles: ['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'ADMIN_DSI'] },
  { to: '/bordereaux', key: 'nav.bordereauList', roles: ['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'OPERATEUR_HADJ', 'ADMIN_DSI'] },
  { to: '/bordereaux/nouveau', key: 'nav.bordereauNew', roles: ['OPERATEUR_HADJ', 'GESTIONNAIRE_HADJ'] },
  { to: '/visa/encadreur', key: 'nav.visaPortal', roles: ['ENCADREUR'] },
  { to: '/audit', key: 'nav.audit', roles: ['ADMIN_DSI', 'SUPERVISEUR'] },
];

export default function MainLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  return (
    <div className="app-shell-bg flex min-h-screen flex-col">
      <Header>
        <div className="hidden items-center gap-2 sm:flex">
          <div className="text-right">
            <p className="text-sm font-semibold text-afriland-black">{user?.name}</p>
            <p className="text-xs text-afriland-gray-600">{t(`roles.${user?.role}`)}</p>
          </div>
          <button type="button" onClick={logout} className="btn-secondary !py-1.5 !px-3 text-xs">
            {t('common.logout')}
          </button>
        </div>
      </Header>

      {USE_MOCK && (
        <div className="bg-afriland-red/10 py-1.5 text-center text-xs font-medium text-afriland-red">
          {t('common.mockBanner')}
        </div>
      )}

      <nav className="border-b border-afriland-gray-200 bg-white md:hidden">
        <ul className="flex gap-1 overflow-x-auto px-4 py-2">
          {visibleNav.map((item) => (
            <li key={item.to} className="shrink-0">
              <NavLink
                to={item.to}
                end={item.to === '/bordereaux'}
                className={({ isActive }) =>
                  clsx(
                    'block whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive ? 'bg-afriland-red text-white' : 'bg-afriland-gray-50 text-afriland-gray-600'
                  )
                }
              >
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <nav className="hidden w-56 shrink-0 md:block">
          <ul className="space-y-1">
            {visibleNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/bordereaux'}
                  className={({ isActive }) =>
                    clsx(
                      'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-afriland-red text-white' : 'text-afriland-gray-600 hover:bg-white'
                    )
                  }
                >
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}
