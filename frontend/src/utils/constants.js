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

// Liste officielle des encadreurs (référentiel — géré par le Gestionnaire Hadj).
export const ENCADREURS = [
  { id: 'ENC-001', name: 'El Hadj Oumarou Sanda', region: 'Nord' },
  { id: 'ENC-002', name: 'El Hadj Bello Ibrahim', region: 'Extrême-Nord' },
  { id: 'ENC-003', name: 'Hadja Fatimatou Njoya', region: 'Ouest' },
  { id: 'ENC-004', name: 'El Hadj Souleymanou Abba', region: 'Adamaoua' },
  { id: 'ENC-005', name: 'Hadja Aïssatou Bakari', region: 'Centre' },
  { id: 'ENC-006', name: 'El Hadj Moussa Alioum', region: 'Littoral' },
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

export const CURRENT_SEASON = 2027;

export const DEFAULT_OFFICIAL_PRICE = 3_500_000; // FCFA — modifiable par le Gestionnaire Hadj

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
