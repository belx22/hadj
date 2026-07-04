import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './formatters';

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
      ['N° CNI / Passeport', bordereau.idNumber],
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
    `Nous attestons que ${dossier.pilgrimFirstName} ${dossier.pilgrimLastName} (CNI/Passeport n° ${dossier.idNumber})`,
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
      ['Montant total versé', formatCurrency(dossier.amountPaid)],
      ['Statut du visa', dossier.visaStatus],
      ['Éligibilité', dossier.isEligible ? 'Éligible' : 'Non éligible'],
    ],
  });

  doc.save(`attestation-${dossier.id}.pdf`);
}
