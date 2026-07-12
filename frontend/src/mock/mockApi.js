import {
  SEED_USERS,
  SEED_SEASONS,
  SEED_BORDEREAUX,
  SEED_AUDIT_LOGS,
  SEED_ENCADREURS,
} from './seedData';
import {
  AGENCIES,
  CURRENT_SEASON,
  DEFAULT_OFFICIAL_PRICE,
  PILGRIM_TYPES,
  REGIONS,
  ROLES,
  VISA_STATUSES,
  canCreateRole,
} from '../utils/constants';

const VISA_STATUSES_SET = new Set(VISA_STATUSES);
const ROLE_VALUES = new Set(Object.values(ROLES));

// v5 : ajout des collections `smtpSettings` et `passwordResets` — un cache v4
// ne les contiendrait pas.
const STORAGE_KEY = 'copilote-hadj-mock-db-v6';
const NETWORK_DELAY = 350;

// Paramètres SMTP par défaut, modifiables par l'Admin DSI depuis son interface.
const DEFAULT_SMTP_SETTINGS = {
  host: 'smtp.afrilandfirstbank.cm',
  port: 587,
  secure: true,
  username: 'no-reply@afrilandfirstbank.cm',
  fromName: 'Copilote Hadj',
  fromEmail: 'no-reply@afrilandfirstbank.cm',
  otpTtlMinutes: 10,
};

function seedDb() {
  return {
    users: SEED_USERS,
    seasons: SEED_SEASONS,
    bordereaux: SEED_BORDEREAUX,
    auditLogs: SEED_AUDIT_LOGS,
    encadreurs: SEED_ENCADREURS,
    smtpSettings: { ...DEFAULT_SMTP_SETTINGS },
    passwordResets: [],
  };
}

function loadDb() {
  if (typeof window === 'undefined') return seedDb();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDb();
    return JSON.parse(raw);
  } catch {
    return seedDb();
  }
}

function saveDb(db) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

let db = loadDb();

function persist() {
  saveDb(db);
}

const delay = (ms = NETWORK_DELAY) => new Promise((resolve) => setTimeout(resolve, ms));

function addAudit(action, target, user) {
  db.auditLogs = [
    { id: `AUD-${db.auditLogs.length + 1}`, action, target, user, timestamp: new Date().toISOString() },
    ...db.auditLogs,
  ];
}

function fakeJwt(user) {
  const payload = { sub: user.username, role: user.role, name: user.name };
  return `mock.${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}.token`;
}

// --- Services de notification mock : documentent le point de branchement vers de vrais ---
// --- fournisseurs (SMS First, SMTP/SendGrid...) une fois le backend disponible.        ---
function sendMockSms(phone, message) {
  // eslint-disable-next-line no-console
  console.info(`[NotificationService:mock:SMS] -> ${phone} : ${message}`);
}

function sendMockEmail(email, subject, message) {
  if (!email) return;
  // eslint-disable-next-line no-console
  console.info(`[NotificationService:mock:EMAIL] -> ${email} | ${subject} : ${message}`);
}

function sendMockWhatsApp(phone, message) {
  if (!phone) return;
  // eslint-disable-next-line no-console
  console.info(`[NotificationService:mock:WHATSAPP] -> ${phone} : ${message}`);
}

function notifyPilgrim(bordereau, message, subject = 'Copilote Hadj') {
  sendMockSms(bordereau.phone, message);
  sendMockWhatsApp(bordereau.phone, message);
  sendMockEmail(bordereau.email, subject, message);
}

const VISA_STATUS_MESSAGES = {
  EN_ATTENTE: 'Votre dossier a été reçu et est en attente de traitement.',
  EN_COURS: 'Votre dossier est en cours de traitement.',
  ACCORDE: 'Bonne nouvelle : votre visa a été accordé.',
  REFUSE: "Votre demande de visa a été refusée. Contactez votre agence pour plus d'informations.",
  COMPLEMENT_REQUIS: 'Un complément de dossier est requis. Merci de contacter votre agence.',
};

// ---------------------------------------------------------------------------
// Calculs dérivés (prix par type de pèlerin, montants, éligibilité)
// ---------------------------------------------------------------------------
function getSeason(season) {
  return db.seasons.find((s) => s.season === season) || db.seasons[0];
}

// Prix à régler pour un pèlerin : prix de base de son type, majoré des frais de
// l'encadreur (commission par pèlerin de la saison) si le pèlerin a choisi de
// les prendre en charge à l'inscription (`includesEncadreurFees`).
function getPrice(season, pilgrimType, includesEncadreurFees = false) {
  const seasonData = getSeason(season);
  const base = seasonData?.prices?.[pilgrimType] ?? DEFAULT_OFFICIAL_PRICE;
  const fees = includesEncadreurFees ? (seasonData?.commissionPerPilgrim || 0) : 0;
  return base + fees;
}

function computeValidatedAmount(bordereau) {
  return bordereau.versements.filter((v) => v.status === 'VALIDE').reduce((sum, v) => sum + v.amount, 0);
}

function computePendingAmount(bordereau) {
  return bordereau.versements.filter((v) => v.status === 'PENDING').reduce((sum, v) => sum + v.amount, 0);
}

function computeTargetAmount(bordereau) {
  return bordereau.pilgrimCount * getPrice(bordereau.season, bordereau.pilgrimType, bordereau.includesEncadreurFees);
}

