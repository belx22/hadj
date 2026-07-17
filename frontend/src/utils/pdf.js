import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './formatters';
import afrilandLogo from '../assets/logo-afriland.png';

// Charge une image (asset Vite, même origine) pour l'incruster dans un PDF.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function addHeader(doc, title) {
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setFillColor(200, 16, 46);
  doc.rect(0, 22, 210, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('Afriland First Bank — Copilote Hadj', 14, 14);
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(12);
  doc.text(title, 14, 32);
}

/**
 * Export PDF générique d'une liste (encadreurs, clients, bordereaux, paiements).
 * Mise en page paysage : les listes ont beaucoup de colonnes.
 *
 * @param {object}   options
 * @param {string}   options.title     Titre affiché en tête du document.
 * @param {string[]} options.columns   Libellés des colonnes.
 * @param {Array<Array<string|number>>} options.rows  Lignes déjà formatées.
 * @param {string}   options.filename  Nom du fichier téléchargé.
 * @param {string}   [options.subtitle] Ligne de contexte (filtres, saison…).
 */
export function generateListPdf({ title, columns, rows, filename, subtitle }) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // L'en-tête est dessiné pour une page A4 portrait (210 mm) : en paysage la
  // largeur utile passe à 297 mm, on redessine donc les bandeaux à la bonne taille.
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setFillColor(200, 16, 46);
  doc.rect(0, 22, 297, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('Afriland First Bank — Copilote Hadj', 14, 14);
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(12);
  doc.text(title, 14, 32);

  doc.setFontSize(9);
  doc.setTextColor(89, 89, 89);
  const generatedAt = `Généré le ${formatDate(new Date().toISOString().slice(0, 10))} — ${rows.length} ligne(s)`;
  doc.text(subtitle ? `${subtitle} — ${generatedAt}` : generatedAt, 14, 38);

  autoTable(doc, {
    startY: 44,
    head: [columns],
    body: rows.map((row) => row.map((cell) => (cell == null ? '—' : String(cell)))),
    headStyles: { fillColor: [200, 16, 46] },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [246, 246, 246] },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename);
}

export function generateBordereauReceipt(bordereau) {
  const doc = new jsPDF();
  addHeader(doc, 'Reçu numérique de souscription');

  doc.setFontSize(10);
  doc.text(`Identifiant unique de souscription : ${bordereau.id}`, 14, 42);
  doc.text(`N° reçu : ${bordereau.receiptNumber}`, 14, 48);
  doc.text(`Date : ${formatDate(bordereau.createdAt)}`, 14, 54);

  autoTable(doc, {
    startY: 62,
    head: [['Champ', 'Valeur']],
    headStyles: { fillColor: [200, 16, 46] },
    body: [
      ['Référence', bordereau.reference],
      ['Pèlerin', `${bordereau.pilgrimFirstName} ${bordereau.pilgrimLastName}`],
      ['N° de passeport', bordereau.idNumber],
      ['Téléphone', bordereau.phone],
      ['Région', bordereau.region],
      ['Agence', bordereau.agency],
      ['Type de pèlerin', bordereau.pilgrimType],
      ['Nombre de pèlerins inscrits', String(bordereau.pilgrimCount)],
      ['Saison Hadj', String(bordereau.season)],
      ['Montant versé', formatCurrency(bordereau.amountPaid)],
      ['Ticket en ligne (priorité)', bordereau.onlinePriority ? 'Oui' : 'Non'],
    ],
  });

  doc.setFontSize(8);
  doc.setTextColor(89, 89, 89);
  doc.text('Document généré automatiquement — Copilote Hadj. Ce reçu fait foi de souscription.', 14, doc.lastAutoTable.finalY + 10);

  doc.save(`recu-${bordereau.id}.pdf`);
}

export function generateReportingPdf(reporting, title = 'Rapport de reporting Hadj') {
  const doc = new jsPDF();
  addHeader(doc, title);

  autoTable(doc, {
    startY: 40,
    head: [['Indicateur', 'Valeur']],
    headStyles: { fillColor: [200, 16, 46] },
    body: [
      ['Saison', String(reporting.season)],
      ['Total collecté', formatCurrency(reporting.totalCollected)],
      ['Pèlerins inscrits', String(reporting.totalPilgrims)],
      ['Pèlerins éligibles', String(reporting.eligiblePilgrims)],
      ['Bordereaux saisis', String(reporting.bordereauxCount)],
      ['Montant moyen', formatCurrency(reporting.avgAmount)],
    ],
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Encadreur', 'Collecté', 'Pèlerins', 'Bordereaux']],
    headStyles: { fillColor: [17, 17, 17] },
    body: reporting.byEncadreur.map((row) => [
      row.encadreurName,
      formatCurrency(row.collected),
      String(row.pilgrims),
      String(row.bordereaux),
    ]),
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Région', 'Collecté', 'Pèlerins']],
    headStyles: { fillColor: [17, 17, 17] },
    body: reporting.byRegion.map((row) => [row.region, formatCurrency(row.collected), String(row.pilgrims)]),
  });

  doc.save(`reporting-hadj-${reporting.season}.pdf`);
}

