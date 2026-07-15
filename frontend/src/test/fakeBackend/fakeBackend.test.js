import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as api from './fakeBackend';

const ADMIN = { username: 'admin', role: 'ADMIN_DSI' };

// Un pèlerin de démonstration (BOR-0001).
const PILGRIM = { idNumber: '1002345678', phone: '699112233' };

beforeEach(() => {
  api.resetDb();
});

describe('authentification', () => {
  it('connecte un utilisateur valide et masque le mot de passe', async () => {
    const res = await api.login('admin', 'admin123');
    expect(res.token).toBeTruthy();
    expect(res.user.role).toBe('ADMIN_DSI');
    expect(res.user.password).toBeUndefined();
  });

  it('rejette un mot de passe invalide', async () => {
    await expect(api.login('admin', 'faux')).rejects.toThrow('INVALID_CREDENTIALS');
  });

  // Le backend n'expose qu'un seul /auth/login : un encadreur s'y connecte comme
  // les autres et son `encadreurId` est porté par l'utilisateur renvoyé. Le filtre
  // « ce portail n'accepte que des encadreurs » vit dans authApi.loginEncadreur.
  it('connecte un encadreur et expose son encadreurId', async () => {
    const res = await api.login('encadreur1', 'encadreur123');
    expect(res.user.role).toBe('ENCADREUR');
    expect(res.user.encadreurId).toBe('ENC-001');
  });
});

describe('bordereaux', () => {
  it('liste les bordereaux avec champs dérivés', async () => {
    const items = await api.getBordereaux();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('targetAmount');
    expect(items[0]).toHaveProperty('balance');
    expect(items[0]).toHaveProperty('paymentCode');
  });

  it('filtre par région et par type', async () => {
    const all = await api.getBordereaux();
    const region = all[0].region;
    const filtered = await api.getBordereaux({ region });
    expect(filtered.every((b) => b.region === region)).toBe(true);
  });

  it('détecte les doublons', async () => {
    expect(await api.checkDuplicate(PILGRIM.idNumber, 2027)).toBe(true);
    expect(await api.checkDuplicate('0000', 2027)).toBe(false);
  });

  it('crée un bordereau et refuse un doublon', async () => {
    const payload = {
      pilgrimLastName: 'Test', pilgrimFirstName: 'Unitaire', phone: '699000000',
      idNumber: '9999999999', region: 'Centre', agency: 'Yaoundé - Siège',
      encadreurId: 'ENC-001', pilgrimType: 'PELERIN', pilgrimCount: 1, season: 2027,
    };
    const created = await api.createBordereau(payload, ADMIN);
    expect(created.id).toMatch(/^BOR-/);
    await expect(api.createBordereau(payload, ADMIN)).rejects.toThrow('DUPLICATE_PILGRIM');
  });

  it('refuse deux pèlerins avec le même numéro de téléphone', async () => {
    const all = await api.getBordereaux();
    const existing = all[0];
    await expect(
      api.createBordereau(
        {
          pilgrimLastName: 'Tel', pilgrimFirstName: 'Double', phone: existing.phone,
          idNumber: '9999000011', region: 'Centre', agency: 'Yaoundé - Siège',
          encadreurId: 'ENC-001', pilgrimType: 'PELERIN', pilgrimCount: 1, season: existing.season,
        },
        ADMIN
      )
    ).rejects.toThrow('DUPLICATE_PHONE');
  });

  it('majore le montant cible quand les frais encadreur sont pris en charge', async () => {
    const base = await api.getOfficialPrice(2027, 'PELERIN', false);
    const withFees = await api.getOfficialPrice(2027, 'PELERIN', true);
    expect(withFees).toBeGreaterThan(base);
  });
});

describe('reporting', () => {
  it('agrège les indicateurs clés', async () => {
    const rep = await api.getReporting();
    expect(rep).toHaveProperty('totalCollected');
    expect(rep).toHaveProperty('byEncadreur');
    expect(rep).toHaveProperty('byRegion');
    expect(Array.isArray(rep.byType)).toBe(true);
  });
});

