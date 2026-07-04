import axiosClient, { USE_MOCK } from './axiosClient';
import { mockGetReporting } from '../mock/mockApi';

export async function getReporting(filters) {
  if (USE_MOCK) return mockGetReporting(filters);
  const { data } = await axiosClient.get('/reporting', { params: filters });
  return data;
}
