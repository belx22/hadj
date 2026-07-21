import * as fake from './fakeBackend';

// Adaptateur axios utilisé UNIQUEMENT par les tests (installé dans src/test/setup.js).
// L'application, elle, ne connaît que le backend Spring Boot : la couche src/api/*
// ne fait que des appels HTTP. Ici on rejoue ces mêmes appels contre le faux backend
// en mémoire, en respectant le contrat réel :
//   - mêmes URLs que les @RestController,
//   - mêmes clés de réponse ({ duplicate }, { price }...),
//   - mêmes erreurs { code, message } + statut HTTP que GlobalExceptionHandler.
// Un test qui passe ici exerce donc le vrai chemin axios (intercepteurs compris).

// Statuts HTTP des codes métier, alignés sur les `new ApiException(...)` du backend.
const ERROR_STATUS = {
  INVALID_CREDENTIALS: 401,
  NOT_FOUND: 404,
  ENCADREUR_NOT_REGISTERED: 404,
  CODE_TAKEN: 409,
  DUPLICATE_PHONE: 409,
  DUPLICATE_PILGRIM: 409,
  REFERENCE_ALREADY_USED: 409,
  SEASON_EXISTS: 409,
  USERNAME_TAKEN: 409,
};

const USER_KEY = 'copilote-hadj-user';
// Le vrai backend déduit l'auteur d'une action du JWT ; ici on le déduit de la
// session stockée par l'application (ou un admin par défaut hors session).
const DEFAULT_ACTOR = { username: 'admin', role: 'ADMIN_DSI', name: 'Admin' };

function currentActor() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_ACTOR;
  } catch {
    return DEFAULT_ACTOR;
  }
}

const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));
const bool = (v, fallback = false) => (v === undefined ? fallback : String(v) === 'true');