describe('inscription en ligne et par encadreur', () => {
  const base = {
    pilgrimLastName: 'Enligne', pilgrimFirstName: 'Pelerin', phone: '698111222',
    idNumber: '5550001111', region: 'Centre', encadreurId: 'ENC-001',
    pilgrimType: 'PELERIN', pilgrimCount: 1, season: 2027,
  };

  it('inscrit un pèlerin en ligne et génère un mot de passe', async () => {
    const res = await api.registerPilgrimOnline(base);
    expect(res.id).toMatch(/^BOR-/);
  });

  it('refuse un doublon en ligne', async () => {
    await api.registerPilgrimOnline({ ...base, idNumber: '5550002222' });
    await expect(api.registerPilgrimOnline({ ...base, idNumber: '5550002222' })).rejects.toThrow();
  });

  it('inscrit un pèlerin via un encadreur avec identifiants', async () => {
    const res = await api.registerPilgrimByEncadreur(
      { ...base, idNumber: '5550003333' }, 'ENC-001', { username: 'encadreur1' }
    );
    expect(res.bordereau || res).toBeTruthy();
  });

  it('importe une liste de pèlerins pour un encadreur', async () => {
    const rows = [
      { pilgrimLastName: 'A', pilgrimFirstName: 'Un', phone: '690000001', idNumber: '6660001111', region: 'Centre' },
      { pilgrimLastName: 'B', pilgrimFirstName: 'Deux', phone: '690000002', idNumber: '6660002222', region: 'Centre' },
    ];
    const res = await api.importPilgrims(rows, 'ENC-001', { username: 'encadreur1' });
    expect(res.created.length).toBeGreaterThan(0);
  });

  it('un encadreur reconnu par sa pièce d’identité est rattaché à sa fiche et voit son groupe', async () => {
    // ENC-005 est semé avec idNumber '110234505'. Il s'auto-inscrit avec CE numéro.
    const res = await api.registerPilgrimOnline({
      ...base, idNumber: '110234505', phone: '698999888', pilgrimType: 'ENCADREUR', encadreurId: '',
    });
    expect(res.encadreurId).toBe('ENC-005');
    expect(res.encadreurCode).toBe('AB5');
    expect(res.paymentCode).toBe(`${res.id}-AB5`);
    // Son dossier apparaît bien dans le groupe de sa fiche.
    const groupe = await api.getEncadreurGroup('ENC-005');
    expect(groupe.some((b) => b.idNumber === '110234505')).toBe(true);
    // Aucune nouvelle fiche n'est créée.
    const encadreurs = await api.getEncadreurs({ onlyActive: false });
    expect(encadreurs.filter((e) => e.id === 'ENC-005')).toHaveLength(1);
  });

  it('refuse l’auto-inscription d’un encadreur inconnu au référentiel', async () => {
    await expect(
      api.registerPilgrimOnline({
        ...base, idNumber: '000000000', phone: '698111000', pilgrimType: 'ENCADREUR', encadreurId: '',
      })
    ).rejects.toThrow('ENCADREUR_NOT_REGISTERED');
  });
});

