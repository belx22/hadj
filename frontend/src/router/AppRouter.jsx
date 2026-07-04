import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ui/ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';

import LoginChoicePage from '../pages/auth/LoginChoicePage';
import StaffLoginPage from '../pages/auth/StaffLoginPage';

import DashboardPage from '../pages/dashboard/DashboardPage';
import BordereauListPage from '../pages/bordereau/BordereauListPage';
import BordereauFormPage from '../pages/bordereau/BordereauFormPage';
import AuditLogPage from '../pages/audit/AuditLogPage';

import VisaPelerinLoginPage from '../pages/visa/VisaPelerinLoginPage';
import VisaPelerinDossierPage from '../pages/visa/VisaPelerinDossierPage';
import VisaEncadreurPortalPage from '../pages/visa/VisaEncadreurPortalPage';

import NotFoundPage from '../pages/NotFoundPage';

const ROLE_HOME = {
  SUPERVISEUR: '/dashboard',
  GESTIONNAIRE_HADJ: '/dashboard',
  ADMIN_DSI: '/dashboard',
  OPERATEUR_HADJ: '/bordereaux',
  ENCADREUR: '/visa/encadreur',
};

function HomeRoute() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />;
  }
  return <LoginChoicePage />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login/staff" element={<StaffLoginPage />} />

      <Route path="/visa/pelerin" element={<VisaPelerinLoginPage />} />
      <Route path="/visa/pelerin/dossier" element={<VisaPelerinDossierPage />} />

      <Route element={<ProtectedRoute roles={['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'OPERATEUR_HADJ', 'ADMIN_DSI']} />}>
        <Route element={<MainLayout />}>
          <Route path="/bordereaux" element={<BordereauListPage />} />
          <Route path="/bordereaux/nouveau" element={<BordereauFormPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'ADMIN_DSI']} />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['ADMIN_DSI', 'SUPERVISEUR']} />}>
        <Route element={<MainLayout />}>
          <Route path="/audit" element={<AuditLogPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['ENCADREUR']} />}>
        <Route element={<MainLayout />}>
          <Route path="/visa/encadreur" element={<VisaEncadreurPortalPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
