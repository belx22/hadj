import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { AuthProvider } from '../context/AuthContext';
import { PilgrimProvider } from '../context/PilgrimContext';
import { ToastProvider } from '../context/ToastContext';

// Enrobe un composant/page dans l'ensemble des providers de l'application
// (i18n, router, auth, pèlerin, toasts) pour les tests de rendu.
export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <PilgrimProvider>
            <ToastProvider>{ui}</ToastProvider>
          </PilgrimProvider>
        </AuthProvider>
      </MemoryRouter>
    </I18nextProvider>
  );
}

export { i18n };
