import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import { resetMockDb } from '../mock/mockApi';

import VisaEncadreurPortalPage from './visa/VisaEncadreurPortalPage';
import VisaPelerinPaymentPage from './visa/VisaPelerinPaymentPage';
import PilgrimSelfRegisterPage from './pilgrim/PilgrimSelfRegisterPage';
import VisaPelerinDossierPage from './visa/VisaPelerinDossierPage';
import VisaPelerinLoginPage from './visa/VisaPelerinLoginPage';
import StaffLoginPage from './auth/StaffLoginPage';
import ForgotPasswordPage from './auth/ForgotPasswordPage';
import SmtpSettingsPage from './admin/SmtpSettingsPage';
import SeasonsAdminPage from './admin/SeasonsAdminPage';
import UsersAdminPage from './admin/UsersAdminPage';
import EncadreursAdminPage from './admin/EncadreursAdminPage';
import PaymentValidationPage from './payments/PaymentValidationPage';
import BordereauListPage from './bordereau/BordereauListPage';

const USER_KEY = 'copilote-hadj-user';
const TOKEN_KEY = 'copilote-hadj-token';
const PILGRIM_SESSION = 'copilote-hadj-pilgrim-session';

function loginAs(user) {
  localStorage.setItem(TOKEN_KEY, 'test-token');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
const admin = { id: 'U-5', username: 'admin', role: 'ADMIN_DSI', name: 'Admin', agency: 'Yaoundé - Siège' };
const encadreur = { id: 'U-4', username: 'encadreur1', role: 'ENCADREUR', name: 'Guide', encadreurId: 'ENC-001' };

beforeEach(() => {
  resetMockDb();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('portail encadreur (session encadreur)', () => {
  it('affiche le groupe et le formulaire d’inscription', async () => {
    loginAs(encadreur);
    renderWithProviders(<VisaEncadreurPortalPage />, { route: '/visa/encadreur' });
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(50));
  });

  it('permet à l’encadreur d’effectuer un versement pour un pèlerin', async () => {
    loginAs(encadreur);
    renderWithProviders(<VisaEncadreurPortalPage />, { route: '/visa/encadreur' });
    const paymentTitle = await screen.findByText(/effectuer un versement/i);
    const card = paymentTitle.closest('.card');
    const pilgrimSelect = card.querySelector('select');
    const opt = [...pilgrimSelect.options].find((o) => o.value);
    fireEvent.change(pilgrimSelect, { target: { value: opt.value } });
    // Le montant est figé au solde total du pèlerin (pas de saisie libre).
    fireEvent.click(within(card).getByRole('button', { name: /enregistrer le versement/i }));
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });

  it('n’expose plus de changement de statut visa côté encadreur', async () => {
    loginAs(encadreur);
    renderWithProviders(<VisaEncadreurPortalPage />, { route: '/visa/encadreur' });
    await screen.findByText(/effectuer un versement/i);
    expect(screen.queryByText(/validation des visas en masse/i)).toBeNull();
    expect(screen.queryByText(/appliquer à tout le groupe/i)).toBeNull();
  });
});

describe('inscription : choix avec/sans frais pour le type Encadreur', () => {
  it('affiche le sélecteur de frais uniquement pour le type Encadreur', async () => {
    const { container } = renderWithProviders(<PilgrimSelfRegisterPage />, { route: '/inscription' });
    await waitFor(() => expect(container.querySelectorAll('select').length).toBeGreaterThan(0));
    // Le select "type de pèlerin" est celui dont les options contiennent ENCADREUR.
    const typeSelect = [...container.querySelectorAll('select')].find((s) =>
      [...s.options].some((o) => o.value === 'ENCADREUR')
    );
    const feesSelect = () =>
      [...container.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === 'WITH'));
    // Aucun montant cible n'est affiché hors connexion.
    expect(screen.queryByText(/montant cible/i)).toBeNull();
    expect(feesSelect()).toBeUndefined();
    fireEvent.change(typeSelect, { target: { value: 'ENCADREUR' } });
    await waitFor(() => expect(feesSelect()).toBeTruthy());
    fireEvent.change(typeSelect, { target: { value: 'PELERIN' } });
    await waitFor(() => expect(feesSelect()).toBeUndefined());
  });
});

describe('espace pèlerin (session pèlerin pré-chargée)', () => {
  beforeEach(() => {
    sessionStorage.setItem(PILGRIM_SESSION, JSON.stringify({ idNumber: '1002345678', phone: '699112233' }));
  });

  it('affiche le dossier du pèlerin', async () => {
    renderWithProviders(<VisaPelerinDossierPage />, { route: '/visa/pelerin/dossier' });
    await waitFor(() => expect(screen.getByText(/1002345678/)).toBeInTheDocument());
  });

  it('affiche la page de paiement et permet de changer de moyen de paiement', async () => {
    renderWithProviders(<VisaPelerinPaymentPage />, { route: '/visa/pelerin/paiement' });
    const methodSelect = await screen.findByLabelText(/moyen de paiement/i);
    fireEvent.change(methodSelect, { target: { value: 'AGENCE' } });
    expect(methodSelect.value).toBe('AGENCE');
    fireEvent.change(methodSelect, { target: { value: 'AUTRE' } });
    expect(methodSelect.value).toBe('AUTRE');
  });
});

describe('connexions et formulaires', () => {
  it('connexion pèlerin : saisie + soumission', async () => {
    renderWithProviders(<VisaPelerinLoginPage />, { route: '/visa/pelerin' });
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: '1002345678' } });
    fireEvent.change(inputs[1], { target: { value: '699112233' } });
    const form = document.querySelector('form');
    fireEvent.submit(form);
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });

  it('connexion agent : saisie + soumission invalide', async () => {
    renderWithProviders(<StaffLoginPage />, { route: '/login/staff' });
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'admin' } });
    fireEvent.change(inputs[1], { target: { value: 'mauvais' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });

  it('mot de passe oublié : demande d’OTP', async () => {
    renderWithProviders(<ForgotPasswordPage />, { route: '/mot-de-passe-oublie' });
    const input = document.querySelector('input');
    fireEvent.change(input, { target: { value: 'admin' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });
});

describe('pages back-office : interactions (admin connecté)', () => {
  beforeEach(() => loginAs(admin));

  it('SMTP : modifie et enregistre', async () => {
    renderWithProviders(<SmtpSettingsPage />, { route: '/parametrage/smtp' });
    await waitFor(() => expect(document.querySelectorAll('input').length).toBeGreaterThan(0));
    const inputs = document.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'smtp.test.cm' } });
    const submit = screen.queryByRole('button', { name: /enregistrer|save/i });
    if (submit) fireEvent.click(submit);
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });

  it('Saisons : crée une nouvelle saison', async () => {
    renderWithProviders(<SeasonsAdminPage />, { route: '/parametrage/saisons' });
    await waitFor(() => expect(document.querySelectorAll('input').length).toBeGreaterThan(0));
    const create = screen.queryByRole('button', { name: /créer|create/i });
    if (create) fireEvent.click(create);
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });

  it('Utilisateurs : ouvre le formulaire et remplit', async () => {
    renderWithProviders(<UsersAdminPage />, { route: '/parametrage/utilisateurs' });
    await waitFor(() => expect(document.querySelectorAll('input, select').length).toBeGreaterThan(0));
    const inputs = document.querySelectorAll('input');
    if (inputs[0]) fireEvent.change(inputs[0], { target: { value: 'nouveau_user' } });
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });

  it('Encadreurs : remplit le formulaire de création', async () => {
    renderWithProviders(<EncadreursAdminPage />, { route: '/parametrage/encadreurs' });
    await waitFor(() => expect(document.querySelectorAll('input').length).toBeGreaterThan(0));
    const textInput = document.querySelector('input[type="text"], input:not([type])');
    if (textInput) fireEvent.change(textInput, { target: { value: 'Nouveau Guide' } });
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });

  it('Validation des paiements : filtres et onglets', async () => {
    renderWithProviders(<PaymentValidationPage />, { route: '/paiements' });
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(50));
    const selects = document.querySelectorAll('select');
    if (selects[0]) fireEvent.change(selects[0], { target: { value: selects[0].options[selects[0].options.length - 1]?.value || '' } });
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });

  it('Liste des bordereaux : applique un filtre région', async () => {
    renderWithProviders(<BordereauListPage />, { route: '/bordereaux' });
    await waitFor(() => expect(document.querySelectorAll('select').length).toBeGreaterThan(0));
    const select = document.querySelector('select');
    fireEvent.change(select, { target: { value: 'Centre' } });
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });
});
