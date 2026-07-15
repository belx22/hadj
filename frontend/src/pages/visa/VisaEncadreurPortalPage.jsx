import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getEncadreurGroup,
  registerPilgrimByEncadreur,
  importPilgrims,
  createVersementOnline,
  importGroupedVersementsByEncadreur,
} from '../../api/visaApi';
import { importPassportDeposits } from '../../api/attestationsApi';
import { getEncadreurs } from '../../api/referenceDataApi';
import StatCard from '../../components/ui/StatCard';
import VisaStatusBadge from '../../components/ui/VisaStatusBadge';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { formatCurrency } from '../../utils/formatters';
import { exportToExcel, exportTemplateToExcel } from '../../utils/excel';
import { generateReportingPdf, generateGroupPassportDepositCertificate } from '../../utils/pdf';
import { CURRENT_SEASON, PILGRIM_TYPES, REGIONS, VERSEMENT_METHODS, isEncadreurPilgrimType } from '../../utils/constants';
import { validateBordereau } from '../../utils/validators';

const EMPTY_FORM = { pilgrimLastName: '', pilgrimFirstName: '', phone: '', idNumber: '', region: '', pilgrimType: 'PELERIN', pilgrimCount: 1 };

const HEADER_ALIASES = {
  pilgrimLastName: ['pilgrimlastname', 'nom', 'nom du pèlerin'],
  pilgrimFirstName: ['pilgrimfirstname', 'prenom', 'prénom', 'prénom du pèlerin'],
  phone: ['phone', 'telephone', 'téléphone'],
  idNumber: ['idnumber', 'cni', 'passeport', 'cni / passeport'],
  region: ['region', 'région'],
  pilgrimType: ['pilgrimtype', 'type', 'type de pèlerin'],
};

function normalizeRow(rawRow) {
  const lower = Object.entries(rawRow).map(([k, v]) => [k.trim().toLowerCase(), v]);
  const pick = (field) => {
    const match = lower.find(([key]) => HEADER_ALIASES[field].includes(key));
    return match ? String(match[1] ?? '').trim() : '';
  };
  return {
    pilgrimLastName: pick('pilgrimLastName'),
    pilgrimFirstName: pick('pilgrimFirstName'),
    phone: pick('phone').replace(/\D/g, '').slice(0, 9),
    idNumber: pick('idNumber'),
    region: pick('region'),
    pilgrimType: pick('pilgrimType'),
  };
}

const GROUPED_HEADER_ALIASES = {
  pilgrimLastName: ['pilgrimlastname', 'nom', 'nom du pèlerin'],
  pilgrimFirstName: ['pilgrimfirstname', 'prenom', 'prénom', 'prénom du pèlerin'],
  phone: ['phone', 'telephone', 'téléphone'],
  amount: ['amount', 'montant', 'montant verse', 'montant versé'],
};

function normalizeGroupedRow(rawRow) {
  const lower = Object.entries(rawRow).map(([k, v]) => [k.trim().toLowerCase(), v]);
  const pick = (field) => {
    const match = lower.find(([key]) => GROUPED_HEADER_ALIASES[field].includes(key));
    return match ? String(match[1] ?? '').trim() : '';
  };
  return {
    pilgrimLastName: pick('pilgrimLastName'),
    pilgrimFirstName: pick('pilgrimFirstName'),
    phone: pick('phone').replace(/\D/g, '').slice(0, 9),
    amount: pick('amount'),
  };
}

const PASSPORT_HEADER_ALIASES = {
  idNumber: ['idnumber', 'cni', 'passeport', 'cni / passeport', 'n° cni / passeport'],
  deposited: ['depot', 'dépôt', 'deposited', 'depose', 'déposé', 'statut'],
};

function normalizePassportRow(rawRow) {
  const lower = Object.entries(rawRow).map(([k, v]) => [k.trim().toLowerCase(), v]);
  const pick = (field) => {
    const match = lower.find(([key]) => PASSPORT_HEADER_ALIASES[field].includes(key));
    return match ? String(match[1] ?? '').trim() : '';
  };
  return { idNumber: pick('idNumber'), deposited: pick('deposited') };
}

