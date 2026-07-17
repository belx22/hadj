import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { useToast } from '../../context/ToastContext';
import { getBordereaux } from '../../api/bordereauApi';
import { getEncadreurs } from '../../api/referenceDataApi';
import { importVisaStatuses, checkStatusAnomalies, registerPilgrimByEncadreur, importPilgrims } from '../../api/visaApi';
import { exportToExcel, exportTemplateToExcel } from '../../utils/excel';
import { buildVisaStatusTemplateRows } from '../../utils/importTemplates';
import { generateListPdf } from '../../utils/pdf';
import { validateBordereau } from '../../utils/validators';
import VisaStatusBadge from '../../components/ui/VisaStatusBadge';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { REGIONS, VISA_STATUSES, PILGRIM_TYPES } from '../../utils/constants';

const EMPTY_REG_FORM = { pilgrimLastName: '', pilgrimFirstName: '', phone: '', idNumber: '', region: '', pilgrimType: 'PELERIN' };

// Parseur des lignes du fichier d'inscription en masse (mêmes colonnes que le
// portail encadreur), tolérant sur les en-têtes FR/EN.
const PILGRIM_HEADER_ALIASES = {
  pilgrimLastName: ['pilgrimlastname', 'nom', 'nom du pèlerin'],
  pilgrimFirstName: ['pilgrimfirstname', 'prenom', 'prénom', 'prénom du pèlerin'],
  phone: ['phone', 'telephone', 'téléphone'],
  idNumber: ['idnumber', 'passeport', 'passport', 'cni'],
  region: ['region', 'région'],
  pilgrimType: ['pilgrimtype', 'type', 'type de pèlerin'],
};

