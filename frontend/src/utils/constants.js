// Les 10 régions administratives du Cameroun.
export const REGIONS = [
  'Adamaoua',
  'Centre',
  'Est',
  'Extrême-Nord',
  'Littoral',
  'Nord',
  'Nord-Ouest',
  'Ouest',
  'Sud',
  'Sud-Ouest',
];

export const PILGRIM_TYPES = ['PELERIN', 'ENCADREUR_AVEC_COMMISSION', 'ENCADREUR_SANS_COMMISSION', 'OFFICIEL', 'GUH'];

// Seuls les encadreurs inscrivent plusieurs pèlerins sur un même bordereau :
// pour tous les autres types le nombre de pèlerins vaut 1, et le champ
// correspondant est masqué dans les formulaires d'inscription.
export const ENCADREUR_PILGRIM_TYPES = ['ENCADREUR_AVEC_COMMISSION', 'ENCADREUR_SANS_COMMISSION'];

export function isEncadreurPilgrimType(pilgrimType) {
  return ENCADREUR_PILGRIM_TYPES.includes(pilgrimType);
}

export const PILGRIM_STATUSES = ['NOUVEAU', 'RECURRENT'];

export const VISA_STATUSES = ['EN_ATTENTE', 'EN_COURS', 'ACCORDE', 'REFUSE', 'COMPLEMENT_REQUIS'];

export const VISA_STATUS_COLORS = {
  EN_ATTENTE: { bg: 'bg-visa-pending/15', text: 'text-yellow-800', dot: 'bg-visa-pending' },
  EN_COURS: { bg: 'bg-visa-progress/15', text: 'text-blue-800', dot: 'bg-visa-progress' },
  ACCORDE: { bg: 'bg-visa-granted/15', text: 'text-green-800', dot: 'bg-visa-granted' },
  REFUSE: { bg: 'bg-visa-refused/15', text: 'text-red-800', dot: 'bg-visa-refused' },
  COMPLEMENT_REQUIS: { bg: 'bg-visa-complement/15', text: 'text-orange-800', dot: 'bg-visa-complement' },
};

export const ROLES = {
  SUPERVISEUR: 'SUPERVISEUR',
  GESTIONNAIRE_HADJ: 'GESTIONNAIRE_HADJ',
  OPERATEUR_HADJ: 'OPERATEUR_HADJ',
  ENCADREUR: 'ENCADREUR',
  ADMIN_DSI: 'ADMIN_DSI',
};

// Séparation des rôles : qui peut créer quel profil.
// L'ADMIN_DSI crée tous les profils ; un superviseur crée gestionnaires et
// agents (jamais l'inverse) ; un gestionnaire crée agents et encadreurs ;
// un agent ne crée que des encadreurs. Un encadreur ne crée aucun compte
// (il inscrit uniquement des pèlerins depuis son portail).
export const CREATABLE_ROLES = {
  ADMIN_DSI: ['SUPERVISEUR', 'GESTIONNAIRE_HADJ', 'OPERATEUR_HADJ', 'ENCADREUR', 'ADMIN_DSI'],
  SUPERVISEUR: ['GESTIONNAIRE_HADJ', 'OPERATEUR_HADJ'],
  GESTIONNAIRE_HADJ: ['OPERATEUR_HADJ', 'ENCADREUR'],
  OPERATEUR_HADJ: ['ENCADREUR'],
  ENCADREUR: [],
};

export function getCreatableRoles(actorRole) {
  return CREATABLE_ROLES[actorRole] || [];
}

export function canCreateRole(actorRole, targetRole) {
  return getCreatableRoles(actorRole).includes(targetRole);
}

// Les « clients » (pèlerins) sont créés par le gestionnaire, l'agent, l'encadreur
// (via son portail) et l'admin — mais pas par le superviseur, qui supervise.
export const ROLES_CREATING_CLIENTS = ['ADMIN_DSI', 'GESTIONNAIRE_HADJ', 'OPERATEUR_HADJ', 'ENCADREUR'];

export function canCreateClients(actorRole) {
  return ROLES_CREATING_CLIENTS.includes(actorRole);
}

// Page d'accueil par rôle une fois connecté (utilisé par le routeur et par le
// clic sur le logo dans le header).
export const ROLE_HOME = {
  SUPERVISEUR: '/dashboard',
  GESTIONNAIRE_HADJ: '/dashboard',
  ADMIN_DSI: '/dashboard',
  OPERATEUR_HADJ: '/bordereaux',
  ENCADREUR: '/visa/encadreur',
};

export const CURRENT_SEASON = 2027;

export const DEFAULT_OFFICIAL_PRICE = 3_500_000; // FCFA — valeur par défaut, modifiable par type par le Gestionnaire Hadj

export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const VERSEMENT_METHODS = [
  'MOBILE_MONEY_ORANGE',
  'MOBILE_MONEY_MTN',
  'SARA',
  'E_FIRST',
  'VIREMENT',
  'AGENCE',
  'AUTRE',
];

export const VERSEMENT_STATUSES = ['PENDING', 'VALIDE', 'REJETE'];

export const VERSEMENT_STATUS_COLORS = {
  PENDING: { bg: 'bg-visa-pending/15', text: 'text-yellow-800', dot: 'bg-visa-pending' },
  VALIDE: { bg: 'bg-visa-granted/15', text: 'text-green-800', dot: 'bg-visa-granted' },
  REJETE: { bg: 'bg-visa-refused/15', text: 'text-red-800', dot: 'bg-visa-refused' },
};

export const AGENCIES = [
  'Yaoundé - Siège',
  'Yaoundé - Bastos',
  'Douala - Akwa',
  'Douala - Bonanjo',
  'Garoua - Centre',
  'Maroua - Centre',
  'Bafoussam - Centre',
  'Ngaoundéré - Centre',
];

// Code agence (5 caractères) tel qu'imprimé sur le QR code du bordereau de
// versement papier — permet de retrouver automatiquement l'agence à partir
// d'un code scanné.
export const AGENCY_CODES = {
  'Yaoundé - Siège': '00001',
  'Yaoundé - Bastos': '00002',
  'Douala - Akwa': '00003',
  'Douala - Bonanjo': '00004',
  'Garoua - Centre': '00005',
  'Maroua - Centre': '00006',
  'Bafoussam - Centre': '00007',
  'Ngaoundéré - Centre': '00008',
};

export function getAgencyByCode(code) {
  const entry = Object.entries(AGENCY_CODES).find(([, value]) => value === code);
  return entry ? entry[0] : null;
}
