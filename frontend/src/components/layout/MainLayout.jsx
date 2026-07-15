import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', key: 'nav.dashboard', roles: ['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'ADMIN_DSI'] },
  { to: '/clients', key: 'nav.clients', roles: ['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'ADMIN_DSI'] },
  { to: '/bordereaux', key: 'nav.bordereauList', roles: ['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'OPERATEUR_HADJ', 'ADMIN_DSI'] },
  // « Nouveau bordereau » a été retiré du menu back-office : la création reste
  // accessible depuis la liste des bordereaux (route /bordereaux/nouveau).
  { to: '/paiements', key: 'nav.payments', roles: ['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'ADMIN_DSI'] },
  { to: '/attestations', key: 'nav.attestations', roles: ['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'ADMIN_DSI'] },
  { to: '/parametrage/powerbi', key: 'nav.powerbi', roles: ['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'ADMIN_DSI'] },
  { to: '/visa/encadreur', key: 'nav.visaPortal', roles: ['ENCADREUR', 'GESTIONNAIRE_HADJ'] },
  { to: '/parametrage/saisons', key: 'nav.seasons', roles: ['GESTIONNAIRE_HADJ', 'ADMIN_DSI'] },
  { to: '/parametrage/encadreurs', key: 'nav.encadreurs', roles: ['GESTIONNAIRE_HADJ', 'ADMIN_DSI', 'OPERATEUR_HADJ'] },
  { to: '/parametrage/commissions', key: 'nav.commissions', roles: ['GESTIONNAIRE_HADJ', 'ADMIN_DSI'] },
  { to: '/parametrage/utilisateurs', key: 'nav.users', roles: ['ADMIN_DSI', 'SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'OPERATEUR_HADJ'] },
  { to: '/parametrage/smtp', key: 'nav.smtp', roles: ['ADMIN_DSI'] },
  { to: '/audit', key: 'nav.audit', roles: ['ADMIN_DSI', 'SUPERVISEUR'] },
];

const linkClass = ({ isActive }) =>
  clsx(
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-afriland-red text-white' : 'text-afriland-gray-600 hover:bg-white'
  );

export default function MainLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  // Ferme le tiroir à chaque navigation et bloque le défilement de fond
  // lorsqu'il est ouvert (confort mobile).
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="app-shell-bg flex min-h-screen flex-col">
      <Header>
        {/* Bouton menu (mobile) */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-afriland-black md:hidden"
          onClick={() => setMenuOpen(true)}
          aria-label={t('common.menu')}
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        {/* Infos utilisateur + déconnexion (desktop) */}
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

      {/* --- Tiroir de navigation mobile (coulissant) --- */}
      <div className={clsx('fixed inset-0 z-50 md:hidden', menuOpen ? '' : 'pointer-events-none')} aria-hidden={!menuOpen}>
        {/* Fond assombri */}
        <div
          className={clsx('absolute inset-0 bg-black/40 transition-opacity duration-300', menuOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setMenuOpen(false)}
        />
        {/* Panneau */}
        <aside
          className={clsx(
            'absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between border-b border-afriland-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-afriland-black">{user?.name}</p>
              <p className="text-xs text-afriland-gray-600">{t(`roles.${user?.role}`)}</p>
            </div>
            <button
              type="button"
              className="rounded-md p-1.5 text-afriland-gray-600 hover:bg-afriland-gray-50"
              onClick={() => setMenuOpen(false)}
              aria-label={t('common.close')}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <ul className="space-y-1">
              {visibleNav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.to === '/bordereaux'} className={linkClass}>
                    {t(item.key)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-afriland-gray-200 p-3">
            <button type="button" onClick={logout} className="btn-secondary w-full">
              {t('common.logout')}
            </button>
          </div>
        </aside>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        {/* Barre latérale (desktop) */}
        <nav className="hidden w-56 shrink-0 md:block">
          <ul className="space-y-1">
            {visibleNav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/bordereaux'} className={linkClass}>
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

function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