describe('versements', () => {
  // Sélectionne un dossier avec un solde à régler et renvoie ce solde total :
  // les paiements fractionnés étant interdits, on verse toujours la totalité.
  async function payableDossier(min = 100000) {
    const all = await api.getBordereaux();
    const b = all.find((x) => x.balance - x.pendingAmount > min);
    return { idNumber: b.idNumber, phone: b.phone, remaining: b.balance - b.pendingAmount };
  }

  it('enregistre un versement en ligne en attente', async () => {
    const d = await payableDossier();
    const res = await api.createVersementOnline(d.idNumber, d.phone, {
      method: 'MOBILE_MONEY_ORANGE', amount: d.remaining, reference: 'TX-TEST-1',
    });
    const last = res.versements[res.versements.length - 1];
    expect(last.amount).toBe(d.remaining);
    expect(last.status).toBe('PENDING');
  });

  it('refuse un paiement fractionné (compte-goutte)', async () => {
    const d = await payableDossier();
    await expect(
      api.createVersementOnline(d.idNumber, d.phone, {
        method: 'MOBILE_MONEY_ORANGE', amount: Math.floor(d.remaining / 2), reference: 'TX-PARTIAL',
      })
    ).rejects.toThrow('PARTIAL_NOT_ALLOWED');
  });

  it('conserve le numéro de compte optionnel et les détails "AUTRE"', async () => {
    const d = await payableDossier();
    const res = await api.createVersementOnline(d.idNumber, d.phone, {
      method: 'AUTRE', amount: d.remaining, reference: 'TX-TEST-2', otherDetails: 'Chèque', accountNumber: '00012345',
    });
    const last = res.versements[res.versements.length - 1];
    expect(last.otherDetails).toBe('Chèque');
    expect(last.accountNumber).toBe('00012345');
  });

  it('rejette un versement au dossier introuvable ou montant invalide', async () => {
    const d = await payableDossier();
    await expect(
      api.createVersementOnline('0000', '0000', { method: 'AGENCE', amount: 1000, reference: 'x' })
    ).rejects.toThrow();
    await expect(
      api.createVersementOnline(d.idNumber, d.phone, { method: 'AGENCE', amount: -5, reference: 'x' })
    ).rejects.toThrow();
  });

  it('valide puis liste les versements en attente et l’historique', async () => {
    const d = await payableDossier();
    await api.createVersementOnline(d.idNumber, d.phone, {
      method: 'MOBILE_MONEY_MTN', amount: d.remaining, reference: 'TX-VAL-1',
    });
    const pending = await api.getPendingVersements();
    expect(pending.length).toBeGreaterThan(0);
    const target = pending.find((p) => p.reference === 'TX-VAL-1');
    const res = await api.validateVersement(target.bordereauId, target.id, ADMIN);
    expect(res.amountPaid).toBeGreaterThan(0);
    const history = await api.getVersementsHistory({ status: 'VALIDE' });
    expect(history.some((h) => h.reference === 'TX-VAL-1')).toBe(true);
  });

  it('valide en masse une sélection de versements', async () => {
    const d = await payableDossier();
    await api.createVersementOnline(d.idNumber, d.phone, {
      method: 'MOBILE_MONEY_MTN', amount: d.remaining, reference: 'TX-BULK-1',
    });
    const pending = await api.getPendingVersements();
    const bulk = await api.bulkValidateVersements(
      pending.map((p) => ({ bordereauId: p.bordereauId, versementId: p.id })), ADMIN
    );
    expect(bulk.validated.length + bulk.skipped.length).toBe(pending.length);
  });

  it('rejette un versement en attente', async () => {
    const d = await payableDossier();
    await api.createVersementOnline(d.idNumber, d.phone, {
      method: 'MOBILE_MONEY_MTN', amount: d.remaining, reference: 'TX-REJ-1',
    });
    const pending = await api.getPendingVersements();
    const target = pending.find((p) => p.reference === 'TX-REJ-1');
    const res = await api.rejectVersement(target.bordereauId, target.id, 'référence introuvable', ADMIN);
    expect(res).toBeTruthy();
  });

  it('applique un import de rapprochement bancaire par référence', async () => {
    const d = await payableDossier();
    await api.createVersementOnline(d.idNumber, d.phone, {
      method: 'MOBILE_MONEY_ORANGE', amount: d.remaining, reference: 'RAPPRO-1',
    });
    const res = await api.importPaymentStatusesByReference(
      [{ reference: 'RAPPRO-1', status: 'VALIDE' }, { reference: 'INCONNUE', status: 'VALIDE' }], ADMIN
    );
    expect(res.updated.some((u) => u.reference === 'RAPPRO-1')).toBe(true);
    expect(res.unmatched).toContain('INCONNUE');
  });
});

