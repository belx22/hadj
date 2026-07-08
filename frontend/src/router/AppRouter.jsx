import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ui/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import PageLoader from '../components/ui/PageLoader';
import { ROLE_HOME } from '../utils/constants';

import LoginChoicePage from '../pages/auth/LoginChoicePage';
import StaffLoginPage from '../pages/auth/StaffLoginPage';
import NotFoundPage from '../pages/NotFoundPage';

// Chargées à la demande : réduit le bundle initial (recharts, jspdf, xlsx ne
// sont téléchargés que lorsque l'utilisateur ouvre l'écran qui en a besoin).
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const BordereauListPage = lazy(() => import('../pages/bordereau/BordereauListPage'));
const BordereauFormPage = lazy(() => import('../pages/bordereau/BordereauFormPage'));
const AuditLogPage = lazy(() => import('../pages/audit/AuditLogPage'));

const PilgrimSelfRegisterPage = lazy(() => import('../pages/pilgrim/PilgrimSelfRegisterPage'));

const VisaPelerinLoginPage = lazy(() => import('../pages/visa/VisaPelerinLoginPage'));
const VisaPelerinDossierPage = lazy(() => import('../pages/visa/VisaPelerinDossierPage'));
const VisaPelerinPaymentPage = lazy(() => import('../pages/visa/VisaPelerinPaymentPage'));
const VisaEncadreurPortalPage = lazy(() => import('../pages/visa/VisaEncadreurPortalPage'));

const ClientsPage = lazy(() => import('../pages/clients/ClientsPage'));
const PaymentValidationPage = lazy(() => import('../pages/payments/PaymentValidationPage'));
const UsersAdminPage = lazy(() => import('../pages/admin/UsersAdminPage'));
const EncadreursAdminPage = lazy(() => import('../pages/admin/EncadreursAdminPage'));
const EncadreurCommissionsPage = lazy(() => import('../pages/admin/EncadreurCommissionsPage'));
const SeasonsAdminPage = lazy(() => import('../pages/admin/SeasonsAdminPage'));
const PowerBiConnectorPage = lazy(() => import('../pages/admin/PowerBiConnectorPage'));

function HomeRoute() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />;
  }
  return <LoginChoicePage />;
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login/staff" element={<StaffLoginPage />} />

        <Route path="/inscription" element={<PilgrimSelfRegisterPage />} />
        <Route path="/visa/pelerin" element={<VisaPelerinLoginPage />} />
        <Route path="/visa/pelerin/dossier" element={<VisaPelerinDossierPage />} />
        <Route path="/visa/pelerin/paiement" element={<VisaPelerinPaymentPage />} />

        <Route element={<ProtectedRoute roles={['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'OPERATEUR_HADJ', 'ADMIN_DSI']} />}>
          <Route element={<MainLayout />}>
            <Route path="/bordereaux" element={<BordereauListPage />} />
            <Route path="/bordereaux/nouveau" element={<BordereauFormPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'ADMIN_DSI']} />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/paiements" element={<PaymentValidationPage />} />
            <Route path="/parametrage/powerbi" element={<PowerBiConnectorPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN_DSI', 'SUPERVISEUR']} />}>
          <Route element={<MainLayout />}>
            <Route path="/audit" element={<AuditLogPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN_DSI', 'GESTIONNAIRE_HADJ']} />}>
          <Route element={<MainLayout />}>
            <Route path="/parametrage/utilisateurs" element={<UsersAdminPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN_DSI', 'GESTIONNAIRE_HADJ']} />}>
          <Route element={<MainLayout />}>
            <Route path="/parametrage/encadreurs" element={<EncadreursAdminPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['GESTIONNAIRE_HADJ', 'ADMIN_DSI']} />}>
          <Route element={<MainLayout />}>
            <Route path="/parametrage/saisons" element={<SeasonsAdminPage />} />
            <Route path="/parametrage/commissions" element={<EncadreurCommissionsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['ENCADREUR']} />}>
          <Route element={<MainLayout />}>
            <Route path="/visa/encadreur" element={<VisaEncadreurPortalPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
