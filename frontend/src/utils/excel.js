import * as XLSX from 'xlsx';
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

export function exportToExcel(rows, filename = 'export.xlsx', sheetName = 'Feuille1') {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

// Nombre de lignes (hors en-tête) couvertes par les listes déroulantes du modèle.
const TEMPLATE_VALIDATION_ROWS = 500;

function columnLetter(index) {
  let letter = '';
  let n = index;
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Excel n'accepte une liste « en dur » que si elle tient dans 255 caractères et
// qu'aucune valeur ne contient de virgule (le séparateur de la liste).
function isInlineListSafe(values) {
  if (values.some((v) => String(v).includes(','))) return false;
  return values.join(',').length <= 250;
}

function buildDataValidationsXml(dropdowns, headers, dataRowCount = 0) {
  const entries = Object.entries(dropdowns).filter(([column]) => headers.includes(column));
  if (entries.length === 0) return null;

  // La liste déroulante couvre au moins TEMPLATE_VALIDATION_ROWS lignes, et
  // davantage si le modèle est pré-rempli avec plus de clients que ça — sans
  // quoi les lignes au-delà perdraient leur menu déroulant.
  const lastRow = Math.max(TEMPLATE_VALIDATION_ROWS, dataRowCount) + 1;

  const validations = entries
    .map(([column, values]) => {
      if (!Array.isArray(values) || values.length === 0 || !isInlineListSafe(values)) return null;
      const letter = columnLetter(headers.indexOf(column));
      const sqref = `${letter}2:${letter}${lastRow}`;
      const list = escapeXml(`"${values.join(',')}"`);
      return (
        `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${sqref}">` +
        `<formula1>${list}</formula1>` +
        `</dataValidation>`
      );
    })
    .filter(Boolean);

  if (validations.length === 0) return null;
  return `<dataValidations count="${validations.length}">${validations.join('')}</dataValidations>`;
}

// Dans le schéma CT_Worksheet, <dataValidations> doit être inséré avant tous les
// éléments qui le suivent (hyperlinks, pageMargins, ignoredErrors…) : un ordre
// incorrect fait considérer le classeur comme corrompu par Excel. SheetJS émet
// notamment <ignoredErrors> juste avant </worksheet>.
const SUCCEEDING_TAGS = [
  '<hyperlinks',
  '<printOptions',
  '<pageMargins',
  '<pageSetup',
  '<headerFooter',
  '<rowBreaks',
  '<colBreaks',
  '<customProperties',
  '<cellWatches',
  '<ignoredErrors',
  '<drawing',
  '<legacyDrawing',
  '<tableParts',
  '<extLst',
  '</worksheet>',
];

function injectDataValidations(sheetXml, validationsXml) {
  const insertAt = SUCCEEDING_TAGS.map((tag) => sheetXml.indexOf(tag))
    .filter((index) => index !== -1)
    .sort((a, b) => a - b)[0];
  if (insertAt === undefined) return sheetXml;
  return sheetXml.slice(0, insertAt) + validationsXml + sheetXml.slice(insertAt);
}

/**
 * Génère un modèle d'import Excel où les colonnes à valeurs contraintes
 * (type de pèlerin, région, statut…) sont de vrais menus déroulants.
 *
 * SheetJS (édition communautaire) n'écrit pas les `dataValidations` : on
 * post-traite donc le .xlsx — un simple ZIP — pour injecter le XML de
 * validation dans la feuille avant de déclencher le téléchargement.
 *
 * @param {object[]} rows       Lignes d'exemple (leurs clés donnent les en-têtes).
 * @param {string}   filename   Nom du fichier téléchargé.
 * @param {string}   sheetName  Nom de la feuille.
 * @param {Record<string, string[]>} dropdowns  Colonne -> valeurs autorisées.
 */
export function exportTemplateToExcel(rows, filename, sheetName = 'Feuille1', dropdowns = {}) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const headers = Object.keys(rows[0] || {});
  const validationsXml = buildDataValidationsXml(dropdowns, headers, rows.length);

  // Sans liste déroulante exploitable, on retombe sur l'export standard.
  if (!validationsXml) {
    XLSX.writeFile(workbook, filename);
    return;
  }

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const archive = unzipSync(new Uint8Array(buffer));

  const sheetPath = Object.keys(archive).find((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path));
  if (!sheetPath) {
    XLSX.writeFile(workbook, filename);
    return;
  }

  const patched = injectDataValidations(strFromU8(archive[sheetPath]), validationsXml);
  archive[sheetPath] = strToU8(patched);

  const blob = new Blob([zipSync(archive)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