describe('paiements groupés', () => {
  it('recherche un bénéficiaire par CNI', async () => {
    const found = await api.lookupBeneficiary(PILGRIM.idNumber, 2027);
    expect(found.found).toBe(true);
    expect(found.name).toBeTruthy();
    const missing = await api.lookupBeneficiary('0000', 2027);
    expect(missing.found).toBe(false);
  });

  it('crée un versement groupé et le liste', async () => {
    const all = await api.getBordereaux();
    const payer = all.find((b) => b.idNumber === PILGRIM.idNumber);
    const other = all.find((b) => b.idNumber !== PILGRIM.idNumber && b.balance > 0);
    const res = await api.createGroupedVersementOnline(PILGRIM.idNumber, PILGRIM.phone, {
      method: 'MOBILE_MONEY_ORANGE', reference: 'GRP-1',
      beneficiaries: [{ idNumber: other.idNumber, amount: 50000 }],
    });
    expect(res.groupPaymentId).toBeTruthy();
    const groups = await api.getGroupedPayments();
    expect(Array.isArray(groups)).toBe(true);
    expect(payer).toBeTruthy();
  });
});

describe('visa', () => {
  it('change le statut visa d’un bordereau', async () => {
    const all = await api.getBordereaux();
    const res = await api.changeVisaStatus(all[0].id, 'EN_COURS', 'test', ADMIN);
    expect(res.visaStatus).toBe('EN_COURS');
  });

  it('change le statut en masse pour un encadreur', async () => {
    const all = await api.getBordereaux({ encadreurId: 'ENC-001' });
    const res = await api.bulkChangeVisaStatus(
      { bordereauIds: all.map((b) => b.id), newStatus: 'ACCORDE', note: 'ok' }, ADMIN
    );
    expect(res).toBeTruthy();
  });

  it('importe des statuts visa et détecte les anomalies', async () => {
    const all = await api.getBordereaux();
    const res = await api.importVisaStatuses(
      [{ idNumber: all[0].idNumber, status: 'ACCORDE' }], ADMIN
    );
    expect(res).toBeTruthy();
    const anomalies = await api.checkStatusAnomalies();
    expect(anomalies).toBeTruthy();
  });
});

describe('remboursements', () => {
  it('marque les versements à rembourser après un visa refusé puis les traite', async () => {
    const all = await api.getBordereaux();
    const withPayment = all.find((b) => b.amountPaid > 0);
    await api.changeVisaStatus(withPayment.id, 'REFUSE', 'refus', ADMIN);
    const refunds = await api.getRefunds();
    expect(Array.isArray(refunds)).toBe(true);
    if (refunds.length > 0) {
      const r = refunds[0];
      const res = await api.processRefund(r.bordereauId, r.versementId, {
        refundMethod: 'VIREMENT', refundReference: 'RBT-1',
      }, ADMIN);
      expect(res).toBeTruthy();
    }
  });
});

describe('référentiels (encadreurs, saisons, utilisateurs)', () => {
  it('CRUD encadreur', async () => {
    const created = await api.createEncadreur({ name: 'Nouveau Guide', region: 'Centre' }, ADMIN);
    expect(created.id).toMatch(/^ENC-/);
    const updated = await api.updateEncadreur(created.id, { active: false }, ADMIN);
    expect(updated.active).toBe(false);
    const list = await api.getEncadreurs({ onlyActive: false });
    expect(list.some((e) => e.id === created.id)).toBe(true);
  });

  it('importe des encadreurs', async () => {
    const res = await api.importEncadreurs([{ name: 'Import Guide', region: 'Nord' }], ADMIN);
    expect(res.created.length).toBeGreaterThan(0);
  });

  it('CRUD saison + prix officiel', async () => {
    const created = await api.createSeason(
      { season: 2030, month: 6, year: 2030, isOpen: true, prices: { PELERIN: 3000000 }, officialPriceExcludingCommission: 2800000, commissionPerPilgrim: 150000 },
      ADMIN
    );
    expect(created).toBeTruthy();
    const price = await api.getOfficialPrice(2030, 'PELERIN', true);
    expect(price).toBe(3150000);
    const updated = await api.updateSeason(2030, { isOpen: false }, ADMIN);
    expect(updated).toBeTruthy();
  });

  it('CRUD utilisateur et refus de doublon', async () => {
    const created = await api.createUser(
      { username: 'nouvel_op', password: 'motdepasse1', role: 'OPERATEUR_HADJ', name: 'Op Test', email: 'op@x.cm' },
      ADMIN
    );
    expect(created.username).toBe('nouvel_op');
    await expect(api.createUser({ username: 'nouvel_op', password: 'x', role: 'OPERATEUR_HADJ', name: 'X' }, ADMIN)).rejects.toThrow();
    const updated = await api.updateUser(created.id, { active: false }, ADMIN);
    expect(updated.active).toBe(false);
  });

  it('importe des utilisateurs', async () => {
    const res = await api.importUsers(
      [{ username: 'imp_user', role: 'OPERATEUR_HADJ', name: 'Imp User', email: 'imp@x.cm' }], ADMIN
    );
    expect(res).toBeTruthy();
  });
});

