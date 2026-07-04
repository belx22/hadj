import axiosClient, { USE_MOCK } from './axiosClient';
import { mockGetBordereaux, mockCreateBordereau, mockCheckDuplicate } from '../mock/mockApi';

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
