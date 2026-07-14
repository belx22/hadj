import axiosClient from './axiosClient';

// --- Encadreurs ---
export async function getEncadreurs(options) {
  const { data } = await axiosClient.get('/encadreurs', { params: options });
  return data;
}

export async function createEncadreur(payload) {
  const { data } = await axiosClient.post('/encadreurs', payload);
  return data;
}

export async function updateEncadreur(id, updates) {
  const { data } = await axiosClient.put(`/encadreurs/${id}`, updates);
  return data;
}

export async function importEncadreurs(rows) {
  const { data } = await axiosClient.post('/encadreurs/import', { rows });
  return data;
}

// --- Saisons Hadj ---
export async function getSeasons() {
  const { data } = await axiosClient.get('/saisons');
  return data;
}

export async function getOfficialPrice(season, pilgrimType, includesEncadreurFees = false) {
  const { data } = await axiosClient.get('/parametrage/prix-officiel', {
    params: { season, pilgrimType, includesEncadreurFees },
  });
  return data.price;
}

export async function createSeason(payload) {
  const { data } = await axiosClient.post('/saisons', payload);
  return data;
}

export async function updateSeason(season, updates) {
  const { data } = await axiosClient.put(`/saisons/${season}`, updates);
  return data;
}

export async function getEncadreurCommissions(season) {
  const { data } = await axiosClient.get('/encadreurs/commissions', { params: { season } });
  return data;
}

// --- Utilisateurs ---
export async function getUsers() {
  const { data } = await axiosClient.get('/utilisateurs');
  return data;
}

export async function createUser(payload) {
  const { data } = await axiosClient.post('/utilisateurs', payload);
  return data;
}

export async function updateUser(id, updates) {
  const { data } = await axiosClient.put(`/utilisateurs/${id}`, updates);
  return data;
}

export async function importUsers(rows) {
  const { data } = await axiosClient.post('/utilisateurs/import', { rows });
  return data;
}

// --- Paramètres SMTP (Admin DSI) ---
export async function getSmtpSettings() {
  const { data } = await axiosClient.get('/parametrage/smtp');
  return data;
}

export async function updateSmtpSettings(settings) {
  const { data } = await axiosClient.put('/parametrage/smtp', settings);
  return data;
}
