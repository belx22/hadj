import axiosClient, { USE_MOCK } from './axiosClient';
import {
  mockGetPendingVersements,
  mockGetVersementsHistory,
  mockValidateVersement,
  mockBulkValidateVersements,
  mockRejectVersement,
  mockGetRefunds,
  mockProcessRefund,
} from '../mock/mockApi';

export async function getPendingVersements() {
  if (USE_MOCK) return mockGetPendingVersements();
  const { data } = await axiosClient.get('/versements/en-attente');
  return data;
}

export async function getVersementsHistory(filters) {
  if (USE_MOCK) return mockGetVersementsHistory(filters);
  const { data } = await axiosClient.get('/versements/historique', { params: filters });
  return data;
}

export async function validateVersement(bordereauId, versementId, actor) {
  if (USE_MOCK) return mockValidateVersement(bordereauId, versementId, actor);
  const { data } = await axiosClient.put(`/versements/${versementId}/valider`, { bordereauId });
  return data;
}

export async function bulkValidateVersements(items, actor) {
  if (USE_MOCK) return mockBulkValidateVersements(items, actor);
  const { data } = await axiosClient.put('/versements/valider-en-masse', { items });
  return data;
}

export async function rejectVersement(bordereauId, versementId, reason, actor) {
  if (USE_MOCK) return mockRejectVersement(bordereauId, versementId, reason, actor);
  const { data } = await axiosClient.put(`/versements/${versementId}/rejeter`, { bordereauId, reason });
  return data;
}

export async function getRefunds() {
  if (USE_MOCK) return mockGetRefunds();
  const { data } = await axiosClient.get('/versements/remboursements');
  return data;
}

export async function processRefund(bordereauId, versementId, payload, actor) {
  if (USE_MOCK) return mockProcessRefund(bordereauId, versementId, payload, actor);
  const { data } = await axiosClient.put(`/versements/${versementId}/rembourser`, { bordereauId, ...payload });
  return data;
}