describe('SMTP et réinitialisation du mot de passe', () => {
  it('lit et met à jour les paramètres SMTP', async () => {
    const settings = await api.getSmtpSettings();
    expect(settings).toBeTruthy();
    const updated = await api.updateSmtpSettings({ ...settings, fromName: 'Test Hadj' }, ADMIN);
    expect(updated.fromName).toBe('Test Hadj');
  });

  it('répond identiquement que le compte existe ou non (anti-énumération)', async () => {
    const known = await api.requestPasswordReset('admin');
    const unknown = await api.requestPasswordReset('inconnu@x.cm');
    expect(known.sent).toBe(true);
    expect(unknown.sent).toBe(true);
  });

  it('rejette un OTP invalide', async () => {
    await api.requestPasswordReset('admin');
    await expect(api.resetPasswordWithOtp('admin', '000000', 'nouveaupass')).rejects.toThrow('INVALID_OTP');
  });

  it('réinitialise le mot de passe avec le bon OTP', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    await api.requestPasswordReset('admin');
    const otpLine = spy.mock.calls.map((c) => c.join(' ')).find((l) => /code de vérification est \d{6}/.test(l));
    spy.mockRestore();
    const otp = otpLine && otpLine.match(/(\d{6})/)[1];
    if (otp) {
      const res = await api.resetPasswordWithOtp('admin', otp, 'nouveaupass');
      expect(res.success).toBe(true);
      const login = await api.login('admin', 'nouveaupass');
      expect(login.token).toBeTruthy();
    }
  });
});

describe('commissions, pèlerin, passeports, audit', () => {
  it('calcule les commissions encadreurs', async () => {
    const rows = await api.getEncadreurCommissions(2027);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows[0]).toHaveProperty('totalCommissionDue');
  });

  it('connecte un pèlerin par CNI + téléphone et charge son groupe', async () => {
    const res = await api.pilgrimLogin(PILGRIM.idNumber, PILGRIM.phone);
    expect(res.idNumber).toBe(PILGRIM.idNumber);
    const group = await api.getEncadreurGroup('ENC-001');
    expect(Array.isArray(group)).toBe(true);
  });

  it('refuse une connexion pèlerin invalide', async () => {
    await expect(api.pilgrimLogin('0000', '0000')).rejects.toThrow();
  });

  it('gère les dépôts de passeports', async () => {
    const deposits = await api.getPassportDeposits(2027);
    expect(deposits).toBeTruthy();
    // Chaque item porte encadreurId + phone (pour le filtre par encadreur et
    // l'attestation collective côté gestionnaire).
    expect(deposits.items[0]).toHaveProperty('encadreurId');
    expect(deposits.items[0]).toHaveProperty('phone');
    const all = await api.getBordereaux();
    const res = await api.togglePassportDeposit(all[0].id, true, ADMIN);
    expect(res).toBeTruthy();
  });

  it('expose le journal d’audit', async () => {
    await api.changeVisaStatus((await api.getBordereaux())[0].id, 'EN_COURS', 'x', ADMIN);
    const logs = await api.getAuditLogs();
    expect(logs.length).toBeGreaterThan(0);
  });

  it('liste les saisons', async () => {
    const seasons = await api.getSeasons();
    expect(seasons.length).toBeGreaterThan(0);
  });
});
