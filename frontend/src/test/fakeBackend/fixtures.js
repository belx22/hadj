import { CURRENT_SEASON, DEFAULT_OFFICIAL_PRICE } from '../../utils/constants';

// Comptes de démonstration — espace agent / direction (mot de passe simplifié pour la démo).
// `email` sert à la réinitialisation du mot de passe par code OTP.
export const SEED_USERS = [
  { id: 'U-1', username: 'superviseur', password: 'superviseur123', role: 'SUPERVISEUR', name: 'Marie Etoundi', email: 'marie.etoundi@afrilandfirstbank.cm', agency: 'Yaoundé - Siège', active: true },
  { id: 'U-2', username: 'gestionnaire', password: 'gestionnaire123', role: 'GESTIONNAIRE_HADJ', name: 'Ibrahim Njoya', email: 'ibrahim.njoya@afrilandfirstbank.cm', agency: 'Yaoundé - Siège', active: true },
  { id: 'U-3', username: 'operateur', password: 'operateur123', role: 'OPERATEUR_HADJ', name: 'Paul Mbarga', email: 'paul.mbarga@afrilandfirstbank.cm', agency: 'Douala - Akwa', active: true },
  { id: 'U-4', username: 'encadreur1', password: 'encadreur123', role: 'ENCADREUR', name: 'El Hadj Oumarou Sanda', email: 'oumarou.sanda@afrilandfirstbank.cm', encadreurId: 'ENC-001', active: true },
  { id: 'U-5', username: 'admin', password: 'admin123', role: 'ADMIN_DSI', name: 'Sandrine Fouda', email: 'sandrine.fouda@afrilandfirstbank.cm', agency: 'Yaoundé - Siège', active: true },
];

// Liste officielle des encadreurs (référentiel — géré par le Gestionnaire Hadj / Admin DSI).
// `code` : identifiant alphanumérique unique à 3 caractères, inclus dans le code de
// paiement remis au pèlerin pour identifier sans ambiguïté son encadreur.
// `idNumber` : n° de pièce d'identité de l'encadreur, utilisé pour le reconnaître
// lors de son auto-inscription en ligne (distinct du passeport du pèlerin).
export const SEED_ENCADREURS = [
  { id: 'ENC-001', name: 'El Hadj Oumarou Sanda', region: 'Nord', code: 'OS1', idNumber: '110234501', active: true },
  { id: 'ENC-002', name: 'El Hadj Bello Ibrahim', region: 'Extrême-Nord', code: 'BI2', idNumber: '110234502', active: true },
  { id: 'ENC-003', name: 'Hadja Fatimatou Njoya', region: 'Ouest', code: 'FN3', idNumber: '110234503', active: true },
  { id: 'ENC-004', name: 'El Hadj Souleymanou Abba', region: 'Adamaoua', code: 'SA4', idNumber: '110234504', active: true },
  { id: 'ENC-005', name: 'Hadja Aïssatou Bakari', region: 'Centre', code: 'AB5', idNumber: '110234505', active: true },
  { id: 'ENC-006', name: 'El Hadj Moussa Alioum', region: 'Littoral', code: 'MA6', idNumber: '110234506', active: true },
];

// Montant officiel du Hadj, par saison et par type de pèlerin — paramétrable par le
// Gestionnaire Hadj. `officialPriceExcludingCommission` et `commissionPerPilgrim`
// servent au calcul des commissions des encadreurs de type "avec commission" :
// place acquise = versements validés ÷ prix hors commission ; le reliquat au-delà
// des places acquises revient à l'encadreur au titre de sa commission.
export const SEED_SEASONS = [
  {
    season: CURRENT_SEASON,
    month: 6,
    year: CURRENT_SEASON,
    isOpen: true,
    prices: {
      PELERIN: DEFAULT_OFFICIAL_PRICE,
      ENCADREUR: DEFAULT_OFFICIAL_PRICE,
      OFFICIEL: 3_000_000,
      GUH: 3_000_000,
    },
    officialPriceExcludingCommission: 3_300_000,
    commissionPerPilgrim: 200_000,
  },
  {
    season: CURRENT_SEASON - 1,
    month: 6,
    year: CURRENT_SEASON - 1,
    isOpen: false,
    prices: {
      PELERIN: 3_200_000,
      ENCADREUR: 3_200_000,
      OFFICIEL: 2_800_000,
      GUH: 2_800_000,
    },
    officialPriceExcludingCommission: 3_000_000,
    commissionPerPilgrim: 200_000,
  },
];

