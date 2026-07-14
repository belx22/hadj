import { describe, it, expect } from 'vitest';
import * as authApi from './authApi';
import * as bordereauApi from './bordereauApi';
import * as paymentsApi from './paymentsApi';
import * as referenceDataApi from './referenceDataApi';
import * as reportingApi from './reportingApi';
import * as visaApi from './visaApi';
import * as auditApi from './auditApi';
import * as attestationsApi from './attestationsApi';

const ADMIN = { username: 'admin', role: 'ADMIN_DSI' };

// La couche API ne fait que du HTTP : ces tests l'exercent de bout en bout
// (axios + intercepteurs) contre le faux backend branché dans src/test/setup.js.
// Ils vérifient donc le contrat réel : URL appelée, forme de la réponse, code
// d'erreur applicatif remonté.
describe('couche API (contrat HTTP)', () => {
  it('authApi expose le login et le mot de passe oublié', async () => {
    const res = await authApi.login('admin', 'admin123');
    expect(res.user.role).toBe('ADMIN_DSI');
    expect(res.token).toBeTruthy();
    expect((await authApi.requestPasswordReset('admin')).sent).toBe(true);
    await expect(authApi.resetPasswordWithOtp('admin', '000000', 'xxxxxx')).rejects.toBeDefined();
  });

  it("le portail encadreur refuse un compte qui n'est pas encadreur", async () => {
    const res = await authApi.loginEncadreur('encadreur1', 'encadreur123');
    expect(res.user.encadreurId).toBe('ENC-001');
    await expect(authApi.loginEncadreur('admin', 'admin123')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('remonte le code applicatif du backend sur une erreur', async () => {
    // Doublon de pèlerin : le backend répond 409 { code: DUPLICATE_PILGRIM } et
    // l'intercepteur doit exposer ce code sur `error.code`.
    const dossier = { pilgrimLastName: 'X', pilgrimFirstName: 'Y', phone: '699777777', idNumber: '1002345678', region: 'Centre', agency: 'Yaoundé - Siège', encadreurId: 'ENC-001', pilgrimType: 'PELERIN', pilgrimCount: 1, season: 2027 };
    await expect(bordereauApi.createBordereau(dossier, ADMIN)).rejects.toMatchObject({
      code: 'DUPLICATE_PILGRIM',
    });
  });

  it('bordereauApi lit, détecte les doublons et crée', async () => {
    const list = await bordereauApi.getBordereaux();
    expect(list.length).toBeGreaterThan(0);
    expect(await bordereauApi.checkDuplicate('1002345678', 2027)).toBe(true);
    const created = await bordereauApi.createBordereau(
      { pilgrimLastName: 'X', pilgrimFirstName: 'Y', phone: '699000000', idNumber: '8888888888', region: 'Centre', agency: 'Yaoundé - Siège', encadreurId: 'ENC-001', pilgrimType: 'PELERIN', pilgrimCount: 1, season: 2027 },
      ADMIN
    );
    expect(created.id).toMatch(/^BOR-/);
  });

  it('reportingApi renvoie les agrégats', async () => {
    expect(await reportingApi.getReporting()).toHaveProperty('totalCollected');
  });

  it('referenceDataApi renvoie les référentiels', async () => {
    expect((await referenceDataApi.getEncadreurs()).length).toBeGreaterThan(0);
    expect((await referenceDataApi.getSeasons()).length).toBeGreaterThan(0);
    expect(await referenceDataApi.getOfficialPrice(2027, 'PELERIN')).toBeGreaterThan(0);
    expect((await referenceDataApi.getUsers()).length).toBeGreaterThan(0);
    expect(await referenceDataApi.getSmtpSettings()).toBeTruthy();
    expect(Array.isArray(await referenceDataApi.getEncadreurCommissions(2027))).toBe(true);
  });

  it('paymentsApi lit les versements et les remboursements', async () => {
    expect(Array.isArray(await paymentsApi.getPendingVersements())).toBe(true);
    expect(Array.isArray(await paymentsApi.getVersementsHistory())).toBe(true);
    expect(Array.isArray(await paymentsApi.getRefunds())).toBe(true);
  });

  it('visaApi expose le login pèlerin, le groupe et les anomalies', async () => {
    const dossier = await visaApi.pilgrimLogin('1002345678', '699112233');
    expect(dossier.idNumber).toBe('1002345678');
    expect(Array.isArray(await visaApi.getEncadreurGroup('ENC-001'))).toBe(true);
    expect(await visaApi.checkStatusAnomalies()).toBeTruthy();
    const found = await visaApi.lookupBeneficiary('1002345678', 2027);
    expect(found.found).toBe(true);
    expect(Array.isArray(await visaApi.getGroupedPayments())).toBe(true);
  });

  it('auditApi et attestationsApi exposent leurs lectures', async () => {
    expect(Array.isArray(await auditApi.getAuditLogs())).toBe(true);
    expect(await attestationsApi.getPassportDeposits(2027)).toBeTruthy();
  });
});
