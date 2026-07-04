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
