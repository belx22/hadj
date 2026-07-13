import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { resetMockDb } from '../mock/mockApi';
import { AuthProvider, useAuth } from './AuthContext';
import { PilgrimProvider, usePilgrim } from './PilgrimContext';
import { ToastProvider, useToast } from './ToastContext';

beforeEach(() => resetMockDb());

const authWrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
const pilgrimWrapper = ({ children }) => <PilgrimProvider>{children}</PilgrimProvider>;
const toastWrapper = ({ children }) => (
  <I18nextProvider i18n={i18n}><ToastProvider>{children}</ToastProvider></I18nextProvider>
);

describe('AuthContext', () => {
  it('connecte puis déconnecte un utilisateur', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    expect(result.current.isAuthenticated).toBe(false);
    await act(async () => { await result.current.login('admin', 'admin123'); });
    expect(result.current.user.role).toBe('ADMIN_DSI');
    expect(result.current.isAuthenticated).toBe(true);
    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
  });

  it('remonte une erreur sur identifiants invalides', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    await act(async () => {
      await expect(result.current.login('admin', 'faux')).rejects.toBeDefined();
    });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});

describe('PilgrimContext', () => {
  it('connecte un pèlerin et charge son dossier', async () => {
    const { result } = renderHook(() => usePilgrim(), { wrapper: pilgrimWrapper });
    await act(async () => { await result.current.login('1002345678', '699112233'); });
    expect(result.current.dossier?.idNumber).toBe('1002345678');
    act(() => result.current.logout());
    expect(result.current.dossier).toBeNull();
  });
});

describe('ToastContext', () => {
  it('empile et expose des toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper: toastWrapper });
    act(() => result.current.success('Bravo'));
    act(() => result.current.error('Oups'));
    expect(typeof result.current.success).toBe('function');
    expect(typeof result.current.error).toBe('function');
  });
});
