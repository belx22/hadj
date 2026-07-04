import { CURRENT_SEASON, DEFAULT_OFFICIAL_PRICE, ENCADREURS } from '../utils/constants';

// Comptes de démonstration — espace agent / direction (mot de passe simplifié pour la démo).
export const SEED_USERS = [
  { id: 'U-1', username: 'superviseur', password: 'superviseur123', role: 'SUPERVISEUR', name: 'Marie Etoundi', agency: 'Yaoundé - Siège' },
  { id: 'U-2', username: 'gestionnaire', password: 'gestionnaire123', role: 'GESTIONNAIRE_HADJ', name: 'Ibrahim Njoya', agency: 'Yaoundé - Siège' },
  { id: 'U-3', username: 'operateur', password: 'operateur123', role: 'OPERATEUR_HADJ', name: 'Paul Mbarga', agency: 'Douala - Akwa' },
  { id: 'U-4', username: 'encadreur1', password: 'encadreur123', role: 'ENCADREUR', name: 'El Hadj Oumarou Sanda', encadreurId: 'ENC-001' },
  { id: 'U-5', username: 'admin', password: 'admin123', role: 'ADMIN_DSI', name: 'Sandrine Fouda', agency: 'Yaoundé - Siège' },
];

export const SEED_SEASONS = [
  { season: CURRENT_SEASON, officialPrice: DEFAULT_OFFICIAL_PRICE, isOpen: true },
  { season: CURRENT_SEASON - 1, officialPrice: 3_200_000, isOpen: false },
];

const VISA_CYCLE = ['EN_ATTENTE', 'EN_COURS', 'ACCORDE', 'REFUSE', 'COMPLEMENT_REQUIS'];

function buildBordereau(index, overrides) {
  const encadreur = ENCADREURS[index % ENCADREURS.length];
  const base = {
    id: `BOR-${String(index + 1).padStart(4, '0')}`,
    reference: `CPT-${100000 + index}`,
    pilgrimLastName: overrides.pilgrimLastName,
    pilgrimFirstName: overrides.pilgrimFirstName,
    phone: overrides.phone,
    idNumber: overrides.idNumber,
    region: encadreur.region,
    agency: overrides.agency,
    encadreurId: encadreur.id,
    pilgrimType: overrides.pilgrimType || 'PELERIN',
    pilgrimStatus: overrides.pilgrimStatus || 'NOUVEAU',
    pilgrimCount: overrides.pilgrimCount || 1,
    season: CURRENT_SEASON,
    receiptNumber: `RC-${2000 + index}`,
    onlinePriority: Boolean(overrides.onlinePriority),
    createdAt: overrides.createdAt,
    amountPaid: overrides.amountPaid,
    visaStatus: overrides.visaStatus || VISA_CYCLE[index % VISA_CYCLE.length],
  };
  return base;
}

export const SEED_BORDEREAUX = [
  buildBordereau(0, { pilgrimLastName: 'Abba', pilgrimFirstName: 'Fadimatou', phone: '699112233', idNumber: '1002345678', agency: 'Garoua - Centre', amountPaid: 3_500_000, createdAt: '2027-01-12', onlinePriority: true, visaStatus: 'ACCORDE' }),
  buildBordereau(1, { pilgrimLastName: 'Bakari', pilgrimFirstName: 'Oumar', phone: '677889900', idNumber: '1002345679', agency: 'Maroua - Centre', amountPaid: 1_750_000, createdAt: '2027-01-15', visaStatus: 'EN_COURS' }),
  buildBordereau(2, { pilgrimLastName: 'Njoya', pilgrimFirstName: 'Aïcha', phone: '655667788', idNumber: '1002345680', agency: 'Bafoussam - Centre', amountPaid: 3_500_000, createdAt: '2027-01-18', pilgrimStatus: 'RECURRENT', visaStatus: 'EN_ATTENTE' }),
  buildBordereau(3, { pilgrimLastName: 'Mbarga', pilgrimFirstName: 'Jean', phone: '691223344', idNumber: '1002345681', agency: 'Yaoundé - Bastos', amountPaid: 7_000_000, createdAt: '2027-01-20', pilgrimCount: 2, visaStatus: 'COMPLEMENT_REQUIS' }),
  buildBordereau(4, { pilgrimLastName: 'Sanda', pilgrimFirstName: 'Ibrahim', phone: '699887766', idNumber: '1002345682', agency: 'Douala - Akwa', amountPaid: 900_000, createdAt: '2027-01-22', visaStatus: 'REFUSE' }),
  buildBordereau(5, { pilgrimLastName: 'Alioum', pilgrimFirstName: 'Halima', phone: '677554433', idNumber: '1002345683', agency: 'Douala - Bonanjo', amountPaid: 3_500_000, createdAt: '2027-01-25', onlinePriority: true, visaStatus: 'ACCORDE' }),
  buildBordereau(6, { pilgrimLastName: 'Fouda', pilgrimFirstName: 'Estelle', phone: '655112299', idNumber: '1002345684', agency: 'Yaoundé - Siège', amountPaid: 2_100_000, createdAt: '2027-02-02', visaStatus: 'EN_COURS' }),
  buildBordereau(7, { pilgrimLastName: 'Issa', pilgrimFirstName: 'Moussa', phone: '699009988', idNumber: '1002345685', agency: 'Ngaoundéré - Centre', amountPaid: 3_500_000, createdAt: '2027-02-05', pilgrimType: 'ENCADREUR', visaStatus: 'ACCORDE' }),
  buildBordereau(8, { pilgrimLastName: 'Betare', pilgrimFirstName: 'Sara', phone: '677001122', idNumber: '1002345686', agency: 'Garoua - Centre', amountPaid: 500_000, createdAt: '2027-02-10', visaStatus: 'EN_ATTENTE' }),
  buildBordereau(9, { pilgrimLastName: 'Zang', pilgrimFirstName: 'Pierre', phone: '691334455', idNumber: '1002345687', agency: 'Yaoundé - Bastos', amountPaid: 3_500_000, createdAt: '2027-02-14', pilgrimStatus: 'RECURRENT', visaStatus: 'ACCORDE' }),
];

// Historique de versements associé à chaque bordereau (pour le portail pèlerin).
export function buildVersementsFor(bordereau) {
  if (bordereau.amountPaid >= bordereau.pilgrimCount * DEFAULT_OFFICIAL_PRICE) {
    const half = Math.round(bordereau.amountPaid / 2);
    return [
      { date: bordereau.createdAt, amount: half, receiptNumber: `${bordereau.receiptNumber}-A` },
      { date: bordereau.createdAt, amount: bordereau.amountPaid - half, receiptNumber: `${bordereau.receiptNumber}-B` },
    ];
  }
  return [{ date: bordereau.createdAt, amount: bordereau.amountPaid, receiptNumber: bordereau.receiptNumber }];
}

export const SEED_AUDIT_LOGS = [
  { id: 'AUD-1', action: 'CREATION_BORDEREAU', target: 'BOR-0001', user: 'operateur', timestamp: '2027-01-12T09:14:00' },
  { id: 'AUD-2', action: 'CHANGEMENT_STATUT_VISA', target: 'BOR-0006', user: 'gestionnaire', timestamp: '2027-02-01T11:02:00' },
  { id: 'AUD-3', action: 'MODIFICATION_PRIX_OFFICIEL', target: `Saison ${CURRENT_SEASON}`, user: 'gestionnaire', timestamp: '2027-01-05T08:30:00' },
];
