// Construction des lignes des modèles d'import qui portent sur des clients
// (pèlerins) déjà enregistrés. Plutôt qu'un modèle vide, on pré-remplit le
// fichier avec les clients présents et leur statut courant : l'opérateur
// télécharge, corrige seulement ce qui change, puis réimporte.
//
// IMPORTANT : les clés d'objet deviennent les en-têtes du fichier. Elles doivent
// rester alignées avec les colonnes attendues par les parseurs d'import de
// chaque page (`idNumber`, `status`, `deposited`, `Reference`, `Statut`…), sinon
// le fichier généré ne serait pas relu correctement. Les colonnes en clair
// (« Pelerin », « Client ») ne servent qu'à la lisibilité : les parseurs les
// ignorent.

const fullName = (client) => `${client.pilgrimFirstName ?? ''} ${client.pilgrimLastName ?? ''}`.trim();

// Statuts visa (page Clients). Colonnes lues à l'import : idNumber, status, note.
export function buildVisaStatusTemplateRows(clients) {
  return clients.map((client) => ({
    Pelerin: fullName(client),
    idNumber: client.idNumber,
    status: client.visaStatus,
    note: '',
  }));
}

// Dépôts de passeports (page Attestations et portail encadreur). Colonnes lues à
// l'import : idNumber, deposited. Le statut courant est traduit en OUI/NON.
// `items` accepte aussi bien la forme « attestations » (pilgrimName,
// passportDeposited) que la forme « bordereau » (pilgrimFirstName/LastName).
export function buildPassportDepositTemplateRows(items) {
  return items.map((item) => ({
    Pelerin: item.pilgrimName ?? fullName(item),
    idNumber: item.idNumber,
    deposited: item.passportDeposited ? 'OUI' : 'NON',
  }));
}

// Versements groupés (portail encadreur). Colonnes lues à l'import :
// pilgrimLastName, pilgrimFirstName, phone, amount. On liste les membres du
// groupe avec leur reste à verser (colonne d'information ignorée à l'import) ;
// la colonne amount reste vide, à renseigner avec le montant réellement versé.
export function buildGroupedPaymentTemplateRows(group) {
  return group.map((member) => ({
    pilgrimLastName: member.pilgrimLastName ?? '',
    pilgrimFirstName: member.pilgrimFirstName ?? '',
    phone: member.phone ?? '',
    ResteAVerser: Math.max((member.balance ?? 0) - (member.pendingAmount ?? 0), 0),
    amount: '',
  }));
}

// Statuts de paiement (page Validation des paiements, onglet En attente).
// Colonnes lues à l'import : Reference, Statut. On liste les versements en
// attente (référence + client) ; la colonne Statut reste vide, à renseigner
// avec la décision (VALIDE / REJETE).
export function buildPaymentStatusTemplateRows(pendingVersements) {
  return pendingVersements.map((versement) => ({
    Reference: versement.reference ?? '',
    Client: versement.pilgrimName ?? fullName(versement),
    Statut: '',
  }));
}
