import { SEED_USERS, SEED_SEASONS, SEED_BORDEREAUX, SEED_AUDIT_LOGS, buildVersementsFor } from './seedData';
import { ENCADREURS } from '../utils/constants';

const STORAGE_KEY = 'copilote-hadj-mock-db';
const NETWORK_DELAY = 350;

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

function seedDb() {
  const bordereaux = SEED_BORDEREAUX.map((b) => ({
    ...b,
    versements: buildVersementsFor(b),
  }));
  return {
    users: SEED_USERS,
    seasons: SEED_SEASONS,
    bordereaux,
    auditLogs: SEED_AUDIT_LOGS,
  };
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

// --- SMS mock service : documente le point de branchement vers un vrai provider ---
function sendMockSms(phone, message) {
  // TODO(backend): brancher ici un vrai NotificationService (ex. API "SMS First").
  // eslint-disable-next-line no-console
  console.info(`[NotificationService:mock] SMS -> ${phone} : ${message}`);
}

function getSeason(season) {
  return db.seasons.find((s) => s.season === season) || db.seasons[0];
}

function computeEligiblePilgrims(amountPaid, season) {
  const price = getSeason(season).officialPrice || 1;
  return Math.floor((Number(amountPaid) || 0) / price);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function mockLogin(username, password) {
  await delay();
  const user = db.users.find((u) => u.username === username && u.password === password);
  if (!user) {
    const error = new Error('INVALID_CREDENTIALS');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }
  const { password: _pw, ...safeUser } = user;
  return { token: fakeJwt(user), user: safeUser };
}

// ---------------------------------------------------------------------------
// Bordereaux (Module 1)
// ---------------------------------------------------------------------------
export async function mockGetBordereaux(filters = {}) {
  await delay();
  let items = [...db.bordereaux];
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

  const officialPrice = getSeason(payload.season).officialPrice;
  const amountPaid = Number(payload.pilgrimCount) * officialPrice;
  const id = `BOR-${String(db.bordereaux.length + 1).padStart(4, '0')}`;
  const receiptNumber = `RC-${2000 + db.bordereaux.length}`;

  const record = {
    ...payload,
    id,
    receiptNumber,
    amountPaid,
    visaStatus: 'EN_ATTENTE',
    createdAt: new Date().toISOString().slice(0, 10),
    versements: [{ date: new Date().toISOString().slice(0, 10), amount: amountPaid, receiptNumber }],
  };

  db.bordereaux = [record, ...db.bordereaux];
  addAudit('CREATION_BORDEREAU', id, actor?.username || 'system');
  persist();

  sendMockSms(payload.phone, `Copilote Hadj: votre souscription ${id} a été enregistrée. Merci.`);

  return record;
}

export async function mockGetEncadreurs() {
  await delay(150);
  return ENCADREURS;
}

// ---------------------------------------------------------------------------
// Paramétrage
// ---------------------------------------------------------------------------
export async function mockGetOfficialPrice(season) {
  await delay(150);
  return getSeason(season).officialPrice;
}

export async function mockSetOfficialPrice(season, price, actor) {
  await delay(300);
  db.seasons = db.seasons.map((s) => (s.season === season ? { ...s, officialPrice: Number(price) } : s));
  addAudit('MODIFICATION_PRIX_OFFICIEL', `Saison ${season}`, actor?.username || 'system');
  persist();
  return getSeason(season);
}

export async function mockGetSeasons() {
  await delay(150);
  return db.seasons;
}

// ---------------------------------------------------------------------------
// Reporting (Module 2)
// ---------------------------------------------------------------------------
export async function mockGetReporting(filters = {}) {
  await delay(400);
  const items = await mockGetBordereaux(filters);
  const season = filters.season || getSeason().season;

  const totalCollected = items.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalPilgrims = items.reduce((sum, b) => sum + b.pilgrimCount, 0);
  const eligiblePilgrims = items.reduce((sum, b) => sum + computeEligiblePilgrims(b.amountPaid, b.season), 0);
  const insufficientBalanceCount = items.filter(
    (b) => computeEligiblePilgrims(b.amountPaid, b.season) < b.pilgrimCount
  ).length;

  const byEncadreur = ENCADREURS.map((enc) => {
    const encItems = items.filter((b) => b.encadreurId === enc.id);
    return {
      encadreurId: enc.id,
      encadreurName: enc.name,
      collected: encItems.reduce((sum, b) => sum + b.amountPaid, 0),
      pilgrims: encItems.reduce((sum, b) => sum + b.pilgrimCount, 0),
      bordereaux: encItems.length,
    };
  }).filter((row) => row.bordereaux > 0);

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
    const seasonItems = db.bordereaux.filter((b) => b.season === s.season);
    return {
      season: s.season,
      collected: seasonItems.reduce((sum, b) => sum + b.amountPaid, 0),
      pilgrims: seasonItems.reduce((sum, b) => sum + b.pilgrimCount, 0),
    };
  });

  return {
    season,
    totalCollected,
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
// Visa portal (Module 3)
// ---------------------------------------------------------------------------
export async function mockPilgrimLogin(idNumber, phone) {
  await delay(450);
  const record = db.bordereaux.find((b) => b.idNumber === idNumber && b.phone === phone);
  if (!record) {
    const error = new Error('NOT_FOUND');
    error.code = 'NOT_FOUND';
    throw error;
  }
  const eligiblePilgrims = computeEligiblePilgrims(record.amountPaid, record.season);
  const officialPrice = getSeason(record.season).officialPrice;
  return {
    ...record,
    officialPrice,
    eligiblePilgrims,
    isEligible: eligiblePilgrims >= record.pilgrimCount,
    balance: record.amountPaid - record.pilgrimCount * officialPrice,
  };
}

export async function mockEncadreurLogin(username, password) {
  await delay(400);
  const user = db.users.find((u) => u.username === username && u.password === password && u.role === 'ENCADREUR');
  if (!user) {
    const error = new Error('INVALID_CREDENTIALS');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }
  const { password: _pw, ...safeUser } = user;
  return { token: fakeJwt(user), user: safeUser };
}

export async function mockGetEncadreurGroup(encadreurId) {
  await delay(400);
  const items = db.bordereaux.filter((b) => b.encadreurId === encadreurId);
  const officialPrice = getSeason().officialPrice;
  return items.map((b) => ({
    ...b,
    eligiblePilgrims: computeEligiblePilgrims(b.amountPaid, b.season),
    isComplete: b.amountPaid >= b.pilgrimCount * officialPrice,
  }));
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