function normalizePilgrimRow(rawRow) {
  const lower = Object.entries(rawRow).map(([k, v]) => [k.trim().toLowerCase(), v]);
  const pick = (field) => {
    const match = lower.find(([key]) => PILGRIM_HEADER_ALIASES[field].includes(key));
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

export default function ClientsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [bordereaux, setBordereaux] = useState([]);
  const [encadreurs, setEncadreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [visaStatus, setVisaStatus] = useState('');
  const [encadreurId, setEncadreurId] = useState('');

  const [checking, setChecking] = useState(false);
  const [anomalies, setAnomalies] = useState(null);

  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importEncadreurId, setImportEncadreurId] = useState('');
  const fileInputRef = useRef(null);

  // --- Inscription d'un client (à l'unité) ---
  const [regEncadreurId, setRegEncadreurId] = useState('');
  const [regForm, setRegForm] = useState(EMPTY_REG_FORM);
  const [regErrors, setRegErrors] = useState({});
  const [regError, setRegError] = useState(null);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regCredential, setRegCredential] = useState(null);

  // --- Inscription en masse (import de la liste des clients) ---
  const [regMassEncadreurId, setRegMassEncadreurId] = useState('');
  const [regMassImporting, setRegMassImporting] = useState(false);
  const [regMassSummary, setRegMassSummary] = useState(null);
  const regMassFileRef = useRef(null);

  function reload() {
    setLoading(true);
    Promise.all([getBordereaux({}), getEncadreurs({ onlyActive: false })])
      .then(([b, e]) => {
        setBordereaux(b);
        setEncadreurs(e);
      })
      .catch(() => {
        setBordereaux([]);
        setEncadreurs([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  const encadreurName = useMemo(() => {
    const map = new Map(encadreurs.map((enc) => [enc.id, enc.name]));
    return (id) => map.get(id) || id;
  }, [encadreurs]);

  // Un client est toujours rattaché à un encadreur : seuls les encadreurs actifs
  // peuvent en recevoir de nouveaux.
  const activeEncadreurs = useMemo(() => encadreurs.filter((e) => e.active), [encadreurs]);

  function updateRegField(field, value) {
    setRegForm((prev) => ({ ...prev, [field]: value }));
    setRegErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // Inscription à l'unité : le client est rattaché à l'encadreur choisi (dossier
  // en attente de paiement, avec mot de passe de suivi généré).
  async function handleRegisterClient(e) {
    e.preventDefault();
    setRegError(null);
    setRegCredential(null);
    if (!regEncadreurId) { setRegError(t('clients.register.encadreurRequired')); return; }
    const validationErrors = validateBordereau(
      { ...regForm, encadreurId: regEncadreurId, pilgrimCount: 1 },
      t,
      { requireAgency: false, requireEmail: false }
    );
    setRegErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setRegSubmitting(true);
    try {
      const record = await registerPilgrimByEncadreur({ ...regForm, pilgrimCount: 1 }, regEncadreurId);
      toast.success(t('toasts.pilgrimRegisteredByEncadreur'));
      setRegCredential({
        name: `${record.pilgrimFirstName} ${record.pilgrimLastName}`,
        idNumber: record.idNumber,
        password: record.password,
      });
      setRegForm(EMPTY_REG_FORM);
      reload();
    } catch (err) {
      if (err.code === 'DUPLICATE_PILGRIM') setRegError(t('bordereau.errors.duplicate', { season: '' }));
      else if (err.code === 'DUPLICATE_PHONE') setRegError(t('bordereau.errors.duplicatePhone'));
      else setRegError(t('common.error'));
    } finally {
      setRegSubmitting(false);
    }
  }

  function handleDownloadRegisterTemplate() {
    exportTemplateToExcel(
      [{ pilgrimLastName: 'Nom', pilgrimFirstName: 'Prénom', phone: '699112233', idNumber: '1002340000', region: REGIONS[0], pilgrimType: 'PELERIN' }],
      'modele-inscription-clients.xlsx',
      'Clients',
      { region: REGIONS, pilgrimType: PILGRIM_TYPES }
    );
  }

  async function handleMassRegisterFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!regMassEncadreurId) { toast.error(t('clients.register.encadreurRequired')); return; }

    setRegMassImporting(true);
    setRegMassSummary(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const rows = rawRows.map(normalizePilgrimRow);
      const summary = await importPilgrims(rows, regMassEncadreurId);
      setRegMassSummary(summary);
      reload();
    } catch {
      setRegMassSummary({ created: [], skipped: [], errors: [{ row: 0, reason: 'PARSE_ERROR' }] });
    } finally {
      setRegMassImporting(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bordereaux.filter((b) => {
      if (region && b.region !== region) return false;
      if (visaStatus && b.visaStatus !== visaStatus) return false;
      if (encadreurId && b.encadreurId !== encadreurId) return false;
      if (term) {
        const haystack = `${b.pilgrimFirstName} ${b.pilgrimLastName} ${b.idNumber} ${b.phone}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [bordereaux, region, visaStatus, encadreurId, search]);

  // Situation visa (compte par statut) sur la sélection courante : globale, ou
  // pour l'encadreur/la région filtrés. Chaque dossier compte pour son nombre de
  // pèlerins.
  const visaCounts = useMemo(() => {
    const counts = Object.fromEntries(VISA_STATUSES.map((s) => [s, 0]));
    filtered.forEach((b) => { counts[b.visaStatus] = (counts[b.visaStatus] || 0) + (b.pilgrimCount || 1); });
    return counts;
  }, [filtered]);

  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(filtered);

  async function handleCheckBI() {
    setChecking(true);
    setAnomalies(null);
    try {
      const result = await checkStatusAnomalies();
      setAnomalies(result);
    } finally {
      setChecking(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

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
      const rows = rawRows.map((row) => {
        const lower = Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]);
        const pick = (keys) => {
          const match = lower.find(([k]) => keys.includes(k));
          return match ? String(match[1] ?? '').trim() : '';
        };
        return {
          idNumber: pick(['idnumber', 'cni', 'passeport', 'cni / passeport', 'رقم البطاقة']),
          status: pick(['status', 'statut', 'الحالة']),
          note: pick(['note', 'commentaire', 'ملاحظة']),
        };
      });
      const summary = await importVisaStatuses(rows, importEncadreurId || null);
      setImportSummary(summary);
      reload();
    } catch {
      setImportSummary({ updated: [], notFound: [], invalidStatus: [{ row: 0, reason: 'PARSE_ERROR' }] });
    } finally {
      setImporting(false);
    }
  }

  function handleDownloadTemplate() {
    // Le modèle est pré-rempli avec les clients du périmètre d'import courant
    // (encadreur sélectionné, ou tous) et leur statut visa actuel : l'opérateur
    // n'a plus qu'à corriger les statuts qui changent avant de réimporter.
    // Les codes bruts (ACCORDE, REFUSE…) sont ce qu'attend l'import.
    const scopedClients = importEncadreurId
      ? bordereaux.filter((b) => b.encadreurId === importEncadreurId)
      : bordereaux;
    const rows = scopedClients.length
      ? buildVisaStatusTemplateRows(scopedClients)
      : [{ Pelerin: '', idNumber: '1002345678', status: 'ACCORDE', note: '' }];
    exportTemplateToExcel(rows, 'modele-statuts-visa.xlsx', 'Statuts', { status: VISA_STATUSES });
  }

  // Source unique pour les deux exports : Excel et PDF restent alignés.
  function buildExportRows() {
    return filtered.map((b) => ({
      Pelerin: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
      Passeport: b.idNumber,
      Telephone: b.phone,
      Region: b.region,
      Encadreur: encadreurName(b.encadreurId),
      MontantPaye: b.amountPaid,
      MontantCible: b.targetAmount,
      StatutVisa: b.visaStatus,
    }));
  }

  function handleExportClients() {
    exportToExcel(buildExportRows(), 'clients.xlsx', 'Clients');
  }

  function handleExportClientsPdf() {
    const rows = buildExportRows();
    generateListPdf({
      title: t('clients.title'),
      columns: Object.keys(rows[0] || { Pelerin: '' }),
      rows: rows.map((row) => Object.values(row)),
      filename: 'clients.pdf',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-afriland-black">{t('clients.title')}</h1>
          <p className="text-sm text-afriland-gray-600">{t('clients.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleExportClients}>
            {t('common.exportExcel')}
          </button>
          <button type="button" className="btn-secondary" onClick={handleExportClientsPdf}>
            {t('common.exportPdf')}
          </button>
        </div>
      </div>

      {/* Inscription d'un client à l'unité (rattaché à un encadreur). */}
      <div className="card space-y-3">
        <div>
          <p className="text-sm font-semibold text-afriland-black">{t('clients.register.title')}</p>
          <p className="text-xs text-afriland-gray-600">{t('clients.register.help')}</p>
        </div>
        <form onSubmit={handleRegisterClient} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <select
              className={`form-input sm:max-w-md ${regError && !regEncadreurId ? 'form-input-error' : ''}`}
              value={regEncadreurId}
              onChange={(e) => setRegEncadreurId(e.target.value)}
            >
              <option value="">{t('clients.register.chooseEncadreur')}</option>
              {activeEncadreurs.map((enc) => <option key={enc.id} value={enc.id}>{enc.name}</option>)}
            </select>
          </div>
          <div>
            <input
              className={`form-input ${regErrors.pilgrimLastName ? 'form-input-error' : ''}`}
              placeholder={t('bordereau.pilgrimLastName')}
              value={regForm.pilgrimLastName}
              onChange={(e) => updateRegField('pilgrimLastName', e.target.value)}
            />
            {regErrors.pilgrimLastName && <p className="form-error">{regErrors.pilgrimLastName}</p>}
          </div>
          <div>
            <input
              className={`form-input ${regErrors.pilgrimFirstName ? 'form-input-error' : ''}`}
              placeholder={t('bordereau.pilgrimFirstName')}
              value={regForm.pilgrimFirstName}
              onChange={(e) => updateRegField('pilgrimFirstName', e.target.value)}
            />
            {regErrors.pilgrimFirstName && <p className="form-error">{regErrors.pilgrimFirstName}</p>}
          </div>
          <div>
            <input
              className={`form-input ${regErrors.phone ? 'form-input-error' : ''}`}
              placeholder={t('bordereau.phone')}
              value={regForm.phone}
              onChange={(e) => updateRegField('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
              inputMode="numeric"
            />
            {regErrors.phone && <p className="form-error">{regErrors.phone}</p>}
          </div>
          <div>
            <input
              className={`form-input ${regErrors.idNumber ? 'form-input-error' : ''}`}
              placeholder={t('bordereau.idNumber')}
              value={regForm.idNumber}
              onChange={(e) => updateRegField('idNumber', e.target.value)}
            />
            {regErrors.idNumber && <p className="form-error">{regErrors.idNumber}</p>}
          </div>
          <div>
            <select
              className={`form-input ${regErrors.region ? 'form-input-error' : ''}`}
              value={regForm.region}
              onChange={(e) => updateRegField('region', e.target.value)}
            >
              <option value="">{t('common.select')}</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {regErrors.region && <p className="form-error">{regErrors.region}</p>}
          </div>
          <select className="form-input" value={regForm.pilgrimType} onChange={(e) => updateRegField('pilgrimType', e.target.value)}>
            {PILGRIM_TYPES.map((type) => <option key={type} value={type}>{t(`bordereau.pilgrimTypes.${type}`)}</option>)}
          </select>
          <button type="submit" className="btn-primary" disabled={regSubmitting}>
            {regSubmitting ? t('common.loading') : t('clients.register.submit')}
          </button>
          {regError && <p className="form-error lg:col-span-3">{regError}</p>}
        </form>
        {regCredential && (
          <div className="rounded-md border border-visa-granted/30 bg-visa-granted/5 p-3 text-sm">
            <p className="font-semibold text-visa-granted">{t('encadreurPortal.credentialTitle', { name: regCredential.name })}</p>
            <p className="mt-1 text-afriland-gray-600">
              {t('bordereau.idNumber')} : <span className="font-mono text-afriland-black">{regCredential.idNumber}</span>
              {' — '}
              {t('encadreurPortal.password')} : <span className="font-mono text-afriland-black">{regCredential.password}</span>
            </p>
          </div>
        )}
      </div>

      {/* Inscription en masse : import d'une liste de clients pour un encadreur. */}
      <div className="card space-y-3">
        <div>
          <p className="text-sm font-semibold text-afriland-black">{t('clients.register.massTitle')}</p>
          <p className="text-xs text-afriland-gray-600">{t('clients.register.massHelp')}</p>
        </div>
        <select
          className="form-input sm:max-w-md"
          value={regMassEncadreurId}
          onChange={(e) => setRegMassEncadreurId(e.target.value)}
        >
          <option value="">{t('clients.register.chooseEncadreur')}</option>
          {activeEncadreurs.map((enc) => <option key={enc.id} value={enc.id}>{enc.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadRegisterTemplate}>
            {t('adminEncadreurs.downloadTemplate')}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => regMassFileRef.current?.click()}
            disabled={regMassImporting || !regMassEncadreurId}
          >
            {regMassImporting ? t('common.loading') : t('adminEncadreurs.importFile')}
          </button>
          <input ref={regMassFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleMassRegisterFile} />
        </div>
        {regMassSummary && (
          <div className="rounded-md bg-afriland-gray-50 p-3 text-sm">
            <p className="font-medium text-visa-granted">{t('encadreurPortal.pilgrimsImportCreated', { count: regMassSummary.created.length })}</p>
            {regMassSummary.skipped.length > 0 && (
              <p className="text-afriland-gray-600">{t('encadreurPortal.pilgrimsImportSkipped', { count: regMassSummary.skipped.length })}</p>
            )}
            {regMassSummary.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-visa-refused">
                {regMassSummary.errors.map((err, index) => (
                  <li key={index}>{t('adminEncadreurs.importErrorRow', { row: err.row, reason: err.reason })}</li>
                ))}
              </ul>
            )}
            {regMassSummary.created.length > 0 && (
              <button
                type="button"
                className="btn-secondary mt-2"
                onClick={() =>
                  exportToExcel(
                    regMassSummary.created.map((c) => ({
                      Pelerin: c.pilgrimName,
                      Passeport: c.idNumber,
                      Telephone: c.phone,
                      MotDePasse: c.password,
                    })),
                    'identifiants-clients.xlsx',
                    'Identifiants'
                  )
                }
              >
                {t('encadreurPortal.exportCredentials')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-afriland-black">{t('clients.biCheckTitle')}</p>
            <p className="text-xs text-afriland-gray-600">{t('clients.biCheckHelp')}</p>
          </div>
          <button type="button" className="btn-primary" onClick={handleCheckBI} disabled={checking}>
            {checking ? t('common.loading') : t('clients.biCheckButton')}
          </button>
        </div>

        {anomalies && (
          <div className="rounded-md bg-afriland-gray-50 p-3 text-sm">
            <p className="text-xs text-afriland-gray-600">
              {t('clients.biCheckedAt', { date: formatDate(anomalies.checkedAt) })}
            </p>
            {anomalies.anomalies.length === 0 ? (
              <p className="mt-1 font-medium text-visa-granted">{t('clients.biNoAnomaly')}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {anomalies.anomalies.map((a, index) => (
                  <li key={index} className="flex items-center justify-between gap-2 text-visa-complement">
                    <span>{a.pilgrimName} — {t(`clients.anomalyReasons.${a.reason}`)}</span>
                    <span className="font-mono text-xs text-afriland-gray-600">{a.bordereauId}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('clients.importTitle')}</p>
        <p className="text-xs text-afriland-gray-600">{t('clients.importHelp')}</p>
        <div>
          <label className="form-label">{t('clients.importScope')}</label>
          <select className="form-input max-w-sm" value={importEncadreurId} onChange={(e) => setImportEncadreurId(e.target.value)}>
            <option value="">{t('clients.importScopeAll')}</option>
            {encadreurs.map((enc) => <option key={enc.id} value={enc.id}>{enc.name}</option>)}
          </select>
          <p className="mt-1 text-xs text-afriland-gray-600">{t('clients.importScopeHelp')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>
            {t('adminEncadreurs.downloadTemplate')}
          </button>
          <button type="button" className="btn-primary" onClick={handleImportClick} disabled={importing}>
            {importing ? t('common.loading') : t('adminEncadreurs.importFile')}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
        </div>

        {importSummary && (
          <div className="rounded-md bg-afriland-gray-50 p-3 text-sm">
            <p className="font-medium text-visa-granted">
              {t('clients.importUpdated', { count: importSummary.updated.length })}
            </p>
            {importSummary.notFound.length > 0 && (
              <p className="text-afriland-gray-600">{t('clients.importNotFound', { count: importSummary.notFound.length })}</p>
            )}
            {importSummary.wrongEncadreur?.length > 0 && (
              <p className="text-visa-complement">{t('clients.importWrongEncadreur', { count: importSummary.wrongEncadreur.length })}</p>
            )}
            {importSummary.invalidStatus.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-visa-refused">
                {importSummary.invalidStatus.map((err, index) => (
                  <li key={index}>{t('adminEncadreurs.importErrorRow', { row: err.row, reason: err.reason || err.status })}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Situation visa (compte par statut) sur la sélection courante. */}
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="text-sm font-semibold text-afriland-black">{t('clients.visaSituation')}</p>
        {VISA_STATUSES.map((status) => (
          <span key={status} className="flex items-center gap-2 text-sm">
            <VisaStatusBadge status={status} />
            <span className="font-semibold text-afriland-black">{visaCounts[status]}</span>
          </span>
        ))}
      </div>

      <div className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="form-input"
          placeholder={t('clients.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-input" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">{t('dashboard.filters.region')}</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="form-input" value={encadreurId} onChange={(e) => setEncadreurId(e.target.value)}>
          <option value="">{t('dashboard.filters.encadreur')}</option>
          {encadreurs.map((enc) => <option key={enc.id} value={enc.id}>{enc.name}</option>)}
        </select>
        <select className="form-input" value={visaStatus} onChange={(e) => setVisaStatus(e.target.value)}>
          <option value="">{t('visa.visaStatus')}</option>
          {VISA_STATUSES.map((status) => <option key={status} value={status}>{t(`visa.statuses.${status}`)}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('visa.idNumber')}</th>
              <th className="px-4 py-3">{t('bordereau.table.region')}</th>
              <th className="px-4 py-3">{t('bordereau.table.encadreur')}</th>
              <th className="px-4 py-3 text-right">{t('bordereau.table.amount')}</th>
              <th className="px-4 py-3">{t('visa.visaStatus')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
            {!loading && pageItems.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{b.pilgrimFirstName} {b.pilgrimLastName}</p>
                  <p className="text-xs text-afriland-gray-600">{b.phone}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{b.idNumber}</td>
                <td className="px-4 py-3">{b.region}</td>
                <td className="px-4 py-3">{encadreurName(b.encadreurId)}</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(b.amountPaid)}
                  <span className="block text-xs text-afriland-gray-600">/ {formatCurrency(b.targetAmount)}</span>
                </td>
                <td className="px-4 py-3"><VisaStatusBadge status={b.visaStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}
