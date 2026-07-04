import axiosClient, { USE_MOCK } from './axiosClient';
import { mockGetPendingVersements, mockValidateVersement, mockRejectVersement } from '../mock/mockApi';

export async function getPendingVersements() {
  if (USE_MOCK) return mockGetPendingVersements();
  const { data } = await axiosClient.get('/versements/en-attente');
  return data;
}

export async function validateVersement(bordereauId, versementId, actor) {
  if (USE_MOCK) return mockValidateVersement(bordereauId, versementId, actor);
  const { data } = await axiosClient.put(`/versements/${versementId}/valider`, { bordereauId });
  return data;
}

export async function rejectVersement(bordereauId, versementId, reason, actor) {
  if (USE_MOCK) return mockRejectVersement(bordereauId, versementId, reason, actor);
  const { data } = await axiosClient.put(`/versements/${versementId}/rejeter`, { bordereauId, reason });
  return data;
}