// Le portail est réutilisable : par défaut il s'appuie sur le compte staff
// connecté (useAuth), mais il accepte des props pour être monté dans l'espace
// pèlerin lorsqu'un pèlerin de type Encadreur consulte son groupe.
export default function VisaEncadreurPortalPage({ encadreurId: propEncadreurId, encadreurName: propName } = {}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();

  // Un encadreur opère sur son propre groupe (encadreurId porté par son compte).
  // Un gestionnaire — ou tout staff sans encadreurId propre — choisit dans une
  // liste l'encadreur pour lequel il agit : le backend rattache le pèlerin à
  // l'encadreurId transmis, pas à l'appelant, donc la meme page sert aux deux.
  const ownEncadreurId = propEncadreurId ?? user?.encadreurId;
  const managerMode = !ownEncadreurId;
  const [managerEncadreurs, setManagerEncadreurs] = useState([]);
  const [selectedEncadreurId, setSelectedEncadreurId] = useState('');
  const encadreurId = ownEncadreurId ?? (selectedEncadreurId || null);
  const encadreurName = propName ?? (managerMode
    ? managerEncadreurs.find((e) => e.id === encadreurId)?.name
    : user?.name);
  const [group, setGroup] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [registeredCredential, setRegisteredCredential] = useState(null);

  const [importSummary, setImportSummary] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [groupedMethod, setGroupedMethod] = useState(VERSEMENT_METHODS[0]);
  const [groupedReference, setGroupedReference] = useState('');
  const [groupedSummary, setGroupedSummary] = useState(null);
  const [groupedImporting, setGroupedImporting] = useState(false);
  const groupedFileInputRef = useRef(null);

  // Versement effectué par l'encadreur pour un pèlerin de son groupe.
  const [payForm, setPayForm] = useState({ bordereauId: '', method: VERSEMENT_METHODS[0], amount: '', reference: '' });
  const [payError, setPayError] = useState(null);
  const [payBusy, setPayBusy] = useState(false);

  // Import des passeports déposés.
  const [passportSummary, setPassportSummary] = useState(null);
  const [passportImporting, setPassportImporting] = useState(false);
  const passportFileInputRef = useRef(null);

  function reload() {
    // En mode gestionnaire tant qu'aucun encadreur n'est choisi, il n'y a pas de
    // groupe à charger : on évite un appel avec un encadreurId nul.
    if (!encadreurId) {
      setGroup([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getEncadreurGroup(encadreurId).then((groupData) => {
      setGroup(groupData);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encadreurId]);

  // Mode gestionnaire : liste des encadreurs actifs proposés dans le sélecteur.
  useEffect(() => {
    if (!managerMode) return;
    getEncadreurs({ onlyActive: true }).then(setManagerEncadreurs);
  }, [managerMode]);

  // Tableau de bord : encaissements, reste à verser et suivi des passeports.
  const stats = useMemo(() => {
    const collected = group.reduce((sum, b) => sum + b.amountPaid, 0);
    const target = group.reduce((sum, b) => sum + b.targetAmount, 0);
    const eligible = group.reduce((sum, b) => sum + b.eligiblePilgrims, 0);
    const passportsTotal = group.reduce((sum, b) => sum + b.pilgrimCount, 0);
    const passportsDeposited = group
      .filter((b) => b.passportDeposited)
      .reduce((sum, b) => sum + b.pilgrimCount, 0);
    return {
      collected,
      target,
      remaining: Math.max(target - collected, 0),
      eligible,
      passportsTotal,
      passportsDeposited,
      passportsRemaining: Math.max(passportsTotal - passportsDeposited, 0),
    };
  }, [group]);

  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(group);

  function handleExportExcel() {
    exportToExcel(
      group.map((b) => ({
        Pelerin: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
        Passeport: b.idNumber,
        Telephone: b.phone,
        Montant: b.amountPaid,
        StatutVisa: b.visaStatus,
        Eligible: b.eligiblePilgrims >= b.pilgrimCount ? 'Oui' : 'Non',
      })),
      `groupe-${encadreurId}.xlsx`,
      'Groupe'
    );
  }

  function handleExportPdf() {
    generateReportingPdf(
      {
        season: CURRENT_SEASON,
        totalCollected: stats.collected,
        totalPilgrims: stats.passportsTotal,
        eligiblePilgrims: stats.eligible,
        bordereauxCount: group.length,
        avgAmount: group.length ? Math.round(stats.collected / group.length) : 0,
        byEncadreur: [{ encadreurName: encadreurName, collected: stats.collected, pilgrims: group.length, bordereaux: group.length }],
        byRegion: [],
      },
      `Groupe ${encadreurName}`
    );
  }

  function updateForm(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'pilgrimType' && !isEncadreurPilgrimType(value)) next.pilgrimCount = 1;
      return next;
    });
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setFormError(null);
    setRegisteredCredential(null);
    const validationErrors = validateBordereau(
      { ...form, encadreurId },
      t,
      { requireAgency: false, requireEmail: false }
    );
    setFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const record = await registerPilgrimByEncadreur({ ...form, pilgrimCount: Number(form.pilgrimCount) }, encadreurId);
      toast.success(t('toasts.pilgrimRegisteredByEncadreur'));
      setRegisteredCredential({
        name: `${record.pilgrimFirstName} ${record.pilgrimLastName}`,
        idNumber: record.idNumber,
        password: record.password,
      });
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      if (err.code === 'DUPLICATE_PILGRIM') {
        setFormError(t('bordereau.errors.duplicate', { season: CURRENT_SEASON }));
      } else if (err.code === 'DUPLICATE_PHONE') {
        setFormError(t('bordereau.errors.duplicatePhone'));
      } else {
        setFormError(t('common.error'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  // --- Versement par l'encadreur (l'encadreur ne modifie jamais un statut) ---
  async function handlePayment(e) {
    e.preventDefault();
    setPayError(null);
    const target = group.find((b) => b.id === payForm.bordereauId);
    if (!target) {
      setPayError(t('encadreurPortal.payment.pilgrimRequired'));
      return;
    }
    // Pas de paiement fractionné : on règle la totalité du solde du pèlerin.
    const amount = target.balance - target.pendingAmount;
    if (!amount || amount <= 0) {
      setPayError(t('encadreurPortal.payment.amountRequired'));
      return;
    }
    setPayBusy(true);
    try {
      await createVersementOnline(target.idNumber, target.phone, {
        method: payForm.method,
        amount,
        reference: payForm.reference.trim(),
      });
      toast.success(t('encadreurPortal.payment.success'));
      setPayForm({ bordereauId: '', method: VERSEMENT_METHODS[0], reference: '' });
      reload();
    } catch {
      setPayError(t('common.error'));
    } finally {
      setPayBusy(false);
    }
  }

  const paySelected = group.find((b) => b.id === payForm.bordereauId);
  const payRemaining = paySelected ? paySelected.balance - paySelected.pendingAmount : 0;

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportSummary(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const rows = rawRows.map(normalizeRow);
      const summary = await importPilgrims(rows, encadreurId);
      setImportSummary(summary);
      reload();
    } catch {
      setImportSummary({ created: [], skipped: [], errors: [{ row: 0, reason: 'PARSE_ERROR' }] });
    } finally {
      setImporting(false);
    }
  }

  function handleDownloadTemplate() {
    exportTemplateToExcel(
      [{ pilgrimLastName: 'Nom', pilgrimFirstName: 'Prénom', phone: '699112233', idNumber: '1002345699', region: REGIONS[0], pilgrimType: 'PELERIN' }],
      'modele-pelerins.xlsx',
      'Pelerins',
      { region: REGIONS, pilgrimType: PILGRIM_TYPES }
    );
  }

  function handleDownloadGroupedTemplate() {
    exportToExcel(
      [{ pilgrimLastName: 'Nom', pilgrimFirstName: 'Prénom', phone: '699112233', amount: 500000 }],
      'modele-paiement-groupe.xlsx',
      'PaiementGroupe'
    );
  }

  async function handleGroupedFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setGroupedImporting(true);
    setGroupedSummary(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const rows = rawRows.map(normalizeGroupedRow);
      const summary = await importGroupedVersementsByEncadreur(
        rows,
        encadreurId,
        { method: groupedMethod, reference: groupedReference }
      );
      setGroupedSummary(summary);
      reload();
    } catch {
      setGroupedSummary({ created: [], notFound: [], invalidAmount: [{ row: 0, reason: 'PARSE_ERROR' }] });
    } finally {
      setGroupedImporting(false);
    }
  }

  // Attestation de dépôt collective : un seul document pour tous les passeports
  // déposés du groupe (et non une attestation par pèlerin).
  const depositedPilgrims = useMemo(() => group.filter((b) => b.passportDeposited), [group]);

  function handleDownloadGroupCertificate() {
    if (depositedPilgrims.length === 0) return;
    generateGroupPassportDepositCertificate({
      encadreurName,
      encadreurId,
      season: CURRENT_SEASON,
      deposits: depositedPilgrims.map((b) => ({
        pilgrimName: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
        idNumber: b.idNumber,
        phone: b.phone,
        pilgrimCount: b.pilgrimCount,
        passportDepositedAt: b.passportDepositedAt,
      })),
    });
  }

  function handleDownloadPassportTemplate() {
    exportToExcel(
      [{ idNumber: '1002345699', Depot: 'OUI' }],
      'modele-depot-passeports.xlsx',
      'DepotPasseports'
    );
  }

  async function handlePassportFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPassportImporting(true);
    setPassportSummary(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const rows = rawRows.map(normalizePassportRow);
      const summary = await importPassportDeposits(rows, CURRENT_SEASON);
      setPassportSummary(summary);
      reload();
    } catch {
      setPassportSummary({ updated: [], notFound: [], invalid: [{ row: 0, reason: 'PARSE_ERROR' }] });
    } finally {
      setPassportImporting(false);
    }
  }

  // Sélecteur d'encadreur : rendu en tête uniquement pour un gestionnaire ; pour
  // un encadreur connecté, managerMode est faux et cet élément ne s'affiche pas.
  const encadreurPicker = managerMode && (
    <div className="card space-y-2">
      <label className="form-label" htmlFor="manager-encadreur-select">
        {t('encadreurPortal.managerSelectLabel')}
      </label>
      <select
        id="manager-encadreur-select"
        className="form-input sm:max-w-md"
        value={selectedEncadreurId}
        onChange={(e) => setSelectedEncadreurId(e.target.value)}
      >
        <option value="">{t('encadreurPortal.managerSelectPlaceholder')}</option>
        {managerEncadreurs.map((enc) => (
          <option key={enc.id} value={enc.id}>
            {enc.name}{enc.code ? ` — ${enc.code}` : ''}
          </option>
        ))}
      </select>
      <p className="text-xs text-afriland-gray-600">{t('encadreurPortal.managerHint')}</p>
    </div>
  );

  // Gestionnaire sans encadreur choisi : rien à afficher hormis le sélecteur.
  if (managerMode && !encadreurId) {
    return <div className="space-y-6">{encadreurPicker}</div>;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {encadreurPicker}
        <p className="text-afriland-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {encadreurPicker}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-afriland-black">{t('visa.encadreurLoginTitle')}</h1>
          <p className="text-sm text-afriland-gray-600">{encadreurName}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={handleExportExcel}>{t('common.exportExcel')}</button>
          <button type="button" className="btn-primary" onClick={handleExportPdf}>{t('common.exportPdf')}</button>
        </div>
      </div>

      {/* Tableau de bord de suivi : encaissements / reste à verser / passeports. */}
      <div>
        <p className="mb-2 text-sm font-semibold text-afriland-black">{t('encadreurPortal.dashboardTitle')}</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t('visa.collected')} value={formatCurrency(stats.collected)} accent="text-visa-granted" />
          <StatCard label={t('visa.target')} value={formatCurrency(stats.target)} />
          <StatCard label={t('encadreurPortal.remaining')} value={formatCurrency(stats.remaining)} accent="text-afriland-red" />
          <StatCard label={t('visa.eligibleCount')} value={stats.eligible} />
          <StatCard label={t('encadreurPortal.passportsTotal')} value={stats.passportsTotal} />
          <StatCard label={t('encadreurPortal.passportsDeposited')} value={stats.passportsDeposited} accent="text-visa-granted" />
          <StatCard
            label={t('encadreurPortal.passportsRemaining')}
            value={stats.passportsRemaining}
            accent={stats.passportsRemaining > 0 ? 'text-visa-complement' : undefined}
          />
        </div>
      </div>

      {/* Versement effectué par l'encadreur pour un de ses pèlerins. */}
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('encadreurPortal.payment.title')}</p>
        <p className="text-xs text-afriland-gray-600">{t('encadreurPortal.payment.help')}</p>
        <form onSubmit={handlePayment} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            className="form-input lg:col-span-2"
            value={payForm.bordereauId}
            onChange={(e) => setPayForm((p) => ({ ...p, bordereauId: e.target.value }))}
          >
            <option value="">{t('encadreurPortal.payment.selectPilgrim')}</option>
            {group.map((b) => (
              <option key={b.id} value={b.id}>
                {b.pilgrimFirstName} {b.pilgrimLastName} — {b.idNumber}
              </option>
            ))}
          </select>
          <select className="form-input" value={payForm.method} onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}>
            {VERSEMENT_METHODS.map((method) => (
              <option key={method} value={method}>{t(`paymentPage.methods.${method}`)}</option>
            ))}
          </select>
          {/* Montant figé au solde total du pèlerin (paiement en une fois). */}
          <div className="form-input flex items-center bg-afriland-gray-50 font-semibold text-afriland-red">
            {formatCurrency(payRemaining)}
          </div>
          <input
            className="form-input lg:col-span-3"
            placeholder={t('paymentPage.reference')}
            value={payForm.reference}
            onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
          />
          <button type="submit" className="btn-primary" disabled={payBusy}>
            {payBusy ? t('common.loading') : t('encadreurPortal.payment.submit')}
          </button>
        </form>
        {payError && <p className="form-error">{payError}</p>}
      </div>

      <div className="card space-y-4">
        <p className="text-sm font-semibold text-afriland-black">{t('encadreurPortal.registerTitle')}</p>
        <form onSubmit={handleRegister} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <input
              className={`form-input ${formErrors.pilgrimLastName ? 'form-input-error' : ''}`}
              placeholder={t('bordereau.pilgrimLastName')}
              value={form.pilgrimLastName}
              onChange={(e) => updateForm('pilgrimLastName', e.target.value)}
            />
            {formErrors.pilgrimLastName && <p className="form-error">{formErrors.pilgrimLastName}</p>}
          </div>
          <div>
            <input
              className={`form-input ${formErrors.pilgrimFirstName ? 'form-input-error' : ''}`}
              placeholder={t('bordereau.pilgrimFirstName')}
              value={form.pilgrimFirstName}
              onChange={(e) => updateForm('pilgrimFirstName', e.target.value)}
            />
            {formErrors.pilgrimFirstName && <p className="form-error">{formErrors.pilgrimFirstName}</p>}
          </div>
          <div>
            <input
              className={`form-input ${formErrors.phone ? 'form-input-error' : ''}`}
              placeholder={t('bordereau.phone')}
              value={form.phone}
              onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
              inputMode="numeric"
            />
            {formErrors.phone && <p className="form-error">{formErrors.phone}</p>}
          </div>
          <div>
            <input
              className={`form-input ${formErrors.idNumber ? 'form-input-error' : ''}`}
              placeholder={t('bordereau.idNumber')}
              value={form.idNumber}
              onChange={(e) => updateForm('idNumber', e.target.value)}
            />
            {formErrors.idNumber && <p className="form-error">{formErrors.idNumber}</p>}
          </div>
          <div>
            <select
              className={`form-input ${formErrors.region ? 'form-input-error' : ''}`}
              value={form.region}
              onChange={(e) => updateForm('region', e.target.value)}
            >
              <option value="">{t('common.select')}</option>
              {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
            {formErrors.region && <p className="form-error">{formErrors.region}</p>}
          </div>
          <select className="form-input" value={form.pilgrimType} onChange={(e) => updateForm('pilgrimType', e.target.value)}>
            {PILGRIM_TYPES.map((type) => <option key={type} value={type}>{t(`bordereau.pilgrimTypes.${type}`)}</option>)}
          </select>
          {isEncadreurPilgrimType(form.pilgrimType) && (
            <div>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                className={`form-input ${formErrors.pilgrimCount ? 'form-input-error' : ''}`}
                placeholder={t('bordereau.pilgrimCount')}
                value={form.pilgrimCount}
                onChange={(e) => updateForm('pilgrimCount', e.target.value)}
              />
              {formErrors.pilgrimCount && <p className="form-error">{formErrors.pilgrimCount}</p>}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('common.loading') : t('encadreurPortal.registerButton')}
          </button>
        </form>
        {formError && <p className="form-error">{formError}</p>}
        {registeredCredential && (
          <div className="rounded-md border border-visa-granted/30 bg-visa-granted/5 p-3 text-sm">
            <p className="font-semibold text-visa-granted">
              {t('encadreurPortal.credentialTitle', { name: registeredCredential.name })}
            </p>
            <p className="mt-1 text-afriland-gray-600">
              {t('bordereau.idNumber')} : <span className="font-mono text-afriland-black">{registeredCredential.idNumber}</span>
              {' — '}
              {t('encadreurPortal.password')} : <span className="font-mono text-afriland-black">{registeredCredential.password}</span>
            </p>
            <p className="mt-1 text-xs text-afriland-gray-600">{t('encadreurPortal.credentialHelp')}</p>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('encadreurPortal.importTitle')}</p>
        <p className="text-xs text-afriland-gray-600">{t('encadreurPortal.importHelp')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>{t('adminEncadreurs.downloadTemplate')}</button>
          <button type="button" className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? t('common.loading') : t('adminEncadreurs.importFile')}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
        </div>
        {importSummary && (
          <div className="rounded-md bg-afriland-gray-50 p-3 text-sm">
            <p className="font-medium text-visa-granted">{t('encadreurPortal.pilgrimsImportCreated', { count: importSummary.created.length })}</p>
            {importSummary.skipped.length > 0 && (
              <p className="text-afriland-gray-600">{t('encadreurPortal.pilgrimsImportSkipped', { count: importSummary.skipped.length })}</p>
            )}
            {importSummary.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-visa-refused">
                {importSummary.errors.map((err, index) => (
                  <li key={index}>{t('adminEncadreurs.importErrorRow', { row: err.row, reason: err.reason })}</li>
                ))}
              </ul>
            )}
            {importSummary.created.length > 0 && (
              <>
                <p className="mt-2 text-xs text-afriland-gray-600">{t('encadreurPortal.credentialHelp')}</p>
                <button
                  type="button"
                  className="btn-secondary mt-2"
                  onClick={() =>
                    exportToExcel(
                      importSummary.created.map((c) => ({
                        Pelerin: c.pilgrimName,
                        Passeport: c.idNumber,
                        Telephone: c.phone,
                        MotDePasse: c.password,
                      })),
                      'identifiants-pelerins.xlsx',
                      'Identifiants'
                    )
                  }
                >
                  {t('encadreurPortal.exportCredentials')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('encadreurPortal.groupedPayment.title')}</p>
        <p className="text-xs text-afriland-gray-600">{t('encadreurPortal.groupedPayment.help')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label">{t('paymentPage.method')}</label>
            <select className="form-input" value={groupedMethod} onChange={(e) => setGroupedMethod(e.target.value)}>
              {VERSEMENT_METHODS.map((method) => (
                <option key={method} value={method}>{t(`paymentPage.methods.${method}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">{t('paymentPage.reference')}</label>
            <input className="form-input" value={groupedReference} onChange={(e) => setGroupedReference(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadGroupedTemplate}>
            {t('adminEncadreurs.downloadTemplate')}
          </button>
          <button type="button" className="btn-primary" onClick={() => groupedFileInputRef.current?.click()} disabled={groupedImporting}>
            {groupedImporting ? t('common.loading') : t('adminEncadreurs.importFile')}
          </button>
          <input ref={groupedFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleGroupedFileChange} />
        </div>
        {groupedSummary && (
          <div className="rounded-md bg-afriland-gray-50 p-3 text-sm">
            <p className="font-medium text-visa-granted">
              {t('encadreurPortal.groupedPayment.created', { count: groupedSummary.created.length })}
            </p>
            {groupedSummary.notFound?.length > 0 && (
              <p className="text-afriland-gray-600">
                {t('encadreurPortal.groupedPayment.notFound', { count: groupedSummary.notFound.length })}
              </p>
            )}
            {groupedSummary.invalidAmount?.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-visa-refused">
                {groupedSummary.invalidAmount.map((err, index) => (
                  <li key={index}>{t('adminEncadreurs.importErrorRow', { row: err.row, reason: err.reason || err.phone })}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Soumission de la liste des passeports déjà déposés. */}
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('encadreurPortal.passports.title')}</p>
        <p className="text-xs text-afriland-gray-600">{t('encadreurPortal.passports.help')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadPassportTemplate}>
            {t('adminEncadreurs.downloadTemplate')}
          </button>
          <button type="button" className="btn-primary" onClick={() => passportFileInputRef.current?.click()} disabled={passportImporting}>
            {passportImporting ? t('common.loading') : t('adminEncadreurs.importFile')}
          </button>
          <input ref={passportFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handlePassportFileChange} />
          <button
            type="button"
            className="btn-secondary"
            onClick={handleDownloadGroupCertificate}
            disabled={depositedPilgrims.length === 0}
          >
            {t('encadreurPortal.passports.downloadGroupCertificate', { count: depositedPilgrims.length })}
          </button>
        </div>
        {passportSummary && (
          <div className="rounded-md bg-afriland-gray-50 p-3 text-sm">
            <p className="font-medium text-visa-granted">{t('encadreurPortal.passports.imported', { count: passportSummary.updated.length })}</p>
            {passportSummary.notFound?.length > 0 && (
              <p className="text-afriland-gray-600">{t('encadreurPortal.passports.notFound', { count: passportSummary.notFound.length })}</p>
            )}
            {passportSummary.invalid?.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-visa-refused">
                {passportSummary.invalid.map((err, index) => (
                  <li key={index}>{t('adminEncadreurs.importErrorRow', { row: err.row, reason: err.reason })}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Suivi (lecture seule) : l'encadreur consulte le statut visa de ses
          pèlerins mais ne peut jamais le modifier, ni changer un statut de
          paiement. */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('visa.idNumber')}</th>
              <th className="px-4 py-3">{t('bordereau.table.amount')}</th>
              <th className="px-4 py-3">{t('visa.visaStatus')}</th>
              <th className="px-4 py-3">{t('encadreurPortal.passportsDeposited')}</th>
              <th className="px-4 py-3">{t('visa.eligibility')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {pageItems.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">{b.pilgrimFirstName} {b.pilgrimLastName}</td>
                <td className="px-4 py-3 font-mono text-xs">{b.idNumber}</td>
                <td className="px-4 py-3">{formatCurrency(b.amountPaid)}</td>
                <td className="px-4 py-3"><VisaStatusBadge status={b.visaStatus} /></td>
                <td className="px-4 py-3">{b.passportDeposited ? t('common.yes') : t('common.no')}</td>
                <td className="px-4 py-3">
                  {b.eligiblePilgrims >= b.pilgrimCount ? (
                    <span className="text-visa-granted font-semibold">{t('visa.eligible')}</span>
                  ) : (
                    <span className="text-visa-refused font-semibold">{t('visa.notEligible')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}
