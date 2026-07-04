import axiosClient, { USE_MOCK } from './axiosClient';
import { mockGetAuditLogs } from '../mock/mockApi';

export async function getAuditLogs() {
  if (USE_MOCK) return mockGetAuditLogs();
  const { data } = await axiosClient.get('/audit');
  return data;
}
