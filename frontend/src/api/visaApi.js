import axiosClient, { USE_MOCK } from './axiosClient';
import { mockPilgrimLogin, mockGetEncadreurGroup } from '../mock/mockApi';

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
