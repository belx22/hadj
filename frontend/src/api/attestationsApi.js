import axiosClient from './axiosClient';

export async function getPassportDeposits(season) {
  const { data } = await axiosClient.get('/attestations/depots-passeports', { params: { season } });
  return data;
}

export async function togglePassportDeposit(bordereauId, deposited) {
  const { data } = await axiosClient.put(`/attestations/depots-passeports/${bordereauId}`, { deposited });
  return data;
}

export async function importPassportDeposits(rows, season) {
  const { data } = await axiosClient.post('/attestations/depots-passeports/import', { rows, season });
  return data;
}
