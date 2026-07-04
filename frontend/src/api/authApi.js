import axiosClient, { USE_MOCK } from './axiosClient';
import { mockLogin, mockEncadreurLogin } from '../mock/mockApi';

export async function login(username, password) {
  if (USE_MOCK) return mockLogin(username, password);
  const { data } = await axiosClient.post('/auth/login', { username, password });
  return data;
}

export async function loginEncadreur(username, password) {
  if (USE_MOCK) return mockEncadreurLogin(username, password);
  const { data } = await axiosClient.post('/auth/login', { username, password });
  return data;
}
