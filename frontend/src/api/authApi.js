import axiosClient from './axiosClient';

export async function login(username, password) {
  const { data } = await axiosClient.post('/auth/login', { username, password });
  return data;
}

// Le backend n'expose qu'un seul point d'entrée d'authentification : le portail
// encadreur y accède comme les autres, mais refuse tout compte qui n'est pas un
// encadreur (un agent d'agence ne doit pas entrer par cette porte).
export async function loginEncadreur(username, password) {
  const { data } = await axiosClient.post('/auth/login', { username, password });
  if (data?.user?.role !== 'ENCADREUR') {
    const error = new Error('INVALID_CREDENTIALS');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }
  return data;
}

// --- Mot de passe oublié (code OTP envoyé par email) ---
export async function requestPasswordReset(identifier) {
  const { data } = await axiosClient.post('/auth/mot-de-passe-oublie', { identifier });
  return data;
}

export async function resetPasswordWithOtp(identifier, otp, newPassword) {
  const { data } = await axiosClient.post('/auth/reinitialiser-mot-de-passe', { identifier, otp, newPassword });
  return data;
}
