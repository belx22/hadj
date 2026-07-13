import { describe, it, expect } from 'vitest';
import {
  PILGRIM_TYPES,
  isEncadreurPilgrimType,
  getCreatableRoles,
  canCreateRole,
  getAgencyByCode,
  AGENCY_CODES,
  ROLE_HOME,
  ROLES,
} from './constants';

describe('types de pèlerin', () => {
  it('ne contient plus les anciens types à commission', () => {
    expect(PILGRIM_TYPES).toContain('ENCADREUR');
    expect(PILGRIM_TYPES).not.toContain('ENCADREUR_AVEC_COMMISSION');
    expect(PILGRIM_TYPES).not.toContain('ENCADREUR_SANS_COMMISSION');
  });

  it('isEncadreurPilgrimType ne vaut vrai que pour ENCADREUR', () => {
    expect(isEncadreurPilgrimType('ENCADREUR')).toBe(true);
    expect(isEncadreurPilgrimType('PELERIN')).toBe(false);
    expect(isEncadreurPilgrimType(undefined)).toBe(false);
  });
});

describe('hiérarchie de création des rôles', () => {
  it('un admin crée tous les rôles', () => {
    expect(getCreatableRoles('ADMIN_DSI')).toContain('SUPERVISEUR');
    expect(getCreatableRoles('ADMIN_DSI')).toContain('ENCADREUR');
  });

  it('un encadreur ne crée aucun rôle', () => {
    expect(getCreatableRoles('ENCADREUR')).toEqual([]);
  });

  it('un rôle inconnu ne crée rien', () => {
    expect(getCreatableRoles('INCONNU')).toEqual([]);
  });

  it('canCreateRole respecte la hiérarchie', () => {
    expect(canCreateRole('GESTIONNAIRE_HADJ', 'OPERATEUR_HADJ')).toBe(true);
    expect(canCreateRole('OPERATEUR_HADJ', 'SUPERVISEUR')).toBe(false);
  });
});

describe('getAgencyByCode', () => {
  it('retrouve une agence par son code', () => {
    const [name, code] = Object.entries(AGENCY_CODES)[0];
    expect(getAgencyByCode(code)).toBe(name);
  });

  it('retourne null pour un code inconnu', () => {
    expect(getAgencyByCode('99999')).toBeNull();
  });
});

describe('ROLE_HOME', () => {
  it('chaque rôle dispose d’une page d’accueil', () => {
    Object.values(ROLES).forEach((role) => {
      expect(typeof ROLE_HOME[role]).toBe('string');
    });
  });
});
