// Format fixe du QR code imprimé sur le bordereau de versement en agence :
// 6 car. référence versement + 5 car. code agence + 13 car. compte + clé
// + 8 car. date (JJMMAAAA) + 4 car. code caisse + 14 car. montant
// + le reste = type d'opération.
const LENGTHS = {
  reference: 6,
  agencyCode: 5,
  accountNumber: 13,
  operationDate: 8,
  codeCaisse: 4,
  montant: 14,
};

const MIN_LENGTH = Object.values(LENGTHS).reduce((sum, n) => sum + n, 0); // 50

export function parseVersementQrCode(raw) {
  const text = String(raw || '').trim();
  if (text.length < MIN_LENGTH) {
    return { valid: false, error: 'TOO_SHORT' };
  }

  let cursor = 0;
  const take = (length) => {
    const value = text.slice(cursor, cursor + length);
    cursor += length;
    return value;
  };

  const reference = take(LENGTHS.reference);
  const agencyCode = take(LENGTHS.agencyCode);
  const accountNumber = take(LENGTHS.accountNumber);
  const dateRaw = take(LENGTHS.operationDate);
  const codeCaisse = take(LENGTHS.codeCaisse);
  const montantRaw = take(LENGTHS.montant);
  const typeOperation = text.slice(cursor).trim();

  const isValidDate = /^\d{8}$/.test(dateRaw);
  const operationDate = isValidDate
    ? `${dateRaw.slice(4, 8)}-${dateRaw.slice(2, 4)}-${dateRaw.slice(0, 2)}`
    : null;

  const montant = /^\d+$/.test(montantRaw) ? parseInt(montantRaw, 10) : null;

  return {
    valid: true,
    raw: text,
    reference,
    agencyCode,
    accountNumber,
    operationDate,
    codeCaisse,
    montant,
    typeOperation,
  };
}
