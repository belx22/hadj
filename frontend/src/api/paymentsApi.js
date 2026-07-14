import axiosClient from './axiosClient';

export async function getPendingVersements() {
  const { data } = await axiosClient.get('/versements/en-attente');
  return data;
}

export async function getVersementsHistory(filters) {
  const { data } = await axiosClient.get('/versements/historique', { params: filters });
  return data;
}

export async function validateVersement(bordereauId, versementId) {
  const { data } = await axiosClient.put(`/versements/${versementId}/valider`, { bordereauId });
  return data;
}

export async function bulkValidateVersements(items) {
  const { data } = await axiosClient.put('/versements/valider-en-masse', { items });
  return data;
}

export async function importPaymentStatuses(rows) {
  const { data } = await axiosClient.post('/versements/import-statuts', { rows });
  return data;
}

export async function rejectVersement(bordereauId, versementId, reason) {
  const { data } = await axiosClient.put(`/versements/${versementId}/rejeter`, { bordereauId, reason });
  return data;
}

export async function getRefunds() {
  const { data } = await axiosClient.get('/versements/remboursements');
  return data;
}

export async function processRefund(bordereauId, versementId, payload) {
  const { data } = await axiosClient.put(`/versements/${versementId}/rembourser`, { bordereauId, ...payload });
  return data;
}