export function generatePilgrimAttestation(dossier) {
  const doc = new jsPDF();
  addHeader(doc, 'Attestation de souscription');

  doc.setFontSize(11);
  doc.text(
    `Nous attestons que ${dossier.pilgrimFirstName} ${dossier.pilgrimLastName} (passeport n° ${dossier.idNumber})`,
    14,
    45,
    { maxWidth: 180 }
  );
  doc.text(`est régulièrement inscrit(e) au titre de la saison Hadj ${dossier.season}.`, 14, 53);

  autoTable(doc, {
    startY: 65,
    head: [['Champ', 'Valeur']],
    headStyles: { fillColor: [200, 16, 46] },
    body: [
      ['Identifiant de souscription', dossier.id],
      ['Code de paiement', dossier.paymentCode || dossier.id],
      ['Montant total versé', formatCurrency(dossier.amountPaid)],
      ['Statut du visa', dossier.visaStatus],
      ['Éligibilité', dossier.isEligible ? 'Éligible' : 'Non éligible'],
    ],
  });

  doc.save(`attestation-${dossier.id}.pdf`);
}

export function generatePassportDepositCertificate(deposit) {
  const doc = new jsPDF();
  addHeader(doc, 'Attestation de dépôt de passeport');

  doc.setFontSize(11);
  doc.text(
    `Nous attestons que le passeport de ${deposit.pilgrimName} (passeport n° ${deposit.idNumber})`,
    14,
    45,
    { maxWidth: 180 }
  );
  doc.text('a été déposé auprès de nos services en vue du traitement de son dossier de visa.', 14, 53);

  autoTable(doc, {
    startY: 65,
    head: [['Champ', 'Valeur']],
    headStyles: { fillColor: [200, 16, 46] },
    body: [
      ['Identifiant de souscription', deposit.bordereauId],
      ['Encadreur', deposit.encadreurName || '—'],
      ['Date de dépôt', deposit.passportDepositedAt ? formatDate(deposit.passportDepositedAt) : '—'],
    ],
  });

  doc.save(`attestation-depot-${deposit.bordereauId}.pdf`);
}

/**
 * Attestation officielle de dépôt de passeports (Guichet unique du Hadj).
 * Lettre reprenant le modèle papier de la banque : en-tête logo Afriland,
 * « Yaoundé, le {date} », titre, autorisation à déposer N passeports, et bloc
 * de signature « Pour le Guichet unique du Hadj ». N = total des passeports
 * (somme des pilgrimCount) des dépôts fournis.
 *
 * @param {object}   options
 * @param {string}   [options.encadreurId]  Code encadreur (nom de fichier).
 * @param {number|string} [options.season]  Année Hadj (saison).
 * @param {Array<{pilgrimCount?:number}>} options.deposits  Dépôts pris en compte.
 */
export async function generateGroupPassportDepositCertificate({ encadreurId, season, deposits }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const year = season != null ? season : new Date().getFullYear();
  const passportsTotal = deposits.reduce((sum, d) => sum + (d.pilgrimCount || 1), 0);

  // En-tête : logo Afriland (à défaut, repli texte).
  try {
    const logo = await loadImage(afrilandLogo);
    const logoWidth = 55;
    const logoHeight = (logoWidth * logo.naturalHeight) / logo.naturalWidth;
    doc.addImage(logo, 'PNG', 14, 12, logoWidth, logoHeight);
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(200, 16, 46);
    doc.text('Afriland First Bank', 14, 22);
  }

  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Yaoundé, le ${formatDate(new Date().toISOString().slice(0, 10))}`, pageWidth - 14, 40, {
    align: 'right',
  });

  // Titre centré.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`ATTESTATION DEPOT PASSEPORTS HADJ ${year}`, centerX, 78, { align: 'center' });

  // Corps : autorisation avec le nombre de passeports.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const body =
    `Nous, AFRILAND FIRST BANK, soussignés Guichet unique du Hadj, autorisons à déposer ` +
    `${passportsTotal} passeports dans le cadre des demandes de visas aux pèlerins pour le Hadj ${year}.`;
  const lines = doc.splitTextToSize(body, 168);
  doc.text(lines, 21, 100, { align: 'justify', maxWidth: 168, lineHeightFactor: 1.6 });

  // Bloc signature.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Pour le GUICHET UNIQUE DU HADJ', centerX, 150, { align: 'center' });

  doc.save(`attestation-depot-passeports-hadj-${year}-${encadreurId || 'tous'}.pdf`);
}
