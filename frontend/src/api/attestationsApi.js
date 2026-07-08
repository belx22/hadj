import axiosClient, { USE_MOCK } from './axiosClient';
import { mockGetPassportDeposits, mockTogglePassportDeposit } from '../mock/mockApi';

export async function getPassportDeposits(season) {
  if (USE_MOCK) return mockGetPassportDeposits(season);
  const { data } = await axiosClient.get('/attestations/depots-passeports', { params: { season } });
  return data;
}

export async function togglePassportDeposit(bordereauId, deposited, actor) {
  if (USE_MOCK) return mockTogglePassportDeposit(bordereauId, deposited, actor);
  const { data } = await axiosClient.put(`/attestations/depots-passeports/${bordereauId}`, { deposited });
  return data;
}