function decorateBordereau(bordereau) {
  const amountPaid = computeValidatedAmount(bordereau);
  const pendingAmount = computePendingAmount(bordereau);
  const targetAmount = computeTargetAmount(bordereau);
  const price = getPrice(bordereau.season, bordereau.pilgrimType, bordereau.includesEncadreurFees);
  const eligiblePilgrims = Math.floor(amountPaid / (price || 1));
  const encadreur = db.encadreurs.find((e) => e.id === bordereau.encadreurId);
  return {
    ...bordereau,
    amountPaid,
    pendingAmount,
    targetAmount,
    officialPrice: price,
    balance: targetAmount - amountPaid,
    eligiblePilgrims,
    isEligible: eligiblePilgrims >= bordereau.pilgrimCount,
    isComplete: amountPaid >= targetAmount,
    encadreurCode: encadreur?.code || null,
    // Code de paiement remis au pèlerin : identifiant du bordereau + code
    // encadreur, pour identifier sans ambiguïté qui l'accompagne.
    paymentCode: encadreur?.code ? `${bordereau.id}-${encadreur.code}` : bordereau.id,
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function mockLogin(username, password) {
  await delay();
  const user = db.users.find((u) => u.username === username && u.password === password);
  if (!user || user.active === false) {
    const error = new Error('INVALID_CREDENTIALS');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }
  const { password: _pw, ...safeUser } = user;
  return { token: fakeJwt(user), user: safeUser };
}

export async function mockEncadreurLogin(username, password) {
  await delay(400);
  const user = db.users.find((u) => u.username === username && u.password === password && u.role === 'ENCADREUR');
  if (!user || user.active === false) {
    const error = new Error('INVALID_CREDENTIALS');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }
  const { password: _pw, ...safeUser } = user;
  return { token: fakeJwt(user), user: safeUser };
}

// ---------------------------------------------------------------------------
// Bordereaux (Module 1 — saisie agent)
// ---------------------------------------------------------------------------
export async function mockGetBordereaux(filters = {}) {
  await delay();
  let items = db.bordereaux.map(decorateBordereau);
  if (filters.region) items = items.filter((b) => b.region === filters.region);
  if (filters.encadreurId) items = items.filter((b) => b.encadreurId === filters.encadreurId);
  if (filters.agency) items = items.filter((b) => b.agency === filters.agency);
  if (filters.pilgrimType) items = items.filter((b) => b.pilgrimType === filters.pilgrimType);
  if (filters.season) items = items.filter((b) => b.season === Number(filters.season));
  if (filters.from) items = items.filter((b) => b.createdAt >= filters.from);
  if (filters.to) items = items.filter((b) => b.createdAt <= filters.to);
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function mockCheckDuplicate(idNumber, season) {
  await delay(200);
  return db.bordereaux.some((b) => b.idNumber === idNumber && b.season === season);
}

export async function mockCreateBordereau(payload, actor) {
  await delay(600);
  const isDuplicate = db.bordereaux.some((b) => b.idNumber === payload.idNumber && b.season === payload.season);
  if (isDuplicate) {
    const error = new Error('DUPLICATE_PILGRIM');
    error.code = 'DUPLICATE_PILGRIM';
    throw error;
  }

  const price = getPrice(payload.season, payload.pilgrimType, payload.includesEncadreurFees);
  const amount = Number(payload.pilgrimCount) * price;
  const id = `BOR-${String(db.bordereaux.length + 1).padStart(4, '0')}`;
  const receiptNumber = `RC-${2000 + db.bordereaux.length}`;
  const createdAt = new Date().toISOString().slice(0, 10);

  const record = {
    ...payload,
    id,
    receiptNumber,
    source: 'AGENT',
    visaStatus: 'EN_ATTENTE',
    createdAt,
    versements: [
      {
        id: `VER-${Date.now()}`,
        amount,
        method: 'AGENCE',
        reference: receiptNumber,
        agency: payload.agency,
        status: 'VALIDE',
        createdAt,
        validatedAt: createdAt,
        validatedBy: actor?.username || 'system',
        note: null,
      },
    ],
    notifications: [{ date: createdAt, message: VISA_STATUS_MESSAGES.EN_ATTENTE }],
    statusHistory: [{ status: 'EN_ATTENTE', date: createdAt }],
  };

  db.bordereaux = [record, ...db.bordereaux];
  addAudit('CREATION_BORDEREAU', id, actor?.username || 'system');
  persist();

  notifyPilgrim(record, `Copilote Hadj: votre souscription ${id} a été enregistrée. Merci.`, 'Souscription enregistrée');

  return decorateBordereau(record);
}

// ---------------------------------------------------------------------------
// Reporting (Module 2)
// ---------------------------------------------------------------------------
export async function mockGetReporting(filters = {}) {
  await delay(400);
  const items = await mockGetBordereaux(filters);
  const season = filters.season || getSeason().season;

  const totalCollected = items.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalPending = items.reduce((sum, b) => sum + b.pendingAmount, 0);
  const totalPilgrims = items.reduce((sum, b) => sum + b.pilgrimCount, 0);
  const eligiblePilgrims = items.reduce((sum, b) => sum + b.eligiblePilgrims, 0);
  const insufficientBalanceCount = items.filter((b) => b.eligiblePilgrims < b.pilgrimCount).length;

  const byEncadreur = db.encadreurs
    .map((enc) => {
      const encItems = items.filter((b) => b.encadreurId === enc.id);
      return {
        encadreurId: enc.id,
        encadreurName: enc.name,
        collected: encItems.reduce((sum, b) => sum + b.amountPaid, 0),
        pilgrims: encItems.reduce((sum, b) => sum + b.pilgrimCount, 0),
        bordereaux: encItems.length,
      };
    })
    .filter((row) => row.bordereaux > 0);

  const byRegion = [...new Set(items.map((b) => b.region))].map((region) => {
    const regionItems = items.filter((b) => b.region === region);
    return {
      region,
      collected: regionItems.reduce((sum, b) => sum + b.amountPaid, 0),
      pilgrims: regionItems.reduce((sum, b) => sum + b.pilgrimCount, 0),
    };
  });

  const byType = [...new Set(items.map((b) => b.pilgrimType))].map((type) => ({
    type,
    count: items.filter((b) => b.pilgrimType === type).length,
  }));

  const seasonComparison = db.seasons.map((s) => {
    const seasonItems = db.bordereaux.map(decorateBordereau).filter((b) => b.season === s.season);
    return {
      season: s.season,
      collected: seasonItems.reduce((sum, b) => sum + b.amountPaid, 0),
      pilgrims: seasonItems.reduce((sum, b) => sum + b.pilgrimCount, 0),
    };
  });

  return {
    season,
    totalCollected,
    totalPending,
    totalPilgrims,
    eligiblePilgrims,
    bordereauxCount: items.length,
    avgAmount: items.length ? Math.round(totalCollected / items.length) : 0,
    insufficientBalanceCount,
    byEncadreur,
    byRegion,
    byType,
    seasonComparison,
    items,
  };
}

// ---------------------------------------------------------------------------
// Auto-inscription en ligne (Module 1 bis — le pèlerin s'inscrit lui-même)
// ---------------------------------------------------------------------------
export async function mockRegisterPilgrimOnline(payload) {
  await delay(600);
  const isDuplicate = db.bordereaux.some((b) => b.idNumber === payload.idNumber && b.season === payload.season);
  if (isDuplicate) {
    const error = new Error('DUPLICATE_PILGRIM');
    error.code = 'DUPLICATE_PILGRIM';
    throw error;
  }

  const id = `BOR-${String(db.bordereaux.length + 1).padStart(4, '0')}`;
  const receiptNumber = `RC-${2000 + db.bordereaux.length}`;
  const createdAt = new Date().toISOString().slice(0, 10);

  const record = {
    ...payload,
    id,
    reference: null,
    agency: null,
    receiptNumber,
    source: 'ONLINE',
    onlinePriority: true,
    visaStatus: 'EN_ATTENTE',
    createdAt,
    versements: [],
    notifications: [{ date: createdAt, message: VISA_STATUS_MESSAGES.EN_ATTENTE }],
    statusHistory: [{ status: 'EN_ATTENTE', date: createdAt }],
  };

  db.bordereaux = [record, ...db.bordereaux];
  addAudit('INSCRIPTION_EN_LIGNE', id, payload.idNumber);
  persist();

  const decorated = decorateBordereau(record);
  notifyPilgrim(
    record,
    `Copilote Hadj: votre inscription ${id} est enregistrée. Votre code de paiement est ${decorated.paymentCode}. Connectez-vous pour effectuer votre versement.`,
    'Inscription Hadj enregistrée'
  );

  return decorated;
}

// ---------------------------------------------------------------------------
// Inscription des pèlerins par l'encadreur (individuelle et en masse)
// ---------------------------------------------------------------------------
// Mot de passe temporaire lisible (pas de 0/O/1/I/l ambigus) — remis par
// l'encadreur au pèlerin pour qu'il puisse suivre son dossier à distance,
// en plus (ou à la place) de son numéro de téléphone.
function generatePilgrimPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 6; i += 1) password += chars[Math.floor(Math.random() * chars.length)];
  return password;
}

function buildEncadreurBordereau(payload, encadreurId, offset = 0) {
  const index = db.bordereaux.length + offset;
  const id = `BOR-${String(index + 1).padStart(4, '0')}`;
  const receiptNumber = `RC-${2000 + index}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  const encadreur = db.encadreurs.find((e) => e.id === encadreurId);
  return {
    reference: null,
    agency: null,
    email: '',
    pilgrimType: 'PELERIN',
    pilgrimStatus: 'NOUVEAU',
    pilgrimCount: 1,
    season: CURRENT_SEASON,
    ...payload,
    encadreurId,
    region: payload.region || encadreur?.region || '',
    id,
    receiptNumber,
    source: 'ENCADREUR',
    onlinePriority: false,
    visaStatus: 'EN_ATTENTE',
    createdAt,
    password: generatePilgrimPassword(),
    versements: [],
    notifications: [{ date: createdAt, message: VISA_STATUS_MESSAGES.EN_ATTENTE }],
    statusHistory: [{ status: 'EN_ATTENTE', date: createdAt }],
  };
}

export async function mockRegisterPilgrimByEncadreur(payload, encadreurId, actor) {
  await delay(600);
  const season = payload.season || CURRENT_SEASON;
  const isDuplicate = db.bordereaux.some((b) => b.idNumber === payload.idNumber && b.season === season);
  if (isDuplicate) {
    const error = new Error('DUPLICATE_PILGRIM');
    error.code = 'DUPLICATE_PILGRIM';
    throw error;
  }
  const record = buildEncadreurBordereau({ ...payload, season }, encadreurId);
  db.bordereaux = [record, ...db.bordereaux];
  addAudit('INSCRIPTION_ENCADREUR', record.id, actor?.username || encadreurId);
  persist();
  const decorated = decorateBordereau(record);
  notifyPilgrim(
    record,
    `Copilote Hadj: vous avez été inscrit(e) par votre encadreur. Votre code de paiement est ${decorated.paymentCode}. Mot de passe de suivi : ${record.password}.`,
    'Inscription Hadj enregistrée'
  );
  return decorated;
}

// Import en masse de pèlerins pour un encadreur depuis un fichier Excel/CSV.
// Colonnes attendues : pilgrimLastName, pilgrimFirstName, phone, idNumber,
// region (facultatif), pilgrimType (facultatif). Les doublons CNI/Passeport sur
// la saison courante sont ignorés.
export async function mockImportPilgrims(rows, encadreurId, actor) {
  await delay(700);
  const created = [];
  const skipped = [];
  const errors = [];
  const season = CURRENT_SEASON;
  const seenInBatch = new Set();

  rows.forEach((row, index) => {
    const pilgrimLastName = String(row.pilgrimLastName || '').trim();
    const pilgrimFirstName = String(row.pilgrimFirstName || '').trim();
    const phone = String(row.phone || '').trim();
    const idNumber = String(row.idNumber || '').trim();
    const region = String(row.region || '').trim();
    const rawType = String(row.pilgrimType || '').trim().toUpperCase();

    if (!pilgrimLastName || !pilgrimFirstName || !phone || !idNumber) {
      errors.push({ row: index + 1, reason: 'MISSING_FIELD' });
      return;
    }
    if (!/^\d{9}$/.test(phone)) {
      errors.push({ row: index + 1, reason: 'INVALID_PHONE' });
      return;
    }
    if (region && !REGIONS.includes(region)) {
      errors.push({ row: index + 1, reason: 'INVALID_REGION', region });
      return;
    }
    const pilgrimType = PILGRIM_TYPES.includes(rawType) ? rawType : 'PELERIN';
    const dup =
      seenInBatch.has(idNumber) ||
      db.bordereaux.some((b) => b.idNumber === idNumber && b.season === season);
    if (dup) {
      skipped.push({ row: index + 1, idNumber });
      return;
    }

    seenInBatch.add(idNumber);
    const record = buildEncadreurBordereau(
      { pilgrimLastName, pilgrimFirstName, phone, idNumber, region, pilgrimType, season },
      encadreurId,
      created.length
    );
    record.source = 'ENCADREUR_IMPORT';
    db.bordereaux = [record, ...db.bordereaux];
    created.push({
      id: record.id,
      idNumber,
      pilgrimName: `${pilgrimFirstName} ${pilgrimLastName}`,
      phone,
      password: record.password,
    });

    const decorated = decorateBordereau(record);
    notifyPilgrim(
      record,
      `Copilote Hadj: vous avez été inscrit(e) par votre encadreur. Votre code de paiement est ${decorated.paymentCode}. Mot de passe de suivi : ${record.password}.`,
      'Inscription Hadj enregistrée'
    );
  });

  if (created.length > 0) {
    addAudit('IMPORT_PELERINS', `${created.length} pèlerin(s) — ${encadreurId}`, actor?.username || encadreurId);
    persist();
  }

  return { created, skipped, errors };
}

// ---------------------------------------------------------------------------
// Versements en ligne (Mobile Money / référence agence) — au compte-goutte
// ---------------------------------------------------------------------------
export async function mockCreateVersementOnline(idNumber, phone, { method, amount, reference, agency, receiptImage, qrData, otherDetails, accountNumber }) {
  await delay(700);
  const bordereau = db.bordereaux.find((b) => b.idNumber === idNumber && b.phone === phone);
  if (!bordereau) {
    const error = new Error('NOT_FOUND');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const decorated = decorateBordereau(bordereau);
  const remaining = decorated.balance - decorated.pendingAmount;
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0 || numericAmount > remaining) {
    const error = new Error('INVALID_AMOUNT');
    error.code = 'INVALID_AMOUNT';
    throw error;
  }

  const createdAt = new Date().toISOString().slice(0, 10);
  const newVersement = {
    id: `VER-${Date.now()}`,
    amount: numericAmount,
    method,
    reference,
    agency: method === 'AGENCE' ? agency : null,
    receiptImage: method === 'AGENCE' ? receiptImage || null : null,
    qrData: method === 'AGENCE' ? qrData || null : null,
    otherDetails: method === 'AUTRE' ? otherDetails || null : null,
    // Numéro de compte du versement — champ optionnel, peut rester null.
    accountNumber: accountNumber?.trim() ? accountNumber.trim() : null,
    status: 'PENDING',
    createdAt,
    validatedAt: null,
    validatedBy: null,
    note: null,
    refundStatus: null,
    refundedAt: null,
  };

  bordereau.versements = [...bordereau.versements, newVersement];
  addAudit('DECLARATION_VERSEMENT', bordereau.id, idNumber);
  persist();

  return decorateBordereau(bordereau);
}

// ---------------------------------------------------------------------------
// Paiement groupé (un pèlerin règle le versement de plusieurs bénéficiaires,
// potentiellement rattachés à des encadreurs différents) — chaque part est
// enregistrée sur le bordereau du bénéficiaire concerné (donc attribuée au bon
// encadreur dans le reporting), en conservant une référence commune
// `groupPaymentId` et l'identité du payeur pour la traçabilité.
// ---------------------------------------------------------------------------
export async function mockLookupBeneficiary(idNumber, season) {
  await delay(250);
  const bordereau = db.bordereaux.find((b) => b.idNumber === idNumber && b.season === season);
  if (!bordereau) {
    return { found: false };
  }
  const decorated = decorateBordereau(bordereau);
  return {
    found: true,
    idNumber,
    name: `${bordereau.pilgrimFirstName} ${bordereau.pilgrimLastName}`,
    encadreurCode: decorated.encadreurCode,
    encadreurName: db.encadreurs.find((e) => e.id === bordereau.encadreurId)?.name || null,
    remaining: Math.max(decorated.balance - decorated.pendingAmount, 0),
  };
}

export async function mockCreateGroupedVersementOnline(
  payerIdNumber,
  payerPhone,
  { method, reference, agency, receiptImage, qrData, otherDetails, accountNumber, beneficiaries }
) {
  await delay(800);
  const payer = db.bordereaux.find((b) => b.idNumber === payerIdNumber && b.phone === payerPhone);
  if (!payer) {
    const error = new Error('NOT_FOUND');
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (!Array.isArray(beneficiaries) || beneficiaries.length === 0) {
    const error = new Error('NO_BENEFICIARIES');
    error.code = 'NO_BENEFICIARIES';
    throw error;
  }

  const resolved = beneficiaries.map(({ idNumber, amount }) => {
    const bordereau = db.bordereaux.find((b) => b.idNumber === idNumber && b.season === payer.season);
    if (!bordereau) {
      const error = new Error('BENEFICIARY_NOT_FOUND');
      error.code = 'BENEFICIARY_NOT_FOUND';
      error.idNumber = idNumber;
      throw error;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      const error = new Error('INVALID_AMOUNT');
      error.code = 'INVALID_AMOUNT';
      error.idNumber = idNumber;
      throw error;
    }
    const decorated = decorateBordereau(bordereau);
    const remaining = decorated.balance - decorated.pendingAmount;
    if (numericAmount > remaining) {
      const error = new Error('AMOUNT_TOO_HIGH');
      error.code = 'AMOUNT_TOO_HIGH';
      error.idNumber = idNumber;
      throw error;
    }
    return { bordereau, amount: numericAmount };
  });

  const groupPaymentId = `GRP-${Date.now()}`;
  const payerName = `${payer.pilgrimFirstName} ${payer.pilgrimLastName}`;
  const createdAt = new Date().toISOString().slice(0, 10);

  resolved.forEach(({ bordereau, amount }, index) => {
    const newVersement = {
      id: `VER-${Date.now()}-${index}`,
      amount,
      method,
      reference,
      agency: method === 'AGENCE' ? agency : null,
      receiptImage: method === 'AGENCE' ? receiptImage || null : null,
      qrData: method === 'AGENCE' ? qrData || null : null,
      otherDetails: method === 'AUTRE' ? otherDetails || null : null,
      accountNumber: accountNumber?.trim() ? accountNumber.trim() : null,
      status: 'PENDING',
      createdAt,
      validatedAt: null,
      validatedBy: null,
      note: null,
      refundStatus: null,
      refundedAt: null,
      groupPaymentId,
      payerIdNumber,
      payerName,
    };
    bordereau.versements = [...bordereau.versements, newVersement];
  });

  addAudit('DECLARATION_VERSEMENT_GROUPE', groupPaymentId, payerIdNumber);
  persist();

  return {
    groupPaymentId,
    beneficiaries: resolved.map(({ bordereau, amount }) => ({
      idNumber: bordereau.idNumber,
      name: `${bordereau.pilgrimFirstName} ${bordereau.pilgrimLastName}`,
      amount,
      encadreurCode: decorateBordereau(bordereau).encadreurCode,
    })),
  };
}

export async function mockGetGroupedPayments() {
  await delay(300);
  const groups = new Map();
  db.bordereaux.forEach((bordereau) => {
    bordereau.versements
      .filter((v) => v.groupPaymentId)
      .forEach((v) => {
        if (!groups.has(v.groupPaymentId)) {
          groups.set(v.groupPaymentId, {
            groupPaymentId: v.groupPaymentId,
            payerIdNumber: v.payerIdNumber,
            payerName: v.payerName,
            createdAt: v.createdAt,
            method: v.method,
            status: v.status,
            totalAmount: 0,
            beneficiaries: [],
          });
        }
        const group = groups.get(v.groupPaymentId);
        group.totalAmount += v.amount;
        const encadreur = db.encadreurs.find((e) => e.id === bordereau.encadreurId);
        group.beneficiaries.push({
          idNumber: bordereau.idNumber,
          name: `${bordereau.pilgrimFirstName} ${bordereau.pilgrimLastName}`,
          amount: v.amount,
          status: v.status,
          encadreurId: bordereau.encadreurId || null,
          encadreurName: encadreur?.name || null,
          encadreurCode: encadreur?.code || null,
        });
      });
  });
  return [...groups.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Import d'un paiement groupé côté encadreur (Module Encadreur) — l'encadreur
// a réglé un versement unique couvrant plusieurs pèlerins de son groupe ; il
// importe un fichier (nom, téléphone, montant) pour ventiler ce versement sur
// le bordereau de chaque pèlerin concerné, chacun devant déjà être inscrit
// dans son groupe.
// ---------------------------------------------------------------------------
export async function mockImportGroupedVersementsByEncadreur(rows, encadreurId, { method, reference }, actor) {
  await delay(700);
  const encadreur = db.encadreurs.find((e) => e.id === encadreurId);
  const groupPaymentId = `GRP-${Date.now()}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  const created = [];
  const notFound = [];
  const invalidAmount = [];

  rows.forEach((row, index) => {
    const phone = String(row.phone || '').trim();
    const amount = Number(row.amount);
    const bordereau = db.bordereaux.find((b) => b.encadreurId === encadreurId && b.phone === phone);
    if (!bordereau) {
      notFound.push({ row: index + 1, phone });
      return;
    }
    if (!amount || amount <= 0) {
      invalidAmount.push({ row: index + 1, phone });
      return;
    }
    const newVersement = {
      id: `VER-${Date.now()}-${index}`,
      amount,
      method,
      reference,
      agency: null,
      receiptImage: null,
      qrData: null,
      otherDetails: null,
      accountNumber: null,
      status: 'PENDING',
      createdAt,
      validatedAt: null,
      validatedBy: null,
      note: null,
      refundStatus: null,
      refundedAt: null,
      groupPaymentId,
      payerIdNumber: null,
      payerName: encadreur?.name || null,
    };
    bordereau.versements = [...bordereau.versements, newVersement];
    created.push({ bordereauId: bordereau.id, pilgrimName: `${bordereau.pilgrimFirstName} ${bordereau.pilgrimLastName}`, phone, amount });
  });

  if (created.length > 0) {
    addAudit('IMPORT_VERSEMENT_GROUPE_ENCADREUR', groupPaymentId, actor?.username || 'system');
    persist();
  }

  return { groupPaymentId, created, notFound, invalidAmount };
}

// ---------------------------------------------------------------------------
// Validation des paiements (Admin DSI / Gestionnaire / Superviseur)
// ---------------------------------------------------------------------------
export async function mockGetPendingVersements() {
  await delay(350);
  const rows = [];
  db.bordereaux.forEach((bordereau) => {
    const encadreur = db.encadreurs.find((e) => e.id === bordereau.encadreurId);
    bordereau.versements
      .filter((v) => v.status === 'PENDING')
      .forEach((v) => {
        rows.push({
          ...v,
          bordereauId: bordereau.id,
          pilgrimName: `${bordereau.pilgrimFirstName} ${bordereau.pilgrimLastName}`,
          idNumber: bordereau.idNumber,
          phone: bordereau.phone,
          season: bordereau.season,
          region: bordereau.region,
          encadreurId: bordereau.encadreurId || null,
          encadreurName: encadreur?.name || null,
        });
      });
  });
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Historique des paiements déjà traités (validés ou rejetés), filtrable par
// statut et par période (du/au, ou un jour précis en renseignant from = to).
export async function mockGetVersementsHistory({ status, from, to, region, encadreurId } = {}) {
  await delay(350);
  const rows = [];
  db.bordereaux.forEach((bordereau) => {
    const encadreur = db.encadreurs.find((e) => e.id === bordereau.encadreurId);
    bordereau.versements
      .filter((v) => v.status === 'VALIDE' || v.status === 'REJETE')
      .forEach((v) => {
        rows.push({
          ...v,
          bordereauId: bordereau.id,
          pilgrimName: `${bordereau.pilgrimFirstName} ${bordereau.pilgrimLastName}`,
          idNumber: bordereau.idNumber,
          phone: bordereau.phone,
          season: bordereau.season,
          region: bordereau.region,
          encadreurId: bordereau.encadreurId || null,
          encadreurName: encadreur?.name || null,
        });
      });
  });

  let filtered = rows;
  if (status) filtered = filtered.filter((v) => v.status === status);
  if (region) filtered = filtered.filter((v) => v.region === region);
  if (encadreurId) filtered = filtered.filter((v) => v.encadreurId === encadreurId);
  if (from) filtered = filtered.filter((v) => (v.validatedAt || v.createdAt) >= from);
  if (to) filtered = filtered.filter((v) => (v.validatedAt || v.createdAt) <= to);

  return filtered.sort((a, b) => {
    const dateA = a.validatedAt || a.createdAt;
    const dateB = b.validatedAt || b.createdAt;
    return dateA < dateB ? 1 : -1;
  });
}

// Une référence de versement (Mobile Money ou bordereau agence) ne peut être
// validée et comptabilisée qu'une seule fois, tous bordereaux confondus.
function isReferenceAlreadyValidated(reference, excludeVersementId) {
  if (!reference?.trim()) return false;
  return db.bordereaux.some((b) =>
    b.versements.some((v) => v.id !== excludeVersementId && v.status === 'VALIDE' && v.reference === reference)
  );
}

export async function mockValidateVersement(bordereauId, versementId, actor) {
  await delay(400);
  const bordereau = db.bordereaux.find((b) => b.id === bordereauId);
  if (!bordereau) throw new Error('NOT_FOUND');
  const versement = bordereau.versements.find((v) => v.id === versementId);
  if (!versement) throw new Error('NOT_FOUND');
  if (isReferenceAlreadyValidated(versement.reference, versementId)) {
    const error = new Error('REFERENCE_ALREADY_USED');
    error.code = 'REFERENCE_ALREADY_USED';
    throw error;
  }
  const now = new Date().toISOString().slice(0, 10);
  bordereau.versements = bordereau.versements.map((v) =>
    v.id === versementId ? { ...v, status: 'VALIDE', validatedAt: now, validatedBy: actor?.username } : v
  );
  addAudit('VALIDATION_PAIEMENT', `${bordereauId} / ${versementId}`, actor?.username || 'system');
  persist();
  notifyPilgrim(bordereau, 'Copilote Hadj: votre versement a été validé et comptabilisé.', 'Versement validé');
  return decorateBordereau(bordereau);
}

// Validation en masse d'une sélection de versements en attente. Chaque
// versement dont la référence a déjà été comptabilisée ailleurs est ignoré
// (skipped) au lieu de bloquer toute l'opération.
export async function mockBulkValidateVersements(items, actor) {
  await delay(700);
  const validated = [];
  const skipped = [];
  const now = new Date().toISOString().slice(0, 10);

  items.forEach(({ bordereauId, versementId }) => {
    const bordereau = db.bordereaux.find((b) => b.id === bordereauId);
    if (!bordereau) return;
    const versement = bordereau.versements.find((v) => v.id === versementId);
    if (!versement || versement.status !== 'PENDING') return;
    if (isReferenceAlreadyValidated(versement.reference, versementId)) {
      skipped.push({ bordereauId, versementId, reference: versement.reference });
      return;
    }
    bordereau.versements = bordereau.versements.map((v) =>
      v.id === versementId ? { ...v, status: 'VALIDE', validatedAt: now, validatedBy: actor?.username } : v
    );
    validated.push({ bordereauId, versementId });
    notifyPilgrim(bordereau, 'Copilote Hadj: votre versement a été validé et comptabilisé.', 'Versement validé');
  });

  if (validated.length > 0) {
    addAudit('VALIDATION_PAIEMENT_EN_MASSE', `${validated.length} versement(s)`, actor?.username || 'system');
    persist();
  }

  return { validated, skipped };
}

// Import d'un fichier (Excel/CSV) de rapprochement bancaire : pour chaque
// versement EN ATTENTE, on cherche sa référence dans le fichier. Si elle y
// figure, on applique le statut indiqué (VALIDE par défaut si la colonne
// Statut est vide — la simple présence de la référence confirme le versement) ;
// sinon on ne touche pas au versement.
const IMPORT_STATUS_ALIASES = {
  VALIDE: ['VALIDE', 'VALIDÉ', 'VALID', 'OK', 'CONFIRME', 'CONFIRMÉ', 'CONFIRMED', 'PAID', 'PAYE', 'PAYÉ', 'REGLE', 'RÉGLÉ'],
  REJETE: ['REJETE', 'REJETÉ', 'REJECTED', 'KO', 'REFUSE', 'REFUSÉ', 'ECHEC', 'ÉCHEC', 'FAILED'],
};

function normalizeImportStatus(raw) {
  const value = String(raw || '').trim().toUpperCase();
  if (!value) return 'VALIDE'; // présence de la référence = confirmation
  if (IMPORT_STATUS_ALIASES.REJETE.includes(value)) return 'REJETE';
  if (IMPORT_STATUS_ALIASES.VALIDE.includes(value)) return 'VALIDE';
  return 'VALIDE';
}

export async function mockImportPaymentStatusesByReference(rows, actor) {
  await delay(700);

  // Construit la table référence -> statut souhaité à partir du fichier.
  const refToStatus = new Map();
  rows.forEach((row) => {
    const reference = String(row.reference || '').trim();
    if (!reference) return;
    refToStatus.set(reference, normalizeImportStatus(row.status));
  });

  const updated = [];
  const skipped = [];
  const now = new Date().toISOString().slice(0, 10);

  db.bordereaux.forEach((bordereau) => {
    bordereau.versements = bordereau.versements.map((v) => {
      if (v.status !== 'PENDING') return v;
      const ref = (v.reference || '').trim();
      if (!ref || !refToStatus.has(ref)) return v;
      const newStatus = refToStatus.get(ref);
      // Une référence déjà comptabilisée ailleurs ne peut être re-validée.
      if (newStatus === 'VALIDE' && isReferenceAlreadyValidated(ref, v.id)) {
        skipped.push({ bordereauId: bordereau.id, versementId: v.id, reference: ref });
        return v;
      }
      updated.push({ bordereauId: bordereau.id, versementId: v.id, reference: ref, status: newStatus });
      return {
        ...v,
        status: newStatus,
        validatedAt: now,
        validatedBy: actor?.username,
        note: newStatus === 'REJETE' ? 'Rapprochement bancaire (import)' : v.note,
      };
    });
  });

  if (updated.length > 0) {
    addAudit('IMPORT_STATUTS_PAIEMENT', `${updated.length} versement(s)`, actor?.username || 'system');
    persist();
    updated.forEach((u) => {
      const bordereau = db.bordereaux.find((b) => b.id === u.bordereauId);
      if (!bordereau) return;
      notifyPilgrim(
        bordereau,
        u.status === 'VALIDE'
          ? 'Copilote Hadj: votre versement a été validé et comptabilisé.'
          : 'Copilote Hadj: votre versement a été rejeté.',
        'Mise à jour de votre versement'
      );
    });
  }

  // Références présentes dans le fichier mais ne correspondant à aucun versement
  // en attente (déjà traité, inexistant, ou déjà comptabilisé ailleurs).
  const matchedRefs = new Set([...updated, ...skipped].map((u) => u.reference));
  const unmatched = [...refToStatus.keys()].filter((r) => !matchedRefs.has(r));

  return { updated, skipped, unmatched };
}

export async function mockRejectVersement(bordereauId, versementId, reason, actor) {
  await delay(400);
  const bordereau = db.bordereaux.find((b) => b.id === bordereauId);
  if (!bordereau) throw new Error('NOT_FOUND');
  const now = new Date().toISOString().slice(0, 10);
  bordereau.versements = bordereau.versements.map((v) =>
    v.id === versementId ? { ...v, status: 'REJETE', note: reason, validatedAt: now, validatedBy: actor?.username } : v
  );
  addAudit('REJET_PAIEMENT', `${bordereauId} / ${versementId}`, actor?.username || 'system');
  persist();
  notifyPilgrim(bordereau, `Copilote Hadj: votre versement a été rejeté (${reason || 'référence invalide'}).`, 'Versement rejeté');
  return decorateBordereau(bordereau);
}

// ---------------------------------------------------------------------------
// Remboursements (Module Superviseur) — un visa refusé marque automatiquement
// les versements déjà validés comme "à rembourser" ; le Superviseur choisit
// ensuite le moyen de restitution (par défaut celui du versement d'origine :
// Orange Money, Mobile Money, virement, agence...) et une référence.
// ---------------------------------------------------------------------------
export async function mockGetRefunds() {
  await delay(350);
  const rows = [];
  db.bordereaux.forEach((bordereau) => {
    bordereau.versements
      .filter((v) => v.refundStatus)
      .forEach((v) => {
        rows.push({
          ...v,
          bordereauId: bordereau.id,
          pilgrimName: `${bordereau.pilgrimFirstName} ${bordereau.pilgrimLastName}`,
          idNumber: bordereau.idNumber,
          phone: bordereau.phone,
          visaStatus: bordereau.visaStatus,
        });
      });
  });
  return rows.sort((a, b) => (a.refundStatus === b.refundStatus ? 0 : a.refundStatus === 'A_REMBOURSER' ? -1 : 1));
}

export async function mockProcessRefund(bordereauId, versementId, { refundMethod, refundReference }, actor) {
  await delay(400);
  const bordereau = db.bordereaux.find((b) => b.id === bordereauId);
  if (!bordereau) throw new Error('NOT_FOUND');
  const now = new Date().toISOString().slice(0, 10);
  bordereau.versements = bordereau.versements.map((v) =>
    v.id === versementId
      ? { ...v, refundStatus: 'REMBOURSE', refundedAt: now, refundMethod, refundReference, refundedBy: actor?.username }
      : v
  );
  addAudit('REMBOURSEMENT_VERSEMENT', `${bordereauId} / ${versementId}`, actor?.username || 'system');
  persist();
  notifyPilgrim(
    bordereau,
    `Copilote Hadj: un remboursement de votre versement a été effectué (${refundMethod || '—'}).`,
    'Remboursement effectué'
  );
  return decorateBordereau(bordereau);
}

// ---------------------------------------------------------------------------
// Statut visa + notifications
// ---------------------------------------------------------------------------
function applyVisaStatusChange(bordereau, newStatus, note, actorName) {
  bordereau.visaStatus = newStatus;
  const message = note?.trim() ? note.trim() : VISA_STATUS_MESSAGES[newStatus];
  const date = new Date().toISOString().slice(0, 10);
  bordereau.notifications = [...bordereau.notifications, { date, message }];
  bordereau.statusHistory = [...(bordereau.statusHistory || []), { status: newStatus, date }];
  addAudit('CHANGEMENT_STATUT_VISA', bordereau.id, actorName || 'system');
  notifyPilgrim(bordereau, `Copilote Hadj: ${message}`, 'Mise à jour de votre dossier Hadj');

  // Un visa refusé déclenche automatiquement le besoin de remboursement des
  // versements déjà validés, à traiter par le Superviseur selon le moyen de
  // paiement d'origine (Orange Money, Mobile Money, virement, agence...).
  if (newStatus === 'REFUSE') {
    bordereau.versements = bordereau.versements.map((v) =>
      v.status === 'VALIDE' && !v.refundStatus ? { ...v, refundStatus: 'A_REMBOURSER' } : v
    );
  }
}

export async function mockChangeVisaStatus(bordereauId, newStatus, note, actor) {
  await delay(400);
  const bordereau = db.bordereaux.find((b) => b.id === bordereauId);
  if (!bordereau) throw new Error('NOT_FOUND');
  applyVisaStatusChange(bordereau, newStatus, note, actor?.username);
  persist();
  return decorateBordereau(bordereau);
}

// Validation en masse du statut visa pour une liste de bordereaux (sélection
// manuelle d'un groupe de pèlerins) ou pour tous les pèlerins d'un encadreur
// donné (passer encadreurId sans bordereauIds pour cibler tout son groupe).
export async function mockBulkChangeVisaStatus({ bordereauIds, encadreurId, newStatus, note }, actor) {
  await delay(700);
  if (!VISA_STATUSES_SET.has(newStatus)) {
    const error = new Error('INVALID_STATUS');
    error.code = 'INVALID_STATUS';
    throw error;
  }

  const targets = encadreurId
    ? db.bordereaux.filter((b) => b.encadreurId === encadreurId)
    : db.bordereaux.filter((b) => bordereauIds?.includes(b.id));

  targets.forEach((bordereau) => applyVisaStatusChange(bordereau, newStatus, note, actor?.username));

  if (targets.length > 0) {
    addAudit(
      'VALIDATION_VISA_MASSE',
      encadreurId ? `Groupe ${encadreurId} (${targets.length})` : `${targets.length} bordereau(x)`,
      actor?.username || 'system'
    );
    persist();
  }

  return { updatedCount: targets.length, bordereauIds: targets.map((b) => b.id) };
}

// Import en masse des statuts de visa depuis un fichier Excel/CSV externe
// (colonnes attendues : idNumber, status, note facultative). Réutilise la même
// logique de notification/audit que le changement de statut unitaire.
// `encadreurId` restreint l'import aux seuls pèlerins de cet encadreur : toute
// ligne dont le CNI/Passeport correspond à un pèlerin d'un AUTRE encadreur est
// rejetée (wrongEncadreur) plutôt qu'appliquée, pour éviter qu'un import
// destiné à un encadreur ne modifie par erreur le dossier d'un autre groupe.
export async function mockImportVisaStatuses(rows, actor, encadreurId = null) {
  await delay(600);
  const updated = [];
  const notFound = [];
  const invalidStatus = [];
  const wrongEncadreur = [];

  rows.forEach((row, index) => {
    const idNumber = String(row.idNumber || '').trim();
    const status = String(row.status || '').trim().toUpperCase();

    if (!VISA_STATUSES_SET.has(status)) {
      invalidStatus.push({ row: index + 1, idNumber, status });
      return;
    }
    const bordereau = db.bordereaux.find((b) => b.idNumber === idNumber);
    if (!bordereau) {
      notFound.push({ row: index + 1, idNumber });
      return;
    }
    if (encadreurId && bordereau.encadreurId !== encadreurId) {
      wrongEncadreur.push({ row: index + 1, idNumber });
      return;
    }
    applyVisaStatusChange(bordereau, status, row.note, actor?.username);
    updated.push({ bordereauId: bordereau.id, idNumber, status });
  });

  if (updated.length > 0) {
    const label = encadreurId
      ? `${updated.length} dossier(s) (encadreur ${encadreurId})`
      : `${updated.length} dossier(s)`;
    addAudit('IMPORT_STATUTS_VISA', label, actor?.username || 'system');
    persist();
  }

  return { updated, notFound, invalidStatus, wrongEncadreur };
}

// Vérification automatique des anomalies (équivalent d'un contrôle via le jeu de
// données Power BI) : dossiers entièrement payés mais toujours en attente, et
// versements déclarés en attente de validation depuis plus de 3 jours.
export async function mockCheckStatusAnomalies() {
  await delay(700);
  const now = Date.now();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const anomalies = [];

  db.bordereaux.map(decorateBordereau).forEach((b) => {
    if (b.isComplete && b.visaStatus === 'EN_ATTENTE') {
      anomalies.push({
        bordereauId: b.id,
        pilgrimName: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
        reason: 'FULLY_PAID_STILL_PENDING',
      });
    }
    b.versements
      .filter((v) => v.status === 'PENDING' && now - new Date(v.createdAt).getTime() > THREE_DAYS_MS)
      .forEach((v) => {
        anomalies.push({
          bordereauId: b.id,
          pilgrimName: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
          reason: 'PAYMENT_PENDING_TOO_LONG',
          reference: v.reference,
        });
      });
  });

  return { checkedAt: new Date().toISOString(), anomalies };
}

// ---------------------------------------------------------------------------
// Encadreurs (référentiel géré par Gestionnaire Hadj / Admin DSI)
// ---------------------------------------------------------------------------
export async function mockGetEncadreurs({ onlyActive = true, region } = {}) {
  await delay(150);
  let items = [...db.encadreurs];
  if (onlyActive) items = items.filter((e) => e.active !== false);
  if (region) items = items.filter((e) => e.region === region);
  return items;
}

const ENCADREUR_CODE_RE = /^[A-Z0-9]{3}$/;

function isCodeTaken(code, excludeId) {
  return db.encadreurs.some((e) => e.id !== excludeId && e.code?.toUpperCase() === code);
}

// Génère un code alphanumérique à 3 caractères garanti unique (référentiel
// encadreurs), utilisé quand aucun code n'est fourni explicitement.
function generateEncadreurCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    let code = '';
    for (let i = 0; i < 3; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
    if (!isCodeTaken(code)) return code;
  }
  throw new Error('CODE_GENERATION_FAILED');
}

// Valide (ou génère) le code encadreur à 3 caractères alphanumériques qui
// identifie de façon unique l'encadreur dans le code de paiement du pèlerin.
function resolveEncadreurCode(rawCode, excludeId) {
  if (!rawCode?.trim()) return generateEncadreurCode();
  const code = rawCode.trim().toUpperCase();
  if (!ENCADREUR_CODE_RE.test(code)) {
    const error = new Error('INVALID_CODE');
    error.code = 'INVALID_CODE';
    throw error;
  }
  if (isCodeTaken(code, excludeId)) {
    const error = new Error('CODE_TAKEN');
    error.code = 'CODE_TAKEN';
    throw error;
  }
  return code;
}

export async function mockCreateEncadreur(payload, actor) {
  await delay(300);
  const id = `ENC-${String(db.encadreurs.length + 1).padStart(3, '0')}`;
  const code = resolveEncadreurCode(payload.code);
  const record = { id, active: true, ...payload, code };
  db.encadreurs = [...db.encadreurs, record];
  addAudit('CREATION_ENCADREUR', id, actor?.username || 'system');
  persist();
  return record;
}

export async function mockUpdateEncadreur(id, updates, actor) {
  await delay(300);
  const nextUpdates = { ...updates };
  if (updates.code !== undefined) {
    nextUpdates.code = resolveEncadreurCode(updates.code, id);
  }
  db.encadreurs = db.encadreurs.map((e) => (e.id === id ? { ...e, ...nextUpdates } : e));
  addAudit('MODIFICATION_ENCADREUR', id, actor?.username || 'system');
  persist();
  return db.encadreurs.find((e) => e.id === id);
}

// Import en masse depuis un fichier Excel/CSV (colonnes attendues : name, region,
// et éventuellement code). Les lignes dont le nom existe déjà (insensible à la
// casse) sont ignorées ; celles dont la région ou le code sont invalides sont en
// erreur ; un code manquant est généré automatiquement.
export async function mockImportEncadreurs(rows, actor) {
  await delay(500);
  const created = [];
  const skipped = [];
  const errors = [];

  rows.forEach((row, index) => {
    const name = String(row.name || '').trim();
    const region = String(row.region || '').trim();
    const rawCode = String(row.code || '').trim();

    if (!name || !region) {
      errors.push({ row: index + 1, reason: 'MISSING_FIELD' });
      return;
    }
    if (!REGIONS.includes(region)) {
      errors.push({ row: index + 1, reason: 'INVALID_REGION', region });
      return;
    }
    const alreadyExists = db.encadreurs.some((e) => e.name.toLowerCase() === name.toLowerCase());
    if (alreadyExists) {
      skipped.push({ row: index + 1, name });
      return;
    }
    if (rawCode && !ENCADREUR_CODE_RE.test(rawCode.toUpperCase())) {
      errors.push({ row: index + 1, reason: 'INVALID_CODE' });
      return;
    }
    if (rawCode && isCodeTaken(rawCode.toUpperCase())) {
      errors.push({ row: index + 1, reason: 'CODE_TAKEN' });
      return;
    }

    const id = `ENC-${String(db.encadreurs.length + created.length + 1).padStart(3, '0')}`;
    const code = rawCode ? rawCode.toUpperCase() : generateEncadreurCode();
    const record = { id, name, region, code, active: true };
    db.encadreurs = [...db.encadreurs, record];
    created.push(record);
  });

  if (created.length > 0) {
    addAudit('IMPORT_ENCADREURS', `${created.length} encadreur(s)`, actor?.username || 'system');
    persist();
  }

  return { created, skipped, errors };
}

// ---------------------------------------------------------------------------
// Utilisateurs (Admin DSI)
// ---------------------------------------------------------------------------
export async function mockGetUsers() {
  await delay(250);
  return db.users.map(({ password: _pw, ...safe }) => safe);
}

// La hiérarchie est vérifiée ici (et pas seulement dans l'UI) : le formulaire
// masque les rôles interdits, mais rien n'empêcherait un appel direct à l'API.
function assertCanCreateRole(actor, targetRole) {
  if (!canCreateRole(actor?.role, targetRole)) {
    const error = new Error('FORBIDDEN_ROLE');
    error.code = 'FORBIDDEN_ROLE';
    throw error;
  }
}

export async function mockCreateUser(payload, actor) {
  await delay(400);
  assertCanCreateRole(actor, payload.role);
  const exists = db.users.some((u) => u.username === payload.username);
  if (exists) {
    const error = new Error('USERNAME_TAKEN');
    error.code = 'USERNAME_TAKEN';
    throw error;
  }
  const id = `U-${db.users.length + 1}`;
  const record = { id, active: true, ...payload };
  db.users = [...db.users, record];
  addAudit('CREATION_UTILISATEUR', payload.username, actor?.username || 'system');
  persist();
  const { password: _pw, ...safe } = record;
  return safe;
}

function generateUserPassword() {
  // Mot de passe temporaire lisible, communiqué à l'utilisateur créé.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 8; i += 1) {
    password += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return password;
}

// Plage des diacritiques combinants, construite par échappement pour ne pas
// dépendre de l'encodage du fichier source.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

function slugifyUsername(name) {
  return String(name)
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

// ---------------------------------------------------------------------------
// Import en masse d'utilisateurs (Admin / Superviseur / Gestionnaire).
// Le nom (et l'identifiant déduit) est contrôlé : une ligne dont le nom ou le
// username existe déjà est ignorée plutôt que de créer un doublon.
// ---------------------------------------------------------------------------
export async function mockImportUsers(rows, actor) {
  await delay(700);
  const created = [];
  const duplicates = [];
  const forbidden = [];
  const invalid = [];

  // On compare sur des noms normalisés pour attraper « Paul  MBARGA » vs « paul mbarga ».
  const normalizeName = (value) => String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  const existingNames = new Set(db.users.map((u) => normalizeName(u.name)));
  const existingUsernames = new Set(db.users.map((u) => u.username));

  rows.forEach((row, index) => {
    const line = index + 2;
    const name = String(row.name ?? '').trim();
    const role = String(row.role ?? '').trim().toUpperCase();

    if (!name || !role) {
      invalid.push({ row: line, reason: 'MISSING_FIELD' });
      return;
    }
    if (!ROLE_VALUES.has(role)) {
      invalid.push({ row: line, name, reason: 'UNKNOWN_ROLE' });
      return;
    }
    if (!canCreateRole(actor?.role, role)) {
      forbidden.push({ row: line, name, role });
      return;
    }
    if (existingNames.has(normalizeName(name))) {
      duplicates.push({ row: line, name });
      return;
    }

    const username = String(row.username ?? '').trim() || slugifyUsername(name);
    if (existingUsernames.has(username)) {
      duplicates.push({ row: line, name, username });
      return;
    }

    const password = String(row.password ?? '').trim() || generateUserPassword();
    // db.users grandit à chaque ligne créée : sa longueur suffit pour l'identifiant.
    const record = {
      id: `U-${db.users.length + 1}`,
      username,
      password,
      name,
      email: String(row.email ?? '').trim() || null,
      role,
      active: true,
    };
    if (role === 'ENCADREUR') record.encadreurId = String(row.encadreurId ?? '').trim() || null;
    else record.agency = String(row.agency ?? '').trim() || AGENCIES[0];

    db.users = [...db.users, record];
    existingNames.add(normalizeName(name));
    existingUsernames.add(username);
    // Le mot de passe est renvoyé une seule fois, pour remise à l'utilisateur.
    created.push({ name, username, password, role });
  });

  if (created.length > 0) {
    addAudit('IMPORT_UTILISATEURS', `${created.length} compte(s)`, actor?.username || 'system');
    persist();
  }

  return { created, duplicates, forbidden, invalid };
}

export async function mockUpdateUser(id, updates, actor) {
  await delay(350);
  const target = db.users.find((u) => u.id === id);
  if (!target) throw new Error('NOT_FOUND');

  // Une modification de rôle est soumise à la même hiérarchie qu'une création :
  // sinon un gestionnaire pourrait promouvoir un compte existant en superviseur.
  if (updates.role && updates.role !== target.role) {
    assertCanCreateRole(actor, updates.role);
  }

  db.users = db.users.map((u) => (u.id === id ? { ...u, ...updates } : u));
  addAudit('MODIFICATION_UTILISATEUR', id, actor?.username || 'system');
  persist();
  const { password: _pw, ...safe } = db.users.find((u) => u.id === id);
  return safe;
}

// ---------------------------------------------------------------------------
// Paramètres SMTP (Admin DSI) — servent à l'envoi du code OTP de
// réinitialisation de mot de passe.
// ---------------------------------------------------------------------------
export async function mockGetSmtpSettings() {
  await delay(250);
  return { ...(db.smtpSettings || DEFAULT_SMTP_SETTINGS) };
}

export async function mockUpdateSmtpSettings(settings, actor) {
  await delay(400);
  if (actor?.role !== 'ADMIN_DSI') {
    const error = new Error('FORBIDDEN');
    error.code = 'FORBIDDEN';
    throw error;
  }
  db.smtpSettings = { ...(db.smtpSettings || DEFAULT_SMTP_SETTINGS), ...settings };
  addAudit('MODIFICATION_SMTP', 'smtpSettings', actor?.username || 'system');
  persist();
  return { ...db.smtpSettings };
}

// ---------------------------------------------------------------------------
// Mot de passe oublié : envoi d'un code OTP par email, puis réinitialisation.
// ---------------------------------------------------------------------------
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskEmail(email) {
  // On ne renvoie jamais l'email complet à un appelant non authentifié.
  const [local, domain] = String(email).split('@');
  if (!domain) return '***';
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

function findUserByIdentifier(identifier) {
  const value = String(identifier || '').trim().toLowerCase();
  return db.users.find(
    (u) => u.username.toLowerCase() === value || String(u.email || '').toLowerCase() === value
  );
}

export async function mockRequestPasswordReset(identifier) {
  await delay(600);
  const user = findUserByIdentifier(identifier);
  const settings = db.smtpSettings || DEFAULT_SMTP_SETTINGS;

  // Réponse volontairement identique que le compte existe ou non : on ne
  // révèle pas quels identifiants sont valides (énumération de comptes).
  if (!user || !user.email || user.active === false) {
    return { sent: true, maskedEmail: null };
  }

  const ttlMs = (Number(settings.otpTtlMinutes) || 10) * 60 * 1000;
  const otp = generateOtp();
  const reset = {
    username: user.username,
    otp,
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
  };
  db.passwordResets = [...(db.passwordResets || []).filter((r) => r.username !== user.username), reset];
  persist();

  sendMockEmail(
    user.email,
    `${settings.fromName} — Code de réinitialisation`,
    `Votre code de vérification est ${otp}. Il expire dans ${settings.otpTtlMinutes} minutes.`
  );
  addAudit('DEMANDE_REINITIALISATION_MDP', user.username, user.username);

  return { sent: true, maskedEmail: maskEmail(user.email) };
}

const MAX_OTP_ATTEMPTS = 5;

export async function mockResetPasswordWithOtp(identifier, otp, newPassword) {
  await delay(600);
  const user = findUserByIdentifier(identifier);
  const reset = (db.passwordResets || []).find((r) => r.username === user?.username);

  if (!user || !reset) {
    const error = new Error('INVALID_OTP');
    error.code = 'INVALID_OTP';
    throw error;
  }
  if (Date.now() > reset.expiresAt) {
    db.passwordResets = db.passwordResets.filter((r) => r.username !== user.username);
    persist();
    const error = new Error('OTP_EXPIRED');
    error.code = 'OTP_EXPIRED';
    throw error;
  }
  if (reset.attempts >= MAX_OTP_ATTEMPTS) {
    const error = new Error('TOO_MANY_ATTEMPTS');
    error.code = 'TOO_MANY_ATTEMPTS';
    throw error;
  }
  if (String(otp).trim() !== reset.otp) {
    reset.attempts += 1;
    persist();
    const error = new Error('INVALID_OTP');
    error.code = 'INVALID_OTP';
    throw error;
  }
  if (!newPassword || String(newPassword).length < 6) {
    const error = new Error('WEAK_PASSWORD');
    error.code = 'WEAK_PASSWORD';
    throw error;
  }

  db.users = db.users.map((u) => (u.id === user.id ? { ...u, password: newPassword } : u));
  db.passwordResets = db.passwordResets.filter((r) => r.username !== user.username);
  addAudit('REINITIALISATION_MDP', user.username, user.username);
  persist();

  return { success: true };
}

// ---------------------------------------------------------------------------
// Commissions encadreurs (Module Gestionnaire du Hadj) — on agrège les
// bordereaux dont le pèlerin a choisi de prendre en charge les frais de
// l'encadreur (`includesEncadreurFees`). Formule : total versé ÷ prix officiel
// hors commission = nombre de places acquises ; le reste est soit un reliquat
// disponible, soit (si nul) le complément à verser pour une place de plus.
// ---------------------------------------------------------------------------
export async function mockGetEncadreurCommissions(season) {
  await delay(350);
  const seasonData = getSeason(season);
  const officialPrice = seasonData?.officialPriceExcludingCommission || DEFAULT_OFFICIAL_PRICE;
  const commissionPerPilgrim = seasonData?.commissionPerPilgrim || 0;

  return db.encadreurs.map((enc) => {
    const bordereaux = db.bordereaux
      .filter((b) => b.encadreurId === enc.id && b.includesEncadreurFees && b.season === seasonData.season)
      .map(decorateBordereau);
    const totalPaid = bordereaux.reduce((sum, b) => sum + b.amountPaid, 0);
    const pilgrimsWithFees = bordereaux.reduce((sum, b) => sum + b.pilgrimCount, 0);
    const placesAcquired = officialPrice > 0 ? Math.floor(totalPaid / officialPrice) : 0;
    const remainder = totalPaid - placesAcquired * officialPrice;
    const amountNeededForNextPlace = remainder > 0 ? officialPrice - remainder : 0;

    return {
      encadreurId: enc.id,
      encadreurName: enc.name,
      encadreurCode: enc.code,
      bordereauxCount: bordereaux.length,
      pilgrimsWithFees,
      totalPaid,
      officialPrice,
      commissionPerPilgrim,
      placesAcquired,
      reliquat: remainder,
      amountNeededForNextPlace,
      totalCommissionDue: pilgrimsWithFees * commissionPerPilgrim,
    };
  });
}

// ---------------------------------------------------------------------------
// Paramétrage des saisons Hadj (mois/année + montant par type de pèlerin)
// ---------------------------------------------------------------------------
export async function mockGetSeasons() {
  await delay(150);
  return db.seasons;
}

export async function mockGetOfficialPrice(season, pilgrimType, includesEncadreurFees = false) {
  await delay(150);
  return getPrice(season, pilgrimType, includesEncadreurFees);
}

export async function mockCreateSeason(payload, actor) {
  await delay(400);
  const exists = db.seasons.some((s) => s.season === payload.season);
  if (exists) {
    const error = new Error('SEASON_EXISTS');
    error.code = 'SEASON_EXISTS';
    throw error;
  }
  db.seasons = [...db.seasons, payload];
  addAudit('CREATION_SAISON', String(payload.season), actor?.username || 'system');
  persist();
  return payload;
}

export async function mockUpdateSeason(season, updates, actor) {
  await delay(350);
  db.seasons = db.seasons.map((s) => (s.season === season ? { ...s, ...updates, prices: { ...s.prices, ...(updates.prices || {}) } } : s));
  addAudit('MODIFICATION_SAISON', String(season), actor?.username || 'system');
  persist();
  return getSeason(season);
}

// ---------------------------------------------------------------------------
// Visa portal (Module 3)
// ---------------------------------------------------------------------------
// `secret` accepte soit le numéro de téléphone (auto-inscription), soit le mot
// de passe temporaire remis par l'encadreur (inscription individuelle ou en
// masse par l'encadreur) — un seul champ de connexion pour les deux cas.
export async function mockPilgrimLogin(idNumber, secret) {
  await delay(450);
  const record = db.bordereaux.find(
    (b) => b.idNumber === idNumber && (b.phone === secret || (b.password && b.password === secret))
  );
  if (!record) {
    const error = new Error('NOT_FOUND');
    error.code = 'NOT_FOUND';
    throw error;
  }
  return decorateBordereau(record);
}

export async function mockGetEncadreurGroup(encadreurId) {
  await delay(400);
  const items = db.bordereaux.filter((b) => b.encadreurId === encadreurId);
  return items.map(decorateBordereau);
}

// ---------------------------------------------------------------------------
// Attestations de dépôt de passeport (Module Superviseur) — le nombre total de
// pèlerins attendus est celui géré par le Gestionnaire du Hadj (pilgrimCount
// cumulé des bordereaux de la saison) ; le Superviseur pointe au fur et à
// mesure les passeports physiquement déposés et suit le nombre restant.
// ---------------------------------------------------------------------------
export async function mockGetPassportDeposits(season) {
  await delay(350);
  const items = db.bordereaux
    .filter((b) => b.season === season)
    .map((b) => {
      const encadreur = db.encadreurs.find((e) => e.id === b.encadreurId);
      return {
        bordereauId: b.id,
        idNumber: b.idNumber,
        pilgrimName: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
        pilgrimCount: b.pilgrimCount,
        encadreurName: encadreur?.name || null,
        encadreurCode: encadreur?.code || null,
        passportDeposited: b.passportDeposited || false,
        passportDepositedAt: b.passportDepositedAt || null,
      };
    })
    .sort((a, b) => (a.passportDeposited === b.passportDeposited ? 0 : a.passportDeposited ? 1 : -1));

  const totalPilgrims = items.reduce((sum, i) => sum + i.pilgrimCount, 0);
  const depositedPilgrims = items.filter((i) => i.passportDeposited).reduce((sum, i) => sum + i.pilgrimCount, 0);

  return {
    items,
    totalPilgrims,
    depositedPilgrims,
    remainingPilgrims: totalPilgrims - depositedPilgrims,
  };
}

export async function mockTogglePassportDeposit(bordereauId, deposited, actor) {
  await delay(300);
  const bordereau = db.bordereaux.find((b) => b.id === bordereauId);
  if (!bordereau) throw new Error('NOT_FOUND');
  bordereau.passportDeposited = deposited;
  bordereau.passportDepositedAt = deposited ? new Date().toISOString().slice(0, 10) : null;
  addAudit(deposited ? 'DEPOT_PASSEPORT' : 'ANNULATION_DEPOT_PASSEPORT', bordereauId, actor?.username || 'system');
  persist();
  return decorateBordereau(bordereau);
}

// Valeurs acceptées dans la colonne « Depot » du fichier d'import : on tolère
// les variantes courantes (OUI/NON, VRAI/FAUX, 1/0) pour absorber les exports
// Excel localisés.
const DEPOSIT_TRUE = new Set(['OUI', 'YES', 'VRAI', 'TRUE', '1', 'DEPOSE', 'DÉPOSÉ']);
const DEPOSIT_FALSE = new Set(['NON', 'NO', 'FAUX', 'FALSE', '0', 'NON_DEPOSE', 'NON DÉPOSÉ']);

function parseDepositFlag(raw) {
  // Colonne vide => on considère le passeport comme déposé (cas nominal).
  const value = String(raw ?? '').trim().toUpperCase();
  if (!value) return true;
  if (DEPOSIT_TRUE.has(value)) return true;
  if (DEPOSIT_FALSE.has(value)) return false;
  return null;
}

// ---------------------------------------------------------------------------
// Import en masse des dépôts de passeports (Module Superviseur — Attestations).
// Chaque ligne cible un pèlerin par son numéro CNI/Passeport ; la colonne
// « Depot » (optionnelle) permet aussi d'annuler un dépôt.
// ---------------------------------------------------------------------------
export async function mockImportPassportDeposits(rows, season, actor) {
  await delay(700);
  const updated = [];
  const notFound = [];
  const invalid = [];

  rows.forEach((row, index) => {
    const idNumber = String(row.idNumber ?? '').trim();
    if (!idNumber) {
      invalid.push({ row: index + 2, reason: 'MISSING_ID' });
      return;
    }

    const deposited = parseDepositFlag(row.deposited);
    if (deposited === null) {
      invalid.push({ row: index + 2, idNumber, reason: 'INVALID_FLAG' });
      return;
    }

    const bordereau = db.bordereaux.find((b) => b.idNumber === idNumber && b.season === season);
    if (!bordereau) {
      notFound.push({ row: index + 2, idNumber });
      return;
    }

    bordereau.passportDeposited = deposited;
    bordereau.passportDepositedAt = deposited ? new Date().toISOString().slice(0, 10) : null;
    updated.push({
      bordereauId: bordereau.id,
      idNumber,
      pilgrimName: `${bordereau.pilgrimFirstName} ${bordereau.pilgrimLastName}`,
      deposited,
    });
  });

  if (updated.length > 0) {
    addAudit('IMPORT_DEPOTS_PASSEPORTS', `${updated.length} ligne(s)`, actor?.username || 'system');
    persist();
  }

  return { updated, notFound, invalid };
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------
export async function mockGetAuditLogs() {
  await delay(250);
  return db.auditLogs;
}

export function resetMockDb() {
  db = seedDb();
  persist();
}
