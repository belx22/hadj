import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import { resetMockDb } from '../mock/mockApi';

import NotFoundPage from './NotFoundPage';
import LoginChoicePage from './auth/LoginChoicePage';
import StaffLoginPage from './auth/StaffLoginPage';
import ForgotPasswordPage from './auth/ForgotPasswordPage';
import PilgrimSelfRegisterPage from './pilgrim/PilgrimSelfRegisterPage';
import VisaPelerinLoginPage from './visa/VisaPelerinLoginPage';
import VisaPelerinDossierPage from './visa/VisaPelerinDossierPage';
import VisaPelerinPaymentPage from './visa/VisaPelerinPaymentPage';
import VisaPelerinEncadreurPage from './visa/VisaPelerinEncadreurPage';
import BordereauListPage from './bordereau/BordereauListPage';
import BordereauFormPage from './bordereau/BordereauFormPage';
import ClientsPage from './clients/ClientsPage';
import PaymentValidationPage from './payments/PaymentValidationPage';
import AuditLogPage from './audit/AuditLogPage';
import EncadreursAdminPage from './admin/EncadreursAdminPage';
import EncadreurCommissionsPage from './admin/EncadreurCommissionsPage';
import PassportAttestationsPage from './admin/PassportAttestationsPage';
import SeasonsAdminPage from './admin/SeasonsAdminPage';
import SmtpSettingsPage from './admin/SmtpSettingsPage';
import UsersAdminPage from './admin/UsersAdminPage';
import PowerBiConnectorPage from './admin/PowerBiConnectorPage';

// Authentifie un admin (l'AuthProvider lit le user depuis localStorage à l'init)
// pour que les pages back-office s'affichent avec un rôle valide.
function loginAdmin() {
  localStorage.setItem('copilote-hadj-token', 'test-token');
  localStorage.setItem(
    'copilote-hadj-user',
    JSON.stringify({ id: 'U-5', username: 'admin', role: 'ADMIN_DSI', name: 'Admin Test', agency: 'Yaoundé - Siège' })
  );
}

beforeEach(() => {
  resetMockDb();
  // recharts (Dashboard/Clients) : jsdom n'a pas de layout, on neutralise le bruit.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const publicPages = [
  ['NotFoundPage', <NotFoundPage />],
  ['LoginChoicePage', <LoginChoicePage />],
  ['StaffLoginPage', <StaffLoginPage />],
  ['ForgotPasswordPage', <ForgotPasswordPage />],
  ['PilgrimSelfRegisterPage', <PilgrimSelfRegisterPage />],
  ['VisaPelerinLoginPage', <VisaPelerinLoginPage />],
  // Sans dossier chargé, ces pages redirigent (Navigate) sans planter.
  ['VisaPelerinDossierPage', <VisaPelerinDossierPage />],
  ['VisaPelerinPaymentPage', <VisaPelerinPaymentPage />],
  ['VisaPelerinEncadreurPage', <VisaPelerinEncadreurPage />],
];

const adminPages = [
  ['BordereauListPage', <BordereauListPage />],
  ['BordereauFormPage', <BordereauFormPage />],
  ['ClientsPage', <ClientsPage />],
  ['PaymentValidationPage', <PaymentValidationPage />],
  ['AuditLogPage', <AuditLogPage />],
  ['EncadreursAdminPage', <EncadreursAdminPage />],
  ['EncadreurCommissionsPage', <EncadreurCommissionsPage />],
  ['PassportAttestationsPage', <PassportAttestationsPage />],
  ['SeasonsAdminPage', <SeasonsAdminPage />],
  ['SmtpSettingsPage', <SmtpSettingsPage />],
  ['UsersAdminPage', <UsersAdminPage />],
  ['PowerBiConnectorPage', <PowerBiConnectorPage />],
];

describe('pages publiques (smoke)', () => {
  it.each(publicPages)('%s se rend sans planter', async (_name, ui) => {
    const { container } = renderWithProviders(ui);
    await waitFor(() => expect(container).toBeTruthy());
  });
});

describe('pages back-office (smoke, admin connecté)', () => {
  beforeEach(loginAdmin);

  it.each(adminPages)('%s se rend sans planter', async (_name, ui) => {
    const { container } = renderWithProviders(ui);
    // Laisse les effets asynchrones (fetch mock) se résoudre.
    await waitFor(() => expect(container.querySelector('*')).toBeTruthy());
  });
});
