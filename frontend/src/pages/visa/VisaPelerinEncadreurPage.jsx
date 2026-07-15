import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePilgrim } from '../../context/PilgrimContext';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import PilgrimBottomNav from '../../components/layout/PilgrimBottomNav';
import PilgrimTopNav from '../../components/layout/PilgrimTopNav';
import VisaEncadreurPortalPage from './VisaEncadreurPortalPage';
import { isEncadreurPilgrimType } from '../../utils/constants';

// Espace encadreur intégré à l'espace pèlerin : accessible uniquement à un
// pèlerin connecté dont le type est « Encadreur ». On réutilise le portail
// encadreur en lui injectant l'identité issue de la session pèlerin.
export default function VisaPelerinEncadreurPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dossier, logout } = usePilgrim();

  if (!dossier) return <Navigate to="/visa/pelerin" replace />;
  if (!isEncadreurPilgrimType(dossier.pilgrimType)) return <Navigate to="/visa/pelerin/dossier" replace />;

  function handleLogout() {
    logout();
    navigate('/visa/pelerin');
  }

  return (
    <div className="app-shell-bg flex min-h-screen flex-col">
      <Header>
        <button type="button" onClick={handleLogout} className="btn-secondary !py-1.5 !px-3 text-xs">
          {t('common.logout')}
        </button>
      </Header>
      <PilgrimTopNav />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 pb-24 sm:px-6 sm:pb-8">
        <VisaEncadreurPortalPage
          encadreurId={dossier.encadreurId}
          encadreurName={`${dossier.pilgrimFirstName} ${dossier.pilgrimLastName}`}
        />
      </main>

      <Footer />
      <PilgrimBottomNav />
    </div>
  );
}
