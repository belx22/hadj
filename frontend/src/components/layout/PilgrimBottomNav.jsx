import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { usePilgrim } from '../../context/PilgrimContext';

// Barre de navigation basse, pensée pour le mobile (« mode téléphone ») : elle
// est fixée en bas de l'écran et masquée dès le format tablette/desktop
// (sm:hidden). Elle offre au pèlerin un accès en un geste à son dossier, au
// paiement et à la déconnexion. Les pages pèlerin réservent un espace en bas
// (pb-24 sm:pb-8) pour qu'elle ne recouvre pas le contenu.
const TABS = [
  { to: '/visa/pelerin/dossier', key: 'pilgrimNav.dossier', icon: FileIcon },
  { to: '/visa/pelerin/paiement', key: 'pilgrimNav.payment', icon: CardIcon },
];

export default function PilgrimBottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dossier, logout } = usePilgrim();

  if (!dossier) return null;

  function handleLogout() {
    logout();
    navigate('/visa/pelerin');
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-afriland-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] sm:hidden"
      aria-label={t('pilgrimNav.dossier')}
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-afriland-red' : 'text-afriland-gray-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx('h-6 w-6', isActive && 'stroke-[2.2]')} />
                <span>{t(key)}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-afriland-gray-600"
        >
          <LogoutIcon className="h-6 w-6" />
          <span>{t('pilgrimNav.logout')}</span>
        </button>
      </div>
    </nav>
  );
}

function FileIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

function CardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </svg>
  );
}

function LogoutIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
