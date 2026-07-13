import { describe, it, expect } from 'vitest';
import { isValidPhone, isValidIdNumber, validateBordereau } from './validators';

const t = (key) => key; // i18n identité : on vérifie les clés d'erreur

describe('isValidPhone', () => {
  it('accepte 9 chiffres', () => {
    expect(isValidPhone('699001122')).toBe(true);
  });
  it('rejette les longueurs incorrectes ou non numériques', () => {
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('69900112a')).toBe(false);
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone(null)).toBe(false);
  });
});

describe('isValidIdNumber', () => {
  it('accepte au moins 4 caractères', () => {
    expect(isValidIdNumber('1234')).toBe(true);
    expect(isValidIdNumber('  abcd  ')).toBe(true);
  });
  it('rejette en dessous de 4 caractères', () => {
    expect(isValidIdNumber('12')).toBe(false);
    expect(isValidIdNumber('')).toBe(false);
    expect(isValidIdNumber(undefined)).toBe(false);
  });
});

describe('validateBordereau', () => {
  const valid = {
    pilgrimLastName: 'Diallo',
    pilgrimFirstName: 'Amadou',
    phone: '699001122',
    idNumber: '1002003004',
    encadreurId: 'ENC-001',
    region: 'Centre',
    agency: 'Yaoundé - Siège',
    pilgrimType: 'PELERIN',
    pilgrimCount: 1,
  };

  it('ne retourne aucune erreur pour un bordereau complet', () => {
    expect(validateBordereau(valid, t)).toEqual({});
  });

  it('signale les champs nom/prénom manquants', () => {
    const errors = validateBordereau({ ...valid, pilgrimLastName: '', pilgrimFirstName: '' }, t);
    expect(errors.pilgrimLastName).toBeDefined();
    expect(errors.pilgrimFirstName).toBeDefined();
  });

  it('distingue téléphone manquant et téléphone invalide', () => {
    expect(validateBordereau({ ...valid, phone: '' }, t).phone).toBe('bordereau.errors.phoneRequired');
    expect(validateBordereau({ ...valid, phone: '123' }, t).phone).toBe('bordereau.errors.phoneInvalid');
  });

  it('exige un encadreur, une région et un type', () => {
    const errors = validateBordereau({ ...valid, encadreurId: '', region: '', pilgrimType: '' }, t);
    expect(errors.encadreurId).toBeDefined();
    expect(errors.region).toBeDefined();
    expect(errors.pilgrimType).toBeDefined();
  });

  it('exige un nombre de pèlerins ≥ 1', () => {
    expect(validateBordereau({ ...valid, pilgrimCount: 0 }, t).pilgrimCount).toBeDefined();
  });

  it('option requireAgency : agence obligatoire par défaut, ignorée si désactivée', () => {
    expect(validateBordereau({ ...valid, agency: '' }, t).agency).toBeDefined();
    expect(validateBordereau({ ...valid, agency: '' }, t, { requireAgency: false }).agency).toBeUndefined();
  });

  it('option requireEmail : e-mail exigé seulement si activé', () => {
    expect(validateBordereau({ ...valid, email: '' }, t).email).toBeUndefined();
    expect(validateBordereau({ ...valid, email: '' }, t, { requireEmail: true }).email).toBeDefined();
  });
});