let versementCounter = 0;
function versement({ amount, method = 'AGENCE', reference, agency, status = 'VALIDE', createdAt, validatedBy }) {
  versementCounter += 1;
  return {
    id: `VER-${String(versementCounter).padStart(4, '0')}`,
    amount,
    method,
    reference: reference || `RC-${1000 + versementCounter}`,
    agency: agency || null,
    status,
    createdAt,
    validatedAt: status === 'PENDING' ? null : createdAt,
    validatedBy: status === 'PENDING' ? null : validatedBy || 'gestionnaire',
    note: null,
  };
}

// Bordereaux (souscriptions) de démonstration : mélange de saisies agent en agence et
// d'auto-inscriptions en ligne avec paiement par Mobile Money / référence agence.
export const SEED_BORDEREAUX = [
  {
    id: 'BOR-0001', reference: 'CPT-100000', source: 'AGENT',
    pilgrimLastName: 'Abba', pilgrimFirstName: 'Fadimatou', phone: '699112233', idNumber: '1002345678',
    region: 'Nord', agency: 'Garoua - Centre', encadreurId: 'ENC-001', pilgrimType: 'PELERIN', pilgrimStatus: 'NOUVEAU',
    pilgrimCount: 1, season: CURRENT_SEASON, receiptNumber: 'RC-2000', onlinePriority: true, createdAt: '2027-01-12',
    visaStatus: 'ACCORDE',
    versements: [versement({ amount: 3_500_000, method: 'AGENCE', agency: 'Garoua - Centre', createdAt: '2027-01-12' })],
    notifications: [{ date: '2027-02-01', message: 'Votre visa a été accordé.' }],
    statusHistory: [
      { status: 'EN_ATTENTE', date: '2027-01-12' },
      { status: 'EN_COURS', date: '2027-01-20' },
      { status: 'ACCORDE', date: '2027-02-01' },
    ],
  },
  {
    id: 'BOR-0002', reference: 'CPT-100001', source: 'AGENT',
    pilgrimLastName: 'Bakari', pilgrimFirstName: 'Oumar', phone: '677889900', idNumber: '1002345679',
    region: 'Extrême-Nord', agency: 'Maroua - Centre', encadreurId: 'ENC-002', pilgrimType: 'PELERIN', pilgrimStatus: 'NOUVEAU',
    pilgrimCount: 1, season: CURRENT_SEASON, receiptNumber: 'RC-2001', onlinePriority: false, createdAt: '2027-01-15',
    visaStatus: 'EN_COURS',
    versements: [versement({ amount: 1_750_000, method: 'AGENCE', agency: 'Maroua - Centre', createdAt: '2027-01-15' })],
    notifications: [{ date: '2027-01-20', message: 'Votre dossier est en cours de traitement.' }],
    statusHistory: [
      { status: 'EN_ATTENTE', date: '2027-01-15' },
      { status: 'EN_COURS', date: '2027-01-20' },
    ],
  },
  {
    id: 'BOR-0003', reference: 'CPT-100002', source: 'AGENT',
    pilgrimLastName: 'Njoya', pilgrimFirstName: 'Aïcha', phone: '655667788', idNumber: '1002345680',
    region: 'Ouest', agency: 'Bafoussam - Centre', encadreurId: 'ENC-003', pilgrimType: 'PELERIN', pilgrimStatus: 'RECURRENT',
    pilgrimCount: 1, season: CURRENT_SEASON, receiptNumber: 'RC-2002', onlinePriority: false, createdAt: '2027-01-18',
    visaStatus: 'EN_ATTENTE',
    versements: [versement({ amount: 3_500_000, method: 'AGENCE', agency: 'Bafoussam - Centre', createdAt: '2027-01-18' })],
    notifications: [],
    statusHistory: [{ status: 'EN_ATTENTE', date: '2027-01-18' }],
  },
  {
    id: 'BOR-0004', reference: 'CPT-100003', source: 'AGENT',
    pilgrimLastName: 'Mbarga', pilgrimFirstName: 'Jean', phone: '691223344', idNumber: '1002345681',
    region: 'Centre', agency: 'Yaoundé - Bastos', encadreurId: 'ENC-005', pilgrimType: 'PELERIN', pilgrimStatus: 'NOUVEAU',
    pilgrimCount: 2, season: CURRENT_SEASON, receiptNumber: 'RC-2003', onlinePriority: false, createdAt: '2027-01-20',
    visaStatus: 'COMPLEMENT_REQUIS',
    versements: [versement({ amount: 7_000_000, method: 'AGENCE', agency: 'Yaoundé - Bastos', createdAt: '2027-01-20' })],
    notifications: [{ date: '2027-02-03', message: 'Complément requis : merci de fournir une copie de passeport lisible.' }],
    statusHistory: [
      { status: 'EN_ATTENTE', date: '2027-01-20' },
      { status: 'EN_COURS', date: '2027-01-27' },
      { status: 'COMPLEMENT_REQUIS', date: '2027-02-03' },
    ],
  },
  {
    id: 'BOR-0005', reference: 'CPT-100004', source: 'AGENT',
    pilgrimLastName: 'Sanda', pilgrimFirstName: 'Ibrahim', phone: '699887766', idNumber: '1002345682',
    region: 'Littoral', agency: 'Douala - Akwa', encadreurId: 'ENC-006', pilgrimType: 'PELERIN', pilgrimStatus: 'NOUVEAU',
    pilgrimCount: 1, season: CURRENT_SEASON, receiptNumber: 'RC-2004', onlinePriority: false, createdAt: '2027-01-22',
    visaStatus: 'REFUSE',
    versements: [versement({ amount: 900_000, method: 'AGENCE', agency: 'Douala - Akwa', createdAt: '2027-01-22' })],
    notifications: [{ date: '2027-02-05', message: 'Votre demande de visa a été refusée.' }],
    statusHistory: [
      { status: 'EN_ATTENTE', date: '2027-01-22' },
      { status: 'EN_COURS', date: '2027-01-29' },
      { status: 'REFUSE', date: '2027-02-05' },
    ],
  },
  {
    id: 'BOR-0006', reference: 'CPT-100005', source: 'AGENT',
    pilgrimLastName: 'Alioum', pilgrimFirstName: 'Halima', phone: '677554433', idNumber: '1002345683',
    region: 'Littoral', agency: 'Douala - Bonanjo', encadreurId: 'ENC-006', pilgrimType: 'PELERIN', pilgrimStatus: 'NOUVEAU',
    pilgrimCount: 1, season: CURRENT_SEASON, receiptNumber: 'RC-2005', onlinePriority: true, createdAt: '2027-01-25',
    visaStatus: 'ACCORDE',
    versements: [versement({ amount: 3_500_000, method: 'AGENCE', agency: 'Douala - Bonanjo', createdAt: '2027-01-25' })],
    notifications: [{ date: '2027-02-01', message: 'Votre visa a été accordé.' }],
    statusHistory: [
      { status: 'EN_ATTENTE', date: '2027-01-25' },
      { status: 'EN_COURS', date: '2027-01-28' },
      { status: 'ACCORDE', date: '2027-02-01' },
    ],
  },
  {
    id: 'BOR-0007', reference: null, source: 'ONLINE',
    pilgrimLastName: 'Fouda', pilgrimFirstName: 'Estelle', phone: '655112299', idNumber: '1002345684',
    region: 'Centre', agency: null, encadreurId: 'ENC-005', pilgrimType: 'PELERIN', pilgrimStatus: 'NOUVEAU',
    pilgrimCount: 1, season: CURRENT_SEASON, receiptNumber: 'RC-2006', onlinePriority: true, createdAt: '2027-02-02',
    visaStatus: 'EN_COURS',
    versements: [
      versement({ amount: 1_500_000, method: 'MOBILE_MONEY_ORANGE', reference: 'OM-84213590', createdAt: '2027-02-02' }),
      versement({ amount: 600_000, method: 'MOBILE_MONEY_MTN', reference: 'MTN-77012456', status: 'PENDING', createdAt: '2027-02-14' }),
    ],
    notifications: [{ date: '2027-02-02', message: 'Votre dossier est en cours de traitement.' }],
    statusHistory: [
      { status: 'EN_ATTENTE', date: '2027-02-02' },
      { status: 'EN_COURS', date: '2027-02-02' },
    ],
  },
  {
    id: 'BOR-0008', reference: 'CPT-100007', source: 'AGENT',
    pilgrimLastName: 'Issa', pilgrimFirstName: 'Moussa', phone: '699009988', idNumber: '1002345685',
    region: 'Adamaoua', agency: 'Ngaoundéré - Centre', encadreurId: 'ENC-004', pilgrimType: 'PELERIN', pilgrimStatus: 'NOUVEAU',
    includesEncadreurFees: true,
    pilgrimCount: 1, season: CURRENT_SEASON, receiptNumber: 'RC-2007', onlinePriority: false, createdAt: '2027-02-05',
    visaStatus: 'ACCORDE',
    versements: [versement({ amount: 3_500_000, method: 'AGENCE', agency: 'Ngaoundéré - Centre', createdAt: '2027-02-05' })],
    notifications: [{ date: '2027-02-20', message: 'Votre visa a été accordé.' }],
    statusHistory: [
      { status: 'EN_ATTENTE', date: '2027-02-05' },
      { status: 'EN_COURS', date: '2027-02-12' },
      { status: 'ACCORDE', date: '2027-02-20' },
    ],
  },
  {
    id: 'BOR-0009', reference: null, source: 'ONLINE',
    pilgrimLastName: 'Betare', pilgrimFirstName: 'Sara', phone: '677001122', idNumber: '1002345686',
    region: 'Nord', agency: null, encadreurId: 'ENC-001', pilgrimType: 'PELERIN', pilgrimStatus: 'NOUVEAU',
    pilgrimCount: 1, season: CURRENT_SEASON, receiptNumber: 'RC-2008', onlinePriority: true, createdAt: '2027-02-10',
    visaStatus: 'EN_ATTENTE',
    versements: [
      versement({ amount: 500_000, method: 'MOBILE_MONEY_ORANGE', reference: 'OM-84213820', createdAt: '2027-02-10' }),
      versement({ amount: 300_000, method: 'AGENCE', reference: 'BOR-AG-55219', agency: 'Garoua - Centre', status: 'PENDING', createdAt: '2027-02-18' }),
    ],
    notifications: [],
    statusHistory: [{ status: 'EN_ATTENTE', date: '2027-02-10' }],
  },
  {
    id: 'BOR-0010', reference: 'CPT-100009', source: 'AGENT',
    pilgrimLastName: 'Zang', pilgrimFirstName: 'Pierre', phone: '691334455', idNumber: '1002345687',
    region: 'Centre', agency: 'Yaoundé - Bastos', encadreurId: 'ENC-005', pilgrimType: 'PELERIN', pilgrimStatus: 'RECURRENT',
    pilgrimCount: 1, season: CURRENT_SEASON, receiptNumber: 'RC-2009', onlinePriority: false, createdAt: '2027-02-14',
    visaStatus: 'ACCORDE',
    versements: [versement({ amount: 3_500_000, method: 'AGENCE', agency: 'Yaoundé - Bastos', createdAt: '2027-02-14' })],
    notifications: [{ date: '2027-02-25', message: 'Votre visa a été accordé.' }],
    statusHistory: [
      { status: 'EN_ATTENTE', date: '2027-02-14' },
      { status: 'EN_COURS', date: '2027-02-19' },
      { status: 'ACCORDE', date: '2027-02-25' },
    ],
  },
];

export const SEED_AUDIT_LOGS = [
  { id: 'AUD-1', action: 'CREATION_BORDEREAU', target: 'BOR-0001', user: 'operateur', timestamp: '2027-01-12T09:14:00' },
  { id: 'AUD-2', action: 'CHANGEMENT_STATUT_VISA', target: 'BOR-0006', user: 'gestionnaire', timestamp: '2027-02-01T11:02:00' },
  { id: 'AUD-3', action: 'MODIFICATION_PRIX_OFFICIEL', target: `Saison ${CURRENT_SEASON}`, user: 'gestionnaire', timestamp: '2027-01-05T08:30:00' },
];
