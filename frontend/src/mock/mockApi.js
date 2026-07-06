import {
  SEED_USERS,
  SEED_SEASONS,
  SEED_BORDEREAUX,
  SEED_AUDIT_LOGS,
  SEED_ENCADREURS,
} from './seedData';
import { DEFAULT_OFFICIAL_PRICE, REGIONS, VISA_STATUSES } from '../utils/constants';

const VISA_STATUSES_SET = new Set(VISA_STATUSES);

const STORAGE_KEY = 'copilote-hadj-mock-db-v2';
const NETWORK_DELAY = 350;

function seedDb() {
  return {
    users: SEED_USERS,
    seasons: SEED_SEASONS,
    bordereaux: SEED_BORDEREAUX,
    auditLogs: SEED_AUDIT_LOGS,
    encadreurs: SEED_ENCADREURS,
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

function getPrice(season, pilgrimType) {
  const seasonData = getSeason(season);
  return seasonData?.prices?.[pilgrimType] ?? DEFAULT_OFFICIAL_PRICE;
}

function computeValidatedAmount(bordereau) {
  return bordereau.versements.filter((v) => v.status === 'VALIDE').reduce((sum, v) => sum + v.amount, 0);
}

function computePendingAmount(bordereau) {
  return bordereau.versements.filter((v) => v.status === 'PENDING').reduce((sum, v) => sum + v.amount, 0);
}

function computeTargetAmount(bordereau) {
  return bordereau.pilgrimCount * getPrice(bordereau.season, bordereau.pilgrimType);
}

function decorateBordereau(bordereau) {
  const amountPaid = computeValidatedAmount(bordereau);
  const pendingAmount = computePendingAmount(bordereau);
  const targetAmount = computeTargetAmount(bordereau);
  const price = getPrice(bordereau.season, bordereau.pilgrimType);
  const eligiblePilgrims = Math.floor(amountPaid / (price || 1));
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

  const price = getPrice(payload.season, payload.pilgrimType);
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

  notifyPilgrim(
    record,
    `Copilote Hadj: votre inscription ${id} est enregistrée. Votre code de paiement est ${id}. Connectez-vous pour effectuer votre versement.`,
    'Inscription Hadj enregistrée'
  );

  return decorateBordereau(record);
}

// ---------------------------------------------------------------------------
// Versements en ligne (Mobile Money / référence agence) — au compte-goutte
// ---------------------------------------------------------------------------
export async function mockCreateVersementOnline(idNumber, phone, { method, amount, reference, agency, receiptImage, qrData }) {
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
    status: 'PENDING',
    createdAt,
    validatedAt: null,
    validatedBy: null,
    note: null,
  };

  bordereau.versements = [...bordereau.versements, newVersement];
  addAudit('DECLARATION_VERSEMENT', bordereau.id, idNumber);
  persist();

  return decorateBordereau(bordereau);
}

// ---------------------------------------------------------------------------
// Validation des paiements (Admin DSI / Gestionnaire / Superviseur)
// ---------------------------------------------------------------------------
export async function mockGetPendingVersements() {
  await delay(350);
  const rows = [];
  db.bordereaux.forEach((bordereau) => {
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
        });
      });
  });
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// Historique des paiements déjà traités (validés ou rejetés), filtrable par
// statut et par période (du/au, ou un jour précis en renseignant from = to).
export async function mockGetVersementsHistory({ status, from, to } = {}) {
  await delay(350);
  const rows = [];
  db.bordereaux.forEach((bordereau) => {
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
        });
      });
  });

  let filtered = rows;
  if (status) filtered = filtered.filter((v) => v.status === status);
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
}

export async function mockChangeVisaStatus(bordereauId, newStatus, note, actor) {
  await delay(400);
  const bordereau = db.bordereaux.find((b) => b.id === bordereauId);
  if (!bordereau) throw new Error('NOT_FOUND');
  applyVisaStatusChange(bordereau, newStatus, note, actor?.username);
  persist();
  return decorateBordereau(bordereau);
}

// Import en masse des statuts de visa depuis un fichier Excel/CSV externe
// (colonnes attendues : idNumber, status, note facultative). Réutilise la même
// logique de notification/audit que le changement de statut unitaire.
export async function mockImportVisaStatuses(rows, actor) {
  await delay(600);
  const updated = [];
  const notFound = [];
  const invalidStatus = [];

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
    applyVisaStatusChange(bordereau, status, row.note, actor?.username);
    updated.push({ bordereauId: bordereau.id, idNumber, status });
  });

  if (updated.length > 0) {
    addAudit('IMPORT_STATUTS_VISA', `${updated.length} dossier(s)`, actor?.username || 'system');
    persist();
  }

  return { updated, notFound, invalidStatus };
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

export async function mockCreateEncadreur(payload, actor) {
  await delay(300);
  const id = `ENC-${String(db.encadreurs.length + 1).padStart(3, '0')}`;
  const record = { id, active: true, ...payload };
  db.encadreurs = [...db.encadreurs, record];
  addAudit('CREATION_ENCADREUR', id, actor?.username || 'system');
  persist();
  return record;
}

export async function mockUpdateEncadreur(id, updates, actor) {
  await delay(300);
  db.encadreurs = db.encadreurs.map((e) => (e.id === id ? { ...e, ...updates } : e));
  addAudit('MODIFICATION_ENCADREUR', id, actor?.username || 'system');
  persist();
  return db.encadreurs.find((e) => e.id === id);
}

// Import en masse depuis un fichier Excel/CSV (colonnes attendues : name, region).
// Les lignes dont le nom existe déjà (insensible à la casse) sont ignorées ;
// les lignes dont la région ne fait pas partie du référentiel sont en erreur.
export async function mockImportEncadreurs(rows, actor) {
  await delay(500);
  const created = [];
  const skipped = [];
  const errors = [];

  rows.forEach((row, index) => {
    const name = String(row.name || '').trim();
    const region = String(row.region || '').trim();

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

    const id = `ENC-${String(db.encadreurs.length + created.length + 1).padStart(3, '0')}`;
    const record = { id, name, region, active: true };
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

export async function mockCreateUser(payload, actor) {
  await delay(400);
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

export async function mockUpdateUser(id, updates, actor) {
  await delay(350);
  db.users = db.users.map((u) => (u.id === id ? { ...u, ...updates } : u));
  addAudit('MODIFICATION_UTILISATEUR', id, actor?.username || 'system');
  persist();
  const { password: _pw, ...safe } = db.users.find((u) => u.id === id);
  return safe;
}

// ---------------------------------------------------------------------------
// Paramétrage des saisons Hadj (mois/année + montant par type de pèlerin)
// ---------------------------------------------------------------------------
export async function mockGetSeasons() {
  await delay(150);
  return db.seasons;
}

export async function mockGetOfficialPrice(season, pilgrimType) {
  await delay(150);
  return getPrice(season, pilgrimType);
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
export async function mockPilgrimLogin(idNumber, phone) {
  await delay(450);
  const record = db.bordereaux.find((b) => b.idNumber === idNumber && b.phone === phone);
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
