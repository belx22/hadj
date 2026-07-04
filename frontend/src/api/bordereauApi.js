import axiosClient, { USE_MOCK } from './axiosClient';
import {
  mockGetBordereaux,
  mockCreateBordereau,
  mockCheckDuplicate,
  mockGetEncadreurs,
  mockGetOfficialPrice,
  mockSetOfficialPrice,
  mockGetSeasons,
} from '../mock/mockApi';

export async function getBordereaux(filters) {
  if (USE_MOCK) return mockGetBordereaux(filters);
  const { data } = await axiosClient.get('/bordereaux', { params: filters });
  return data;
}

export async function createBordereau(payload, actor) {
  if (USE_MOCK) return mockCreateBordereau(payload, actor);
  const { data } = await axiosClient.post('/bordereaux', payload);
  return data;
}

export async function checkDuplicate(idNumber, season) {
  if (USE_MOCK) return mockCheckDuplicate(idNumber, season);
  const { data } = await axiosClient.get('/bordereaux/check-duplicate', { params: { idNumber, season } });
  return data.duplicate;
}

export async function getEncadreurs() {
  if (USE_MOCK) return mockGetEncadreurs();
  const { data } = await axiosClient.get('/encadreurs');
  return data;
}

export async function getOfficialPrice(season) {
  if (USE_MOCK) return mockGetOfficialPrice(season);
  const { data } = await axiosClient.get('/parametrage/prix-officiel', { params: { season } });
  return data.price;
}

export async function setOfficialPrice(season, price, actor) {
  if (USE_MOCK) return mockSetOfficialPrice(season, price, actor);
  const { data } = await axiosClient.put('/parametrage/prix-officiel', { season, price });
  return data;
}

export async function getSeasons() {
  if (USE_MOCK) return mockGetSeasons();
  const { data } = await axiosClient.get('/saisons');
  return data;
}
