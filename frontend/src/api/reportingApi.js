import axiosClient from './axiosClient';

export async function getReporting(filters) {
  const { data } = await axiosClient.get('/reporting', { params: filters });
  return data;
}