// [méthode, motif d'URL, handler(ctx)] — ctx : { body, params, path, actor }.
// L'ordre compte : le premier motif qui correspond gagne.
const ROUTES = [
  // --- Auth ---
  ['POST', /^\/auth\/login\/verify-otp$/, ({ body }) => fake.verifyLoginOtp(body.username, body.otp)],
  ['POST', /^\/auth\/login$/, ({ body }) => fake.login(body.username, body.password)],
  ['POST', /^\/auth\/mot-de-passe-oublie$/, ({ body }) => fake.requestPasswordReset(body.identifier)],
  ['POST', /^\/auth\/reinitialiser-mot-de-passe$/, ({ body }) =>
    fake.resetPasswordWithOtp(body.identifier, body.otp, body.newPassword)],

  // --- Reporting ---
  ['GET', /^\/reporting$/, ({ params }) => fake.getReporting(params)],

  // --- Bordereaux ---
  ['GET', /^\/bordereaux\/check-duplicate$/, async ({ params }) => ({
    duplicate: await fake.checkDuplicate(params.idNumber, num(params.season)),
  })],
  ['GET', /^\/bordereaux$/, ({ params }) => fake.getBordereaux(params)],
  ['POST', /^\/bordereaux\/inscription-en-ligne$/, ({ body }) => fake.registerPilgrimOnline(body)],
  ['POST', /^\/bordereaux$/, ({ body, actor }) => fake.createBordereau(body, actor)],

  // --- Versements ---
  ['GET', /^\/versements\/en-attente$/, () => fake.getPendingVersements()],
  ['GET', /^\/versements\/historique$/, ({ params }) => fake.getVersementsHistory(params)],
  ['GET', /^\/versements\/groupes$/, () => fake.getGroupedPayments()],
  ['GET', /^\/versements\/remboursements$/, () => fake.getRefunds()],
  ['GET', /^\/versements\/beneficiaire\/([^/]+)$/, ({ path, params }) =>
    fake.lookupBeneficiary(path[1], num(params.season))],
  ['POST', /^\/versements\/groupe$/, ({ body }) =>
    fake.createGroupedVersementOnline(body.payerIdNumber, body.payerPhone, body)],
  ['POST', /^\/versements\/import-statuts$/, ({ body, actor }) =>
    fake.importPaymentStatusesByReference(body.rows, actor)],
  ['POST', /^\/versements\/rapprochement$/, ({ body, actor }) => fake.reconcilePayments(body.rows, actor)],
  ['POST', /^\/versements$/, ({ body }) => fake.createVersementOnline(body.idNumber, body.phone, body)],
  ['PUT', /^\/versements\/valider-en-masse$/, ({ body, actor }) => fake.bulkValidateVersements(body.items, actor)],
  ['PUT', /^\/versements\/([^/]+)\/valider$/, ({ path, body, actor }) =>
    fake.validateVersement(body.bordereauId, path[1], actor)],
  ['PUT', /^\/versements\/([^/]+)\/rejeter$/, ({ path, body, actor }) =>
    fake.rejectVersement(body.bordereauId, path[1], body.reason, actor)],
  ['PUT', /^\/versements\/([^/]+)\/rembourser$/, ({ path, body, actor }) =>
    fake.processRefund(body.bordereauId, path[1], body, actor)],

  // --- Visa / portails pèlerin & encadreur ---
  ['POST', /^\/visa\/pelerin\/login$/, ({ body }) => fake.pilgrimLogin(body.idNumber, body.phone)],
  ['GET', /^\/visa\/encadreur\/([^/]+)\/groupe$/, ({ path }) => fake.getEncadreurGroup(path[1])],
  ['POST', /^\/visa\/encadreur\/inscription$/, ({ body, actor }) =>
    fake.registerPilgrimByEncadreur(body, body.encadreurId, actor)],
  ['POST', /^\/visa\/encadreur\/([^/]+)\/import-versement-groupe$/, ({ path, body, actor }) =>
    fake.importGroupedVersementsByEncadreur(body.rows, path[1], body, actor)],
  ['POST', /^\/visa\/encadreur\/([^/]+)\/import$/, ({ path, body, actor }) =>
    fake.importPilgrims(body.rows, path[1], actor)],
  ['PUT', /^\/visa\/encadreur\/([^/]+)\/depots-passeports$/, ({ path, body, actor }) =>
    fake.setEncadreurPassportDeposits(path[1], body.bordereauIds, body.deposited, actor)],
  ['POST', /^\/visa\/import-statuts$/, ({ body, actor }) =>
    fake.importVisaStatuses(body.rows, actor, body.encadreurId)],
  ['GET', /^\/visa\/verification-bi$/, () => fake.checkStatusAnomalies()],
  ['PUT', /^\/visa\/statut-en-masse$/, ({ body, actor }) => fake.bulkChangeVisaStatus(body, actor)],
  ['PUT', /^\/visa\/([^/]+)\/statut$/, ({ path, body, actor }) =>
    fake.changeVisaStatus(path[1], body.status, body.note, actor)],

  // --- Référentiels ---
  ['GET', /^\/encadreurs\/commissions$/, ({ params }) => fake.getEncadreurCommissions(num(params.season))],
  ['GET', /^\/encadreurs$/, ({ params }) =>
    fake.getEncadreurs({ onlyActive: bool(params.onlyActive, true), region: params.region })],
  ['POST', /^\/encadreurs\/import$/, ({ body, actor }) => fake.importEncadreurs(body.rows, actor)],
  ['POST', /^\/encadreurs$/, ({ body, actor }) => fake.createEncadreur(body, actor)],
  ['PUT', /^\/encadreurs\/([^/]+)$/, ({ path, body, actor }) => fake.updateEncadreur(path[1], body, actor)],

  ['GET', /^\/saisons$/, () => fake.getSeasons()],
  ['POST', /^\/saisons$/, ({ body, actor }) => fake.createSeason(body, actor)],
  ['PUT', /^\/saisons\/([^/]+)$/, ({ path, body, actor }) => fake.updateSeason(num(path[1]), body, actor)],

  ['GET', /^\/utilisateurs$/, () => fake.getUsers()],
  ['POST', /^\/utilisateurs\/import$/, ({ body, actor }) => fake.importUsers(body.rows, actor)],
  ['POST', /^\/utilisateurs$/, ({ body, actor }) => fake.createUser(body, actor)],
  ['PUT', /^\/utilisateurs\/([^/]+)$/, ({ path, body, actor }) => fake.updateUser(path[1], body, actor)],

  ['GET', /^\/parametrage\/prix-officiel$/, async ({ params }) => ({
    price: await fake.getOfficialPrice(num(params.season), params.pilgrimType, bool(params.includesEncadreurFees)),
  })],
  ['GET', /^\/parametrage\/smtp$/, () => fake.getSmtpSettings()],
  ['PUT', /^\/parametrage\/smtp$/, ({ body, actor }) => fake.updateSmtpSettings(body, actor)],

  // --- Attestations & audit ---
  ['GET', /^\/attestations\/depots-passeports$/, ({ params }) => fake.getPassportDeposits(num(params.season))],
  ['POST', /^\/attestations\/depots-passeports\/import$/, ({ body, actor }) =>
    fake.importPassportDeposits(body.rows, body.season, actor)],
  ['PUT', /^\/attestations\/depots-passeports\/masse$/, ({ body, actor }) =>
    fake.bulkTogglePassportDeposit(body.bordereauIds, body.deposited, actor)],
  ['PUT', /^\/attestations\/depots-passeports\/([^/]+)$/, ({ path, body, actor }) =>
    fake.togglePassportDeposit(path[1], body.deposited, actor)],

  ['GET', /^\/audit$/, () => fake.getAuditLogs()],
];

function httpError(code, message, status, config) {
  const error = new Error(message || code);
  error.isAxiosError = true;
  error.config = config;
  error.response = { status, statusText: '', headers: {}, config, data: { code, message: message || code } };
  return error;
}

export async function fakeBackendAdapter(config) {
  const method = String(config.method || 'get').toUpperCase();
  // baseURL ('/api/v1') est préfixée par axios au moment de l'envoi : on ne
  // route que sur le chemin applicatif.
  const url = String(config.url || '').replace(/^\/api\/v1/, '').split('?')[0];
  const body = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : config.data || {};
  const params = config.params || {};

  const route = ROUTES.find(([m, pattern]) => m === method && pattern.test(url));
  if (!route) {
    throw httpError('NOT_FOUND', `Route non gérée par le faux backend : ${method} ${url}`, 404, config);
  }

  try {
    const data = await route[2]({ body, params, path: url.match(route[1]), actor: currentActor() });
    return { data, status: 200, statusText: 'OK', headers: {}, config, request: {} };
  } catch (err) {
    const code = err.code || 'INTERNAL_ERROR';
    throw httpError(code, err.message, ERROR_STATUS[code] ?? (code === 'INTERNAL_ERROR' ? 500 : 400), config);
  }
}
