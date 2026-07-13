import { describe, it, expect } from 'vitest';
import { parseVersementQrCode } from './qrcode';

// Construit un QR valide : 6 + 5 + 13 + 8 + 4 + 14 + type
function buildQr({
  reference = 'REF001',
  agencyCode = '00001',
  accountNumber = '1234567890123',
  date = '15062027',
  codeCaisse = 'C001',
  montant = '00000003500000',
  type = 'VERSEMENT',
} = {}) {
  return `${reference}${agencyCode}${accountNumber}${date}${codeCaisse}${montant}${type}`;
}

describe('parseVersementQrCode', () => {
  it('rejette une chaîne trop courte', () => {
    expect(parseVersementQrCode('abc')).toEqual({ valid: false, error: 'TOO_SHORT' });
    expect(parseVersementQrCode('')).toEqual({ valid: false, error: 'TOO_SHORT' });
    expect(parseVersementQrCode(null)).toEqual({ valid: false, error: 'TOO_SHORT' });
  });

  it('découpe correctement un QR valide', () => {
    const r = parseVersementQrCode(buildQr());
    expect(r.valid).toBe(true);
    expect(r.reference).toBe('REF001');
    expect(r.agencyCode).toBe('00001');
    expect(r.accountNumber).toBe('1234567890123');
    expect(r.operationDate).toBe('2027-06-15');
    expect(r.codeCaisse).toBe('C001');
    expect(r.montant).toBe(3500000);
    expect(r.typeOperation).toBe('VERSEMENT');
  });

  it('met la date à null si le format est incorrect', () => {
    const r = parseVersementQrCode(buildQr({ date: 'XXXXXXXX' }));
    expect(r.valid).toBe(true);
    expect(r.operationDate).toBeNull();
  });

  it('met le montant à null si non numérique', () => {
    const r = parseVersementQrCode(buildQr({ montant: 'ABCDEFGHIJKLMN' }));
    expect(r.montant).toBeNull();
  });

  it('coupe les espaces autour de la valeur brute', () => {
    const r = parseVersementQrCode(`   ${buildQr()}   `);
    expect(r.valid).toBe(true);
    expect(r.reference).toBe('REF001');
  });
});
