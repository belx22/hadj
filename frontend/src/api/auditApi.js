import axiosClient from './axiosClient';

export async function getAuditLogs() {
  const { data } = await axiosClient.get('/audit');
  return data;
}
