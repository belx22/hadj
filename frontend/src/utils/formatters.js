export function formatCurrency(value, locale = 'fr-FR') {
  const amount = Number(value) || 0;
  return `${new Intl.NumberFormat(locale).format(amount)} FCFA`;
}

export function formatDate(value, locale = 'fr-FR') {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function formatDateTime(value, locale = 'fr-FR') {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Numéro de compte : 21 chiffres. Le système ne conserve que les chiffres
// (ex. « 100500010000004320768 »), mais on l'affiche au client en 4 groupes
// « 1005 0001 00000043207 68 » (4 - 4 - 11 - 2) pour la lisibilité.
const ACCOUNT_GROUPS = [4, 4, 11, 2];
export const ACCOUNT_NUMBER_LENGTH = ACCOUNT_GROUPS.reduce((sum, n) => sum + n, 0); // 21

export function normalizeAccountNumber(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, ACCOUNT_NUMBER_LENGTH);
}

export function formatAccountNumber(value) {
  const digits = normalizeAccountNumber(value);
  const parts = [];
  let cursor = 0;
  for (const size of ACCOUNT_GROUPS) {
    const chunk = digits.slice(cursor, cursor + size);
    if (!chunk) break;
    parts.push(chunk);
    cursor += size;
  }
  return parts.join(' ');
}
