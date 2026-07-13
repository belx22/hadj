import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatAccountNumber,
  normalizeAccountNumber,
  ACCOUNT_NUMBER_LENGTH,
} from './formatters';

describe('formatCurrency', () => {
  it('formate un montant en FCFA avec séparateurs de milliers', () => {
    expect(formatCurrency(3500000)).toMatch(/3\D?500\D?000\sFCFA/);
  });

  it('retombe sur 0 pour une valeur non numérique', () => {
    expect(formatCurrency('abc')).toBe('0 FCFA');
    expect(formatCurrency(null)).toBe('0 FCFA');
    expect(formatCurrency(undefined)).toBe('0 FCFA');
  });

  it('accepte une locale personnalisée', () => {
    expect(formatCurrency(1000, 'en-US')).toBe('1,000 FCFA');
  });
});

describe('formatDate', () => {
  it('formate une date ISO', () => {
    expect(formatDate('2027-06-15', 'en-GB')).toBe('15/06/2027');
  });

  it('accepte un objet Date', () => {
    expect(formatDate(new Date('2027-01-02'), 'en-GB')).toBe('02/01/2027');
  });

  it('retourne un tiret pour une valeur vide ou invalide', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('pas-une-date')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('formate date + heure', () => {
    const out = formatDateTime('2027-06-15T14:30:00', 'en-GB');
    expect(out).toContain('15/06/2027');
    expect(out).toMatch(/14.?30/);
  });

  it('retourne un tiret pour une valeur vide ou invalide', () => {
    expect(formatDateTime('')).toBe('—');
    expect(formatDateTime('xxx')).toBe('—');
  });
});

describe('numéro de compte', () => {
  it('le format cible fait 21 chiffres', () => {
    expect(ACCOUNT_NUMBER_LENGTH).toBe(21);
  });

  it('normalise en ne gardant que les chiffres (max 21)', () => {
    expect(normalizeAccountNumber('1005 0001 00000043207 68')).toBe('100500010000004320768');
    expect(normalizeAccountNumber('abc123')).toBe('123');
    expect(normalizeAccountNumber('1005000100000043207689999')).toBe('100500010000004320768');
    expect(normalizeAccountNumber(null)).toBe('');
  });

  it('affiche le numéro en groupes 4-4-11-2', () => {
    expect(formatAccountNumber('100500010000004320768')).toBe('1005 0001 00000043207 68');
    // Round-trip : normaliser la valeur affichée redonne les chiffres bruts.
    expect(normalizeAccountNumber(formatAccountNumber('100500010000004320768'))).toBe('100500010000004320768');
  });

  it('formate partiellement une saisie en cours', () => {
    expect(formatAccountNumber('100500')).toBe('1005 00');
    expect(formatAccountNumber('')).toBe('');
  });
});
