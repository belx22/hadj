import axiosClient, { USE_MOCK } from './axiosClient';
import {
  mockPilgrimLogin,
  mockGetEncadreurGroup,
  mockRegisterPilgrimOnline,
  mockCreateVersementOnline,
  mockChangeVisaStatus,
  mockImportVisaStatuses,
  mockCheckStatusAnomalies,
} from '../mock/mockApi';

export async function pilgrimLogin(idNumber, phone) {
  if (USE_MOCK) return mockPilgrimLogin(idNumber, phone);
  const { data } = await axiosClient.post('/visa/pelerin/login', { idNumber, phone });
  return data;
}

export async function getEncadreurGroup(encadreurId) {
  if (USE_MOCK) return mockGetEncadreurGroup(encadreurId);
  const { data } = await axiosClient.get(`/visa/encadreur/${encadreurId}/groupe`);
  return data;
}

export async function registerPilgrimOnline(payload) {
  if (USE_MOCK) return mockRegisterPilgrimOnline(payload);
  const { data } = await axiosClient.post('/bordereaux/inscription-en-ligne', payload);
  return data;
}

export async function createVersementOnline(idNumber, phone, versementPayload) {
  if (USE_MOCK) return mockCreateVersementOnline(idNumber, phone, versementPayload);
  const { data } = await axiosClient.post('/versements', { idNumber, phone, ...versementPayload });
  return data;
}

export async function changeVisaStatus(bordereauId, newStatus, note, actor) {
  if (USE_MOCK) return mockChangeVisaStatus(bordereauId, newStatus, note, actor);
  const { data } = await axiosClient.put(`/visa/${bordereauId}/statut`, { status: newStatus, note });
  return data;
}

export async function importVisaStatuses(rows, actor) {
  if (USE_MOCK) return mockImportVisaStatuses(rows, actor);
  const { data } = await axiosClient.post('/visa/import-statuts', { rows });
  return data;
}

export async function checkStatusAnomalies() {
  if (USE_MOCK) return mockCheckStatusAnomalies();
  const { data } = await axiosClient.get('/visa/verification-bi');
  return data;
}
