import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getPendingVersements,
  getVersementsHistory,
  validateVersement,
  bulkValidateVersements,
  importPaymentStatuses,
  rejectVersement,
  getRefunds,
  processRefund,
} from '../../api/paymentsApi';
import { getEncadreurs } from '../../api/referenceDataApi';
import { exportToExcel, exportTemplateToExcel } from '../../utils/excel';
import { generateListPdf } from '../../utils/pdf';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { VERSEMENT_STATUS_COLORS, VERSEMENT_METHODS, REGIONS } from '../../utils/constants';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';

// Filtres réutilisés par les onglets « En attente » et « Historique » :
// filtrage par encadreur et par région des versements.
function PaymentFilters({ region, setRegion, encadreurId, setEncadreurId, encadreurs, children }) {
  const { t } = useTranslation();
  return (
    <div className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <select className="form-input" value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="">{t('dashboard.filters.region')}</option>
        {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <select className="form-input" value={encadreurId} onChange={(e) => setEncadreurId(e.target.value)}>
        <option value="">{t('dashboard.filters.encadreur')}</option>
        {encadreurs.map((enc) => <option key={enc.id} value={enc.id}>{enc.name}</option>)}
      </select>
      {children}
    </div>
  );
}

const TABS = ['pending', 'history', 'refunds'];

export default function PaymentValidationPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-afriland-black">{t('paymentValidation.title')}</h1>
        <p className="text-sm text-afriland-gray-600">{t('paymentValidation.subtitle')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-afriland-gray-200">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === key ? 'border-afriland-red text-afriland-red' : 'border-transparent text-afriland-gray-600'
            }`}
          >
            {t(`paymentValidation.tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'refunds' && <RefundsTab />}
    </div>
  );
}

function PendingTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [encadreurs, setEncadreurs] = useState([]);
  const [region, setRegion] = useState('');
  const [encadreurId, setEncadreurId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  const filteredRows = useMemo(
    () => rows.filter((r) => (!region || r.region === region) && (!encadreurId || r.encadreurId === encadreurId)),
    [rows, region, encadreurId]
  );

  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(filteredRows);

  function reload() {
    setLoading(true);
    getPendingVersements().then((data) => {
      setRows(data);
      setSelectedIds(new Set());
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
    getEncadreurs({ onlyActive: false }).then(setEncadreurs);
  }, []);

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageSelection() {
    const pageIds = pageItems.map((r) => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function handleValidate(row) {
    setBusyId(row.id);
    setError(null);
    try {
      await validateVersement(row.bordereauId, row.id, user);
      toast.success(t('toasts.paymentValidated'));
      reload();
    } catch (err) {
      if (err.code === 'REFERENCE_ALREADY_USED') {
        setError(t('paymentValidation.errors.referenceAlreadyUsed', { reference: row.reference }));
      } else {
        setError(t('common.error'));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkValidate() {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      const items = rows
        .filter((r) => selectedIds.has(r.id))
        .map((r) => ({ bordereauId: r.bordereauId, versementId: r.id }));
      const result = await bulkValidateVersements(items, user);
      toast.success(t('paymentValidation.bulkValidated', { count: result.validated.length }));
      if (result.skipped.length > 0) {
        setError(t('paymentValidation.bulkSkipped', { count: result.skipped.length }));
      }
      reload();
    } finally {
      setBulkBusy(false);
    }
  }

  function handleDownloadImportTemplate() {
    exportTemplateToExcel(
      [
        { Reference: 'OM-2027-000123', Statut: 'VALIDE', Client: 'Amadou Bah' },
        { Reference: 'MTN-2027-000456', Statut: 'REJETE', Client: 'Fatou Sow' },
        { Reference: 'CPT-100002', Statut: '', Client: 'Ibrahima Diallo' },
      ],
      'modele-statuts-paiement.xlsx',
      'StatutsPaiement',
      { Statut: ['VALIDE', 'REJETE'] }
    );
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportSummary(null);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      // La référence est recherchée quelle que soit la colonne qui la porte
      // (Reference / Référence / Ref / Transaction...), idem pour le statut.
      const parsed = rawRows.map((row) => {
        const lower = Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]);
        const pick = (keys) => {
          const match = lower.find(([k]) => keys.includes(k));
          return match ? String(match[1] ?? '').trim() : '';
        };
        return {
          reference: pick(['reference', 'référence', 'ref', 'référence de la transaction', 'transaction', 'مرجع']),
          status: pick(['statut', 'status', 'etat', 'état', 'الحالة']),
        };
      });
      const summary = await importPaymentStatuses(parsed, user);
      setImportSummary(summary);
      reload();
    } catch {
      setImportSummary({ updated: [], skipped: [], unmatched: [], parseError: true });
    } finally {
      setImporting(false);
    }
  }

  async function handleReject(row) {
    const reason = window.prompt(t('paymentValidation.rejectPrompt'));
    if (reason === null) return;
    setBusyId(row.id);
    try {
      await rejectVersement(row.bordereauId, row.id, reason, user);
      toast.info(t('toasts.paymentRejected'));
      reload();
    } finally {
      setBusyId(null);
    }
  }

  const pageIds = pageItems.map((r) => r.id);
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  return (
    <div className="space-y-4">
      {error && (
        <div className="card border-visa-refused/30 bg-visa-refused/5">
          <p className="text-sm font-semibold text-visa-refused">{error}</p>
        </div>
      )}

      <PaymentFilters
        region={region}
        setRegion={setRegion}
        encadreurId={encadreurId}
        setEncadreurId={setEncadreurId}
        encadreurs={encadreurs}
      />

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('paymentValidation.import.title')}</p>
        <p className="text-xs text-afriland-gray-600">{t('paymentValidation.import.help')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadImportTemplate}>
            {t('paymentValidation.import.downloadTemplate')}
          </button>
          <button type="button" className="btn-primary" onClick={handleImportClick} disabled={importing}>
            {importing ? t('common.loading') : t('paymentValidation.import.importFile')}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
        </div>
        {importSummary && (
          <div className="rounded-md bg-afriland-gray-50 p-3 text-sm">
            {importSummary.parseError ? (
              <p className="text-visa-refused">{t('paymentValidation.import.parseError')}</p>
            ) : (
              <>
                <p className="font-medium text-visa-granted">
                  {t('paymentValidation.import.updated', { count: importSummary.updated.length })}
                </p>
                {importSummary.skipped.length > 0 && (
                  <p className="text-visa-complement">
                    {t('paymentValidation.import.skipped', { count: importSummary.skipped.length })}
                  </p>
                )}
                {importSummary.unmatched.length > 0 && (
                  <p className="text-afriland-gray-600">
                    {t('paymentValidation.import.unmatched', { count: importSummary.unmatched.length })}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={selectedIds.size === 0 || bulkBusy}
          onClick={handleBulkValidate}
        >
          {bulkBusy ? t('common.loading') : t('paymentValidation.validateSelected')}
        </button>
        <p className="text-sm text-afriland-gray-600">{t('paymentValidation.selectedCount', { count: selectedIds.size })}</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={pageAllSelected} onChange={togglePageSelection} aria-label={t('paymentValidation.selectAll')} />
              </th>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('paymentPage.method')}</th>
              <th className="px-4 py-3">{t('paymentPage.reference')}</th>
              <th className="px-4 py-3">{t('paymentValidation.accountNumber')}</th>
              <th className="px-4 py-3">{t('bordereau.agency')}</th>
              <th className="px-4 py-3 text-right">{t('bordereau.amountPaid')}</th>
              <th className="px-4 py-3">{t('bordereau.date')}</th>
              <th className="px-4 py-3">{t('paymentPage.receipt')}</th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
            {!loading && pageItems.map((row) => (
              <tr key={row.id} className={selectedIds.has(row.id) ? 'bg-afriland-red/5' : undefined}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelected(row.id)} aria-label={row.id} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.pilgrimName}</p>
                  <p className="text-xs text-afriland-gray-600">{row.idNumber}</p>
                </td>
                <td className="px-4 py-3">{t(`paymentPage.methods.${row.method}`)}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {row.reference}
                  {row.qrData && (
                    <span
                      className="ml-1.5 inline-flex items-center rounded bg-afriland-red/10 px-1.5 py-0.5 text-[10px] font-semibold text-afriland-red"
                      title={t('paymentPage.qrTooltip', {
                        account: row.qrData.accountNumber,
                        date: formatDate(row.qrData.operationDate),
                        caisse: row.qrData.codeCaisse,
                        type: row.qrData.typeOperation || '—',
                      })}
                    >
                      {t('paymentPage.qrBadge')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{row.accountNumber || '—'}</td>
                <td className="px-4 py-3">{row.agency || '—'}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.amount)}</td>
                <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3">
                  {row.receiptImage ? (
                    <a href={row.receiptImage} target="_blank" rel="noreferrer" className="text-xs font-semibold text-afriland-red hover:underline">
                      {t('paymentPage.viewReceipt')}
                    </a>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-primary !px-3 !py-1.5 text-xs"
                      disabled={busyId === row.id}
                      onClick={() => handleValidate(row)}
                    >
                      {t('paymentValidation.validate')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                      disabled={busyId === row.id}
                      onClick={() => handleReject(row)}
                    >
                      {t('paymentValidation.reject')}
                    </button>
                  </div>
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

function HistoryTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [encadreurs, setEncadreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', from: '', to: '', region: '', encadreurId: '' });
  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(rows);

  useEffect(() => {
    getEncadreurs({ onlyActive: false }).then(setEncadreurs);
  }, []);

  useEffect(() => {
    setLoading(true);
    getVersementsHistory(filters).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [filters]);

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  function useSingleDay(e) {
    const day = e.target.value;
    setFilters((prev) => ({ ...prev, from: day, to: day }));
  }

  // Source unique pour les deux exports : Excel et PDF restent alignés.
  // On exporte la liste filtrée, pas seulement la page affichée.
  function buildExportRows() {
    return rows.map((v) => ({
      Date: v.validatedAt || v.createdAt,
      Client: v.pilgrimName,
      CNI_Passeport: v.idNumber,
      Region: v.region,
      Encadreur: v.encadreurName || '—',
      Moyen: v.method,
      Reference: v.reference,
      Montant: v.amount,
      Statut: v.status,
    }));
  }

  function handleExportExcel() {
    exportToExcel(buildExportRows(), 'paiements.xlsx', 'Paiements');
  }

  function handleExportPdf() {
    const exportRows = buildExportRows();
    generateListPdf({
      title: t('paymentValidation.tabs.history'),
      columns: Object.keys(exportRows[0] || { Date: '' }),
      rows: exportRows.map((row) => Object.values(row)),
      filename: 'paiements.pdf',
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={handleExportExcel} disabled={rows.length === 0}>
          {t('common.exportExcel')}
        </button>
        <button type="button" className="btn-secondary" onClick={handleExportPdf} disabled={rows.length === 0}>
          {t('common.exportPdf')}
        </button>
      </div>

      <PaymentFilters
        region={filters.region}
        setRegion={(v) => updateFilter('region', v)}
        encadreurId={filters.encadreurId}
        setEncadreurId={(v) => updateFilter('encadreurId', v)}
        encadreurs={encadreurs}
      >
        <select className="form-input" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
          <option value="">{t('common.all')}</option>
          <option value="VALIDE">{t('paymentPage.statuses.VALIDE')}</option>
          <option value="REJETE">{t('paymentPage.statuses.REJETE')}</option>
        </select>
      </PaymentFilters>

      <div className="card grid grid-cols-2 gap-3 sm:grid-cols-3">
        <input
          type="date"
          className="form-input"
          value={filters.from}
          onChange={(e) => updateFilter('from', e.target.value)}
          title={t('common.from')}
        />
        <input
          type="date"
          className="form-input"
          value={filters.to}
          onChange={(e) => updateFilter('to', e.target.value)}
          title={t('common.to')}
        />
        <input
          type="date"
          className="form-input"
          onChange={useSingleDay}
          title={t('paymentValidation.singleDay')}
        />
      </div>
      <p className="text-xs text-afriland-gray-600">{t('paymentValidation.singleDayHelp')}</p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('paymentPage.method')}</th>
              <th className="px-4 py-3">{t('paymentPage.reference')}</th>
              <th className="px-4 py-3 text-right">{t('bordereau.amountPaid')}</th>
              <th className="px-4 py-3">{t('paymentValidation.processedOn')}</th>
              <th className="px-4 py-3">{t('paymentValidation.processedBy')}</th>
              <th className="px-4 py-3">{t('paymentPage.receipt')}</th>
              <th className="px-4 py-3">{t('paymentPage.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
            {!loading && pageItems.map((row) => {
              const colors = VERSEMENT_STATUS_COLORS[row.status];
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.pilgrimName}</p>
                    <p className="text-xs text-afriland-gray-600">{row.idNumber}</p>
                  </td>
                  <td className="px-4 py-3">{t(`paymentPage.methods.${row.method}`)}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.reference}
                    {row.qrData && (
                      <span
                        className="ml-1.5 inline-flex items-center rounded bg-afriland-red/10 px-1.5 py-0.5 text-[10px] font-semibold text-afriland-red"
                        title={t('paymentPage.qrTooltip', {
                          account: row.qrData.accountNumber,
                          date: formatDate(row.qrData.operationDate),
                          caisse: row.qrData.codeCaisse,
                          type: row.qrData.typeOperation || '—',
                        })}
                      >
                        {t('paymentPage.qrBadge')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.amount)}</td>
                  <td className="px-4 py-3">{formatDate(row.validatedAt)}</td>
                  <td className="px-4 py-3">{row.validatedBy || '—'}</td>
                  <td className="px-4 py-3">
                    {row.receiptImage ? (
                      <a href={row.receiptImage} target="_blank" rel="noreferrer" className="text-xs font-semibold text-afriland-red hover:underline">
                        {t('paymentPage.viewReceipt')}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', colors.bg, colors.text)}>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', colors.dot)} />
                      {t(`paymentPage.statuses.${row.status}`)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}

function RefundsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRow, setActiveRow] = useState(null);
  const [refundMethod, setRefundMethod] = useState('');
  const [refundReference, setRefundReference] = useState('');
  const [busy, setBusy] = useState(false);
  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(rows);

  function reload() {
    setLoading(true);
    getRefunds().then((data) => {
      setRows(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  function openRefundForm(row) {
    setActiveRow(row);
    setRefundMethod(row.method);
    setRefundReference('');
  }

  async function handleConfirmRefund() {
    if (!activeRow) return;
    setBusy(true);
    try {
      await processRefund(activeRow.bordereauId, activeRow.id, { refundMethod, refundReference }, user);
      toast.success(t('paymentValidation.refunds.done'));
      setActiveRow(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-afriland-gray-600">{t('paymentValidation.refunds.help')}</p>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('paymentValidation.refunds.originalMethod')}</th>
              <th className="px-4 py-3 text-right">{t('bordereau.amountPaid')}</th>
              <th className="px-4 py-3">{t('visa.visaStatus')}</th>
              <th className="px-4 py-3">{t('paymentValidation.refunds.status')}</th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
            {!loading && pageItems.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.pilgrimName}</p>
                  <p className="text-xs text-afriland-gray-600">{row.idNumber}</p>
                </td>
                <td className="px-4 py-3">{t(`paymentPage.methods.${row.method}`)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.amount)}</td>
                <td className="px-4 py-3">{t(`visa.statuses.${row.visaStatus}`)}</td>
                <td className="px-4 py-3">
                  {row.refundStatus === 'REMBOURSE' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-visa-granted/15 px-2.5 py-1 text-xs font-semibold text-green-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-visa-granted" />
                      {t('paymentValidation.refunds.refunded', { date: formatDate(row.refundedAt) })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-visa-complement/15 px-2.5 py-1 text-xs font-semibold text-orange-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-visa-complement" />
                      {t('paymentValidation.refunds.pending')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.refundStatus === 'A_REMBOURSER' && (
                    <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => openRefundForm(row)}>
                      {t('paymentValidation.refunds.process')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {activeRow && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-afriland-black">
            {t('paymentValidation.refunds.formTitle', { name: activeRow.pilgrimName })}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">{t('paymentValidation.refunds.method')}</label>
              <select className="form-input" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                {VERSEMENT_METHODS.map((method) => (
                  <option key={method} value={method}>{t(`paymentPage.methods.${method}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">{t('paymentValidation.refunds.reference')}</label>
              <input
                className="form-input"
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={busy} onClick={handleConfirmRefund}>
              {busy ? t('common.loading') : t('paymentValidation.refunds.confirm')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setActiveRow(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
