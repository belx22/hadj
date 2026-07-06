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

export const PILGRIM_TYPES = ['PELERIN', 'ENCADREUR', 'OFFICIEL', 'GUH'];

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

export const VERSEMENT_METHODS = ['MOBILE_MONEY_ORANGE', 'MOBILE_MONEY_MTN', 'AGENCE'];

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
