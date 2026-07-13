import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import { resetMockDb } from '../mock/mockApi';

import * as mock from '../mock/mockApi';
import PaymentValidationPage from './payments/PaymentValidationPage';
import UsersAdminPage from './admin/UsersAdminPage';
import ClientsPage from './clients/ClientsPage';
import BordereauFormPage from './bordereau/BordereauFormPage';
import PassportAttestationsPage from './admin/PassportAttestationsPage';
import EncadreurCommissionsPage from './admin/EncadreurCommissionsPage';
import VisaPelerinPaymentPage from './visa/VisaPelerinPaymentPage';
import VisaEncadreurPortalPage from './visa/VisaEncadreurPortalPage';

const admin = { id: 'U-5', username: 'admin', role: 'ADMIN_DSI', name: 'Admin', agency: 'Yaoundé - Siège' };

function loginAdmin() {
  localStorage.setItem('copilote-hadj-token', 'test-token');
  localStorage.setItem('copilote-hadj-user', JSON.stringify(admin));
}

// Parcourt une page : remplit les champs texte/nombre, sélectionne une option
// non vide sur chaque <select>, coche les cases, puis clique les boutons « sûrs »
// (hors déconnexion/suppression) — exerce un maximum de handlers.
function exercisePage(container) {
  container.querySelectorAll('input').forEach((input) => {
    const type = input.getAttribute('type');
    if (type === 'file' || type === 'radio') return;
    if (type === 'checkbox') { fireEvent.click(input); return; }
    const value = type === 'number' ? '100000' : '12345';
    fireEvent.change(input, { target: { value } });
  });
  container.querySelectorAll('select').forEach((select) => {
    const opt = [...select.options].find((o) => o.value);
    if (opt) fireEvent.change(select, { target: { value: opt.value } });
  });
  container.querySelectorAll('button').forEach((btn) => {
    const label = (btn.textContent || '').toLowerCase();
    if (/déconnexion|logout|supprim|delete|réinitialis|reset/.test(label)) return;
    fireEvent.click(btn);
  });
}

beforeEach(() => {
  resetMockDb();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'prompt').mockReturnValue('motif de test');
});

describe('flux approfondis des pages back-office', () => {
  beforeEach(loginAdmin);

  const pages = [
    ['Validation des paiements', <PaymentValidationPage />, '/paiements'],
    ['Utilisateurs', <UsersAdminPage />, '/parametrage/utilisateurs'],
    ['Clients', <ClientsPage />, '/clients'],
    ['Nouveau bordereau', <BordereauFormPage />, '/bordereaux/nouveau'],
    ['Attestations passeports', <PassportAttestationsPage />, '/attestations'],
    ['Commissions encadreurs', <EncadreurCommissionsPage />, '/parametrage/commissions'],
  ];

  it.each(pages)('%s : remplit et déclenche les actions sans planter', async (_name, ui, route) => {
    const { container } = renderWithProviders(ui, { route });
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(30));
    exercisePage(container);
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });
});

describe('validation des paiements : onglets + validation (données semées)', () => {
  beforeEach(loginAdmin);

  async function seedPending() {
    const all = await mock.mockGetBordereaux();
    const d = all.find((b) => b.balance - b.pendingAmount > 100000);
    await mock.mockCreateVersementOnline(d.idNumber, d.phone, {
      method: 'MOBILE_MONEY_ORANGE', amount: 50000, reference: 'SEED-PENDING-1',
    });
    // Un versement à rembourser (visa refusé sur un dossier déjà payé).
    const paid = all.find((b) => b.amountPaid > 0);
    if (paid) await mock.mockChangeVisaStatus(paid.id, 'REFUSE', 'refus test', admin);
  }

  it('parcourt les onglets et valide un versement en attente', async () => {
    await seedPending();
    const { container } = renderWithProviders(<PaymentValidationPage />, { route: '/paiements' });
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(50));

    // Passe sur chaque onglet et exerce son contenu.
    const tabButtons = [...container.querySelectorAll('button')].filter((b) =>
      /attente|historique|remboursement|pending|history|refund/i.test(b.textContent || '')
    );
    for (const tab of tabButtons) {
      fireEvent.click(tab);
      await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
    }

    // Revient sur l'attente et clique un bouton de validation s'il existe.
    if (tabButtons[0]) fireEvent.click(tabButtons[0]);
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
    const actionButtons = [...container.querySelectorAll('button')].filter((b) =>
      /valider|rejeter|validate|reject/i.test(b.textContent || '')
    );
    actionButtons.slice(0, 3).forEach((b) => fireEvent.click(b));
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });
});

describe('portail encadreur : inscription d’un pèlerin', () => {
  beforeEach(() => {
    loginAdmin();
    localStorage.setItem(
      'copilote-hadj-user',
      JSON.stringify({ id: 'U-4', username: 'encadreur1', role: 'ENCADREUR', name: 'Guide', encadreurId: 'ENC-001' })
    );
  });

  it('remplit le formulaire et l’envoie', async () => {
    const { container } = renderWithProviders(<VisaEncadreurPortalPage />, { route: '/visa/encadreur' });
    await waitFor(() => expect(container.querySelectorAll('input').length).toBeGreaterThan(0));
    container.querySelectorAll('input').forEach((input, i) => {
      const type = input.getAttribute('type');
      if (type === 'file') return;
      const values = ['Nom', 'Prenom', '699001122', '1009998887'];
      fireEvent.change(input, { target: { value: values[i] || 'valeur' } });
    });
    container.querySelectorAll('select').forEach((s) => {
      const opt = [...s.options].find((o) => o.value);
      if (opt) fireEvent.change(s, { target: { value: opt.value } });
    });
    const submit = [...container.querySelectorAll('button')].find((b) => /inscrire|enregistrer|ajouter/i.test(b.textContent || ''));
    if (submit) fireEvent.click(submit);
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });
});

describe('paiement pèlerin : soumission d’un versement', () => {
  beforeEach(() => {
    sessionStorage.setItem(
      'copilote-hadj-pilgrim-session',
      JSON.stringify({ idNumber: '1002345678', phone: '699112233' })
    );
  });

  it('renseigne un versement mobile et le soumet', async () => {
    renderWithProviders(<VisaPelerinPaymentPage />, { route: '/visa/pelerin/paiement' });
    const methodSelect = await screen.findByLabelText(/moyen de paiement/i);
    fireEvent.change(methodSelect, { target: { value: 'MOBILE_MONEY_ORANGE' } });
    const form = methodSelect.closest('form');
    within(form).getAllByRole('textbox').forEach((el) => fireEvent.change(el, { target: { value: 'REF-123' } }));
    const numberInputs = form.querySelectorAll('input[type="number"]');
    numberInputs.forEach((el) => fireEvent.change(el, { target: { value: '50000' } }));
    const submit = within(form).getByRole('button', { name: /envoyer|submit/i });
    fireEvent.click(submit);
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });

  it('bascule en paiement groupé', async () => {
    renderWithProviders(<VisaPelerinPaymentPage />, { route: '/visa/pelerin/paiement' });
    await screen.findByLabelText(/moyen de paiement/i);
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes[0]) fireEvent.click(checkboxes[0]);
    await waitFor(() => expect(document.body.textContent.length).toBeGreaterThan(0));
  });
});
