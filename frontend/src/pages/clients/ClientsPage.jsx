import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { getBordereaux } from '../../api/bordereauApi';
import { getEncadreurs } from '../../api/referenceDataApi';
import { importVisaStatuses, checkStatusAnomalies } from '../../api/visaApi';
import { exportToExcel, exportTemplateToExcel } from '../../utils/excel';
import { generateListPdf } from '../../utils/pdf';
import VisaStatusBadge from '../../components/ui/VisaStatusBadge';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { REGIONS, VISA_STATUSES } from '../../utils/constants';

export default function ClientsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
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

  function reload() {
    setLoading(true);
    Promise.all([getBordereaux({}), getEncadreurs({ onlyActive: false })]).then(([b, e]) => {
      setBordereaux(b);
      setEncadreurs(e);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  const encadreurName = useMemo(() => {
    const map = new Map(encadreurs.map((enc) => [enc.id, enc.name]));
    return (id) => map.get(id) || id;
  }, [encadreurs]);

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
      const summary = await importVisaStatuses(rows, user, importEncadreurId || null);
      setImportSummary(summary);
      reload();
    } catch {
      setImportSummary({ updated: [], notFound: [], invalidStatus: [{ row: 0, reason: 'PARSE_ERROR' }] });
    } finally {
      setImporting(false);
    }
  }

  function handleDownloadTemplate() {
    // Codes bruts dans la liste déroulante : c'est ce qu'attend l'import.
    exportTemplateToExcel(
      [{ idNumber: '1002345678', status: 'ACCORDE', note: '' }],
      'modele-statuts-visa.xlsx',
      'Statuts',
      { status: VISA_STATUSES }
    );
  }

  // Source unique pour les deux exports : Excel et PDF restent alignés.
  function buildExportRows() {
    return filtered.map((b) => ({
      Pelerin: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
      CNI_Passeport: b.idNumber,
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
