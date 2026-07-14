import axiosClient from './axiosClient';

export async function pilgrimLogin(idNumber, phone) {
  const { data } = await axiosClient.post('/visa/pelerin/login', { idNumber, phone });
  return data;
}

export async function getEncadreurGroup(encadreurId) {
  const { data } = await axiosClient.get(`/visa/encadreur/${encadreurId}/groupe`);
  return data;
}

export async function registerPilgrimOnline(payload) {
  const { data } = await axiosClient.post('/bordereaux/inscription-en-ligne', payload);
  return data;
}

export async function createVersementOnline(idNumber, phone, versementPayload) {
  const { data } = await axiosClient.post('/versements', { idNumber, phone, ...versementPayload });
  return data;
}

export async function changeVisaStatus(bordereauId, newStatus, note) {
  const { data } = await axiosClient.put(`/visa/${bordereauId}/statut`, { status: newStatus, note });
  return data;
}

export async function bulkChangeVisaStatus(payload) {
  const { data } = await axiosClient.put('/visa/statut-en-masse', payload);
  return data;
}

export async function importVisaStatuses(rows, encadreurId = null) {
  const { data } = await axiosClient.post('/visa/import-statuts', { rows, encadreurId });
  return data;
}

export async function checkStatusAnomalies() {
  const { data } = await axiosClient.get('/visa/verification-bi');
  return data;
}

export async function registerPilgrimByEncadreur(payload, encadreurId) {
  const { data } = await axiosClient.post('/visa/encadreur/inscription', { ...payload, encadreurId });
  return data;
}

export async function importPilgrims(rows, encadreurId) {
  const { data } = await axiosClient.post(`/visa/encadreur/${encadreurId}/import`, { rows });
  return data;
}

export async function lookupBeneficiary(idNumber, season) {
  const { data } = await axiosClient.get(`/versements/beneficiaire/${idNumber}`, { params: { season } });
  return data;
}

export async function createGroupedVersementOnline(payerIdNumber, payerPhone, payload) {
  const { data } = await axiosClient.post('/versements/groupe', { payerIdNumber, payerPhone, ...payload });
  return data;
}

export async function getGroupedPayments() {
  const { data } = await axiosClient.get('/versements/groupes');
  return data;
}

export async function importGroupedVersementsByEncadreur(rows, encadreurId, payload) {
  const { data } = await axiosClient.post(`/visa/encadreur/${encadreurId}/import-versement-groupe`, { rows, ...payload });
  return data;
}
