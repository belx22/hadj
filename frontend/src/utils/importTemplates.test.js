import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { resetDb } from '../test/fakeBackend/fakeBackend';
import { getBordereaux } from '../api/bordereauApi';
import { importVisaStatuses, createVersementOnline } from '../api/visaApi';
import { getPassportDeposits, importPassportDeposits } from '../api/attestationsApi';
import { getPendingVersements, importPaymentStatuses } from '../api/paymentsApi';
import { CURRENT_SEASON } from './constants';
import {
  buildVisaStatusTemplateRows,
  buildPassportDepositTemplateRows,
  buildPaymentStatusTemplateRows,
} from './importTemplates';

beforeEach(() => resetDb());

// Simule l'aller-retour fichier réel : écrit les lignes du modèle dans une
// feuille .xlsx puis les relit comme le fait la page à l'import. Prouve que les
// en-têtes générés survivent au round-trip et restent exploitables par le parseur.
function roundTripThroughXlsx(rows) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'S');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const back = XLSX.read(buf, { type: 'array' });
  return XLSX.utils.sheet_to_json(back.Sheets[back.SheetNames[0]], { defval: '' });
}

describe('modèle statuts visa (page Clients)', () => {
  it('pré-remplit les clients présents avec leur statut visa courant', async () => {
    const clients = await getBordereaux({});
    const template = buildVisaStatusTemplateRows(clients);
    expect(template).toHaveLength(clients.length);
    expect(template[0]).toMatchObject({ idNumber: clients[0].idNumber, status: clients[0].visaStatus });
    // La colonne « Pelerin » (lisibilité) est présente ; l'import l'ignore.
    expect(template[0]).toHaveProperty('Pelerin');
  });

  it('round-trip fichier + import : les nouveaux statuts sont bien appliqués', async () => {
    const clients = await getBordereaux({});
    const reread = roundTripThroughXlsx(buildVisaStatusTemplateRows(clients));
    // On corrige tout le monde à ACCORDE, comme le ferait l'opérateur.
    const rows = reread.map((r) => ({ idNumber: r.idNumber, status: 'ACCORDE', note: '' }));
    const summary = await importVisaStatuses(rows, null);
    expect(summary.updated).toHaveLength(clients.length);
    expect(summary.notFound).toHaveLength(0);
    const after = await getBordereaux({});
    expect(after.every((b) => b.visaStatus === 'ACCORDE')).toBe(true);
  });
});

describe('modèle dépôts passeports (page Attestations)', () => {
  it('pré-remplit les pèlerins de la saison avec leur statut de dépôt (OUI/NON)', async () => {
    const { items } = await getPassportDeposits(CURRENT_SEASON);
    expect(items.length).toBeGreaterThan(0);
    const template = buildPassportDepositTemplateRows(items);
    expect(template).toHaveLength(items.length);
    expect(['OUI', 'NON']).toContain(template[0].deposited);
  });

  it('round-trip fichier + import : les dépôts passent bien à OUI', async () => {
    const { items } = await getPassportDeposits(CURRENT_SEASON);
    const reread = roundTripThroughXlsx(buildPassportDepositTemplateRows(items));
    const rows = reread.map((r) => ({ idNumber: r.idNumber, deposited: 'OUI' }));
    const summary = await importPassportDeposits(rows, CURRENT_SEASON);
    expect(summary.updated).toHaveLength(items.length);
    const after = await getPassportDeposits(CURRENT_SEASON);
    expect(after.items.every((i) => i.passportDeposited)).toBe(true);
  });
});

describe('modèle statuts paiement (page Validation des paiements)', () => {
  it('round-trip fichier + import : un versement en attente pré-rempli est validé', async () => {
    // Crée un versement en attente (paiement total) pour disposer d'une référence.
    const clients = await getBordereaux({});
    const target = clients.find((b) => b.balance - b.pendingAmount > 0);
    const fullAmount = target.balance - target.pendingAmount;
    await createVersementOnline(target.idNumber, target.phone, {
      method: 'MOBILE_MONEY_ORANGE',
      amount: fullAmount,
      reference: 'ROUNDTRIP-PAY-1',
    });

    const pending = await getPendingVersements();
    const template = buildPaymentStatusTemplateRows(pending);
    const mine = template.find((r) => r.Reference === 'ROUNDTRIP-PAY-1');
    expect(mine).toBeTruthy();
    expect(mine.Client).toContain(target.pilgrimLastName);
    expect(mine.Statut).toBe(''); // décision à renseigner par l'opérateur

    // L'opérateur renseigne VALIDE puis réimporte.
    const reread = roundTripThroughXlsx(template);
    const rows = reread.map((r) => ({
      reference: r.Reference,
      status: r.Reference === 'ROUNDTRIP-PAY-1' ? 'VALIDE' : '',
    }));
    const summary = await importPaymentStatuses(rows);
    expect(summary.updated.some((u) => u.reference === 'ROUNDTRIP-PAY-1')).toBe(true);
  });
});
