import axiosClient, { USE_MOCK } from './axiosClient';
import {
  mockPilgrimLogin,
  mockGetEncadreurGroup,
  mockRegisterPilgrimOnline,
  mockCreateVersementOnline,
  mockChangeVisaStatus,
  mockBulkChangeVisaStatus,
  mockImportVisaStatuses,
  mockCheckStatusAnomalies,
  mockRegisterPilgrimByEncadreur,
  mockImportPilgrims,
  mockLookupBeneficiary,
  mockCreateGroupedVersementOnline,
  mockGetGroupedPayments,
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

export async function bulkChangeVisaStatus(payload, actor) {
  if (USE_MOCK) return mockBulkChangeVisaStatus(payload, actor);
  const { data } = await axiosClient.put('/visa/statut-en-masse', payload);
  return data;
}

export async function importVisaStatuses(rows, actor, encadreurId = null) {
  if (USE_MOCK) return mockImportVisaStatuses(rows, actor, encadreurId);
  const { data } = await axiosClient.post('/visa/import-statuts', { rows, encadreurId });
  return data;
}

export async function checkStatusAnomalies() {
  if (USE_MOCK) return mockCheckStatusAnomalies();
  const { data } = await axiosClient.get('/visa/verification-bi');
  return data;
}

export async function registerPilgrimByEncadreur(payload, encadreurId, actor) {
  if (USE_MOCK) return mockRegisterPilgrimByEncadreur(payload, encadreurId, actor);
  const { data } = await axiosClient.post('/visa/encadreur/inscription', { ...payload, encadreurId });
  return data;
}

export async function importPilgrims(rows, encadreurId, actor) {
  if (USE_MOCK) return mockImportPilgrims(rows, encadreurId, actor);
  const { data } = await axiosClient.post(`/visa/encadreur/${encadreurId}/import`, { rows });
  return data;
}

export async function lookupBeneficiary(idNumber, season) {
  if (USE_MOCK) return mockLookupBeneficiary(idNumber, season);
  const { data } = await axiosClient.get(`/versements/beneficiaire/${idNumber}`, { params: { season } });
  return data;
}

export async function createGroupedVersementOnline(payerIdNumber, payerPhone, payload) {
  if (USE_MOCK) return mockCreateGroupedVersementOnline(payerIdNumber, payerPhone, payload);
  const { data } = await axiosClient.post('/versements/groupe', { payerIdNumber, payerPhone, ...payload });
  return data;
}

export async function getGroupedPayments() {
  if (USE_MOCK) return mockGetGroupedPayments();
  const { data } = await axiosClient.get('/versements/groupes');
  return data;
}
