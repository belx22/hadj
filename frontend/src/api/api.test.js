import { describe, it, expect, beforeEach } from 'vitest';
import { resetMockDb } from '../mock/mockApi';
import * as authApi from './authApi';
import * as bordereauApi from './bordereauApi';
import * as paymentsApi from './paymentsApi';
import * as referenceDataApi from './referenceDataApi';
import * as reportingApi from './reportingApi';
import * as visaApi from './visaApi';
import * as auditApi from './auditApi';
import * as attestationsApi from './attestationsApi';
import { USE_MOCK } from './axiosClient';

const ADMIN = { username: 'admin', role: 'ADMIN_DSI' };

beforeEach(() => resetMockDb());

describe('couche API (délégation vers le mock)', () => {
  it('USE_MOCK est actif en environnement de test', () => {
    expect(USE_MOCK).toBe(true);
  });

  it('authApi délègue login', async () => {
    const res = await authApi.login('admin', 'admin123');
    expect(res.user.role).toBe('ADMIN_DSI');
    await expect(authApi.loginEncadreur('admin', 'admin123')).rejects.toBeDefined();
    expect((await authApi.requestPasswordReset('admin')).sent).toBe(true);
    await expect(authApi.resetPasswordWithOtp('admin', '000000', 'xxxxxx')).rejects.toBeDefined();
  });

  it('bordereauApi délègue lecture, doublon et création', async () => {
    const list = await bordereauApi.getBordereaux();
    expect(list.length).toBeGreaterThan(0);
    expect(await bordereauApi.checkDuplicate('1002345678', 2027)).toBe(true);
    const created = await bordereauApi.createBordereau(
      { pilgrimLastName: 'X', pilgrimFirstName: 'Y', phone: '699000000', idNumber: '8888888888', region: 'Centre', agency: 'Yaoundé - Siège', encadreurId: 'ENC-001', pilgrimType: 'PELERIN', pilgrimCount: 1, season: 2027 },
      ADMIN
    );
    expect(created.id).toMatch(/^BOR-/);
  });

  it('reportingApi délègue le reporting', async () => {
    expect(await reportingApi.getReporting()).toHaveProperty('totalCollected');
  });

  it('referenceDataApi délègue les référentiels', async () => {
    expect((await referenceDataApi.getEncadreurs()).length).toBeGreaterThan(0);
    expect((await referenceDataApi.getSeasons()).length).toBeGreaterThan(0);
    expect(await referenceDataApi.getOfficialPrice(2027, 'PELERIN')).toBeGreaterThan(0);
    expect((await referenceDataApi.getUsers()).length).toBeGreaterThan(0);
    expect(await referenceDataApi.getSmtpSettings()).toBeTruthy();
    expect(Array.isArray(await referenceDataApi.getEncadreurCommissions(2027))).toBe(true);
  });

  it('paymentsApi délègue la lecture des versements et remboursements', async () => {
    expect(Array.isArray(await paymentsApi.getPendingVersements())).toBe(true);
    expect(Array.isArray(await paymentsApi.getVersementsHistory())).toBe(true);
    expect(Array.isArray(await paymentsApi.getRefunds())).toBe(true);
  });

  it('visaApi délègue login pèlerin, groupe et anomalies', async () => {
    const dossier = await visaApi.pilgrimLogin('1002345678', '699112233');
    expect(dossier.idNumber).toBe('1002345678');
    expect(Array.isArray(await visaApi.getEncadreurGroup('ENC-001'))).toBe(true);
    expect(await visaApi.checkStatusAnomalies()).toBeTruthy();
    const found = await visaApi.lookupBeneficiary('1002345678', 2027);
    expect(found.found).toBe(true);
    expect(Array.isArray(await visaApi.getGroupedPayments())).toBe(true);
  });

  it('auditApi et attestationsApi délèguent leurs lectures', async () => {
    expect(Array.isArray(await auditApi.getAuditLogs())).toBe(true);
    expect(await attestationsApi.getPassportDeposits(2027)).toBeTruthy();
  });
});
