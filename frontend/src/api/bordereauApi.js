import axiosClient from './axiosClient';

export async function getBordereaux(filters) {
  const { data } = await axiosClient.get('/bordereaux', { params: filters });
  return data;
}

export async function createBordereau(payload) {
  const { data } = await axiosClient.post('/bordereaux', payload);
  return data;
}

export async function checkDuplicate(idNumber, season) {
  const { data } = await axiosClient.get('/bordereaux/check-duplicate', { params: { idNumber, season } });
  return data.duplicate;
}
