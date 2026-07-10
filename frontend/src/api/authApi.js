import axiosClient, { USE_MOCK } from './axiosClient';
import { mockLogin, mockEncadreurLogin, mockRequestPasswordReset, mockResetPasswordWithOtp } from '../mock/mockApi';

export async function login(username, password) {
  if (USE_MOCK) return mockLogin(username, password);
  const { data } = await axiosClient.post('/auth/login', { username, password });
  return data;
}

export async function loginEncadreur(username, password) {
  if (USE_MOCK) return mockEncadreurLogin(username, password);
  const { data } = await axiosClient.post('/auth/login', { username, password });
  return data;
}

// --- Mot de passe oublié (code OTP envoyé par email) ---
export async function requestPasswordReset(identifier) {
  if (USE_MOCK) return mockRequestPasswordReset(identifier);
  const { data } = await axiosClient.post('/auth/mot-de-passe-oublie', { identifier });
  return data;
}

export async function resetPasswordWithOtp(identifier, otp, newPassword) {
  if (USE_MOCK) return mockResetPasswordWithOtp(identifier, otp, newPassword);
  const { data } = await axiosClient.post('/auth/reinitialiser-mot-de-passe', { identifier, otp, newPassword });
  return data;
}
