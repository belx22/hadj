import axiosClient, { USE_MOCK } from './axiosClient';
import {
  mockGetEncadreurs,
  mockCreateEncadreur,
  mockUpdateEncadreur,
  mockImportEncadreurs,
  resetMockDb,
  mockGetSeasons,
  mockGetOfficialPrice,
  mockCreateSeason,
  mockUpdateSeason,
  mockGetUsers,
  mockCreateUser,
  mockUpdateUser,
  mockGetEncadreurCommissions,
} from '../mock/mockApi';

// --- Encadreurs ---
export async function getEncadreurs(options) {
  if (USE_MOCK) return mockGetEncadreurs(options);
  const { data } = await axiosClient.get('/encadreurs', { params: options });
  return data;
}

export async function createEncadreur(payload, actor) {
  if (USE_MOCK) return mockCreateEncadreur(payload, actor);
  const { data } = await axiosClient.post('/encadreurs', payload);
  return data;
}

export async function updateEncadreur(id, updates, actor) {
  if (USE_MOCK) return mockUpdateEncadreur(id, updates, actor);
  const { data } = await axiosClient.put(`/encadreurs/${id}`, updates);
  return data;
}

export async function importEncadreurs(rows, actor) {
  if (USE_MOCK) return mockImportEncadreurs(rows, actor);
  const { data } = await axiosClient.post('/encadreurs/import', { rows });
  return data;
}

// --- Saisons Hadj ---
export async function getSeasons() {
  if (USE_MOCK) return mockGetSeasons();
  const { data } = await axiosClient.get('/saisons');
  return data;
}

export async function getOfficialPrice(season, pilgrimType) {
  if (USE_MOCK) return mockGetOfficialPrice(season, pilgrimType);
  const { data } = await axiosClient.get('/parametrage/prix-officiel', { params: { season, pilgrimType } });
  return data.price;
}

export async function createSeason(payload, actor) {
  if (USE_MOCK) return mockCreateSeason(payload, actor);
  const { data } = await axiosClient.post('/saisons', payload);
  return data;
}

export async function updateSeason(season, updates, actor) {
  if (USE_MOCK) return mockUpdateSeason(season, updates, actor);
  const { data } = await axiosClient.put(`/saisons/${season}`, updates);
  return data;
}

export async function getEncadreurCommissions(season) {
  if (USE_MOCK) return mockGetEncadreurCommissions(season);
  const { data } = await axiosClient.get('/encadreurs/commissions', { params: { season } });
  return data;
}

// --- Utilisateurs ---
export async function getUsers() {
  if (USE_MOCK) return mockGetUsers();
  const { data } = await axiosClient.get('/utilisateurs');
  return data;
}

export async function createUser(payload, actor) {
  if (USE_MOCK) return mockCreateUser(payload, actor);
  const { data } = await axiosClient.post('/utilisateurs', payload);
  return data;
}

export async function updateUser(id, updates, actor) {
  if (USE_MOCK) return mockUpdateUser(id, updates, actor);
  const { data } = await axiosClient.put(`/utilisateurs/${id}`, updates);
  return data;
}

// --- Données de démonstration (mode mock uniquement) ---
export function resetDemoData() {
  if (USE_MOCK) resetMockDb();
}
