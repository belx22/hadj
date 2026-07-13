import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { usePilgrim } from '../../context/PilgrimContext';
import { isEncadreurPilgrimType } from '../../utils/constants';

// Navigation par onglets de l'espace pèlerin, pensée pour le desktop
// (hidden sm:block) — le mobile utilise la barre basse PilgrimBottomNav.
// L'onglet « Mon groupe » n'apparaît que pour un pèlerin de type Encadreur.
const BASE_TABS = [
  { to: '/visa/pelerin/dossier', key: 'pilgrimNav.dossier' },
  { to: '/visa/pelerin/paiement', key: 'pilgrimNav.payment' },
];
const ENCADREUR_TAB = { to: '/visa/pelerin/encadreur', key: 'pilgrimNav.group' };

export default function PilgrimTopNav() {
  const { t } = useTranslation();
  const { dossier } = usePilgrim();
  if (!dossier) return null;

  const tabs = isEncadreurPilgrimType(dossier.pilgrimType) ? [...BASE_TABS, ENCADREUR_TAB] : BASE_TABS;

  return (
    <nav className="hidden border-b border-afriland-gray-200 bg-white sm:block">
      <div className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              clsx(
                '-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-afriland-red text-afriland-red'
                  : 'border-transparent text-afriland-gray-600 hover:text-afriland-black'
              )
            }
          >
            {t(tab.key)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
