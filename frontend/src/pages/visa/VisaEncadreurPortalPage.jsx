import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getEncadreurGroup, registerPilgrimByEncadreur, importPilgrims, bulkChangeVisaStatus } from '../../api/visaApi';
import StatCard from '../../components/ui/StatCard';
import VisaStatusBadge from '../../components/ui/VisaStatusBadge';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { formatCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excel';
import { generateReportingPdf } from '../../utils/pdf';
import { CURRENT_SEASON, PILGRIM_TYPES, REGIONS, VISA_STATUSES } from '../../utils/constants';
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

export default function VisaEncadreurPortalPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [group, setGroup] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [importSummary, setImportSummary] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState(VISA_STATUSES[0]);
  const [bulkNote, setBulkNote] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState(null);

  function reload() {
    setLoading(true);
    getEncadreurGroup(user.encadreurId).then((groupData) => {
      setGroup(groupData);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.encadreurId]);

  const stats = useMemo(() => {
    const collected = group.reduce((sum, b) => sum + b.amountPaid, 0);
    const target = group.reduce((sum, b) => sum + b.targetAmount, 0);
    const eligible = group.reduce((sum, b) => sum + b.eligiblePilgrims, 0);
    const incomplete = group.filter((b) => !b.isComplete).length;
    return { collected, target, eligible, incomplete };
  }, [group]);

  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(group);

  function handleExportExcel() {
    exportToExcel(
      group.map((b) => ({
        Pelerin: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
        CNI: b.idNumber,
        Telephone: b.phone,
        Montant: b.amountPaid,
        StatutVisa: b.visaStatus,
        Eligible: b.eligiblePilgrims >= b.pilgrimCount ? 'Oui' : 'Non',
      })),
      `groupe-${user.encadreurId}.xlsx`,
      'Groupe'
    );
  }

  function handleExportPdf() {
    generateReportingPdf(
      {
        season: CURRENT_SEASON,
        totalCollected: stats.collected,
        totalPilgrims: group.reduce((sum, b) => sum + b.pilgrimCount, 0),
        eligiblePilgrims: stats.eligible,
        bordereauxCount: group.length,
        avgAmount: group.length ? Math.round(stats.collected / group.length) : 0,
        byEncadreur: [{ encadreurName: user.name, collected: stats.collected, pilgrims: group.length, bordereaux: group.length }],
        byRegion: [],
      },
      `Groupe ${user.name}`
    );
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setFormError(null);
    const validationErrors = validateBordereau(
      { ...form, encadreurId: user.encadreurId },
      t,
      { requireAgency: false, requireEmail: false }
    );
    setFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await registerPilgrimByEncadreur({ ...form, pilgrimCount: Number(form.pilgrimCount) }, user.encadreurId, user);
      toast.success(t('toasts.pilgrimRegisteredByEncadreur'));
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      if (err.code === 'DUPLICATE_PILGRIM') {
        setFormError(t('bordereau.errors.duplicate', { season: CURRENT_SEASON }));
      } else {
        setFormError(t('common.error'));
      }
    } finally {
      setSubmitting(false);
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
      const rows = rawRows.map(normalizeRow);
      const summary = await importPilgrims(rows, user.encadreurId, user);
      setImportSummary(summary);
      reload();
    } catch {
      setImportSummary({ created: [], skipped: [], errors: [{ row: 0, reason: 'PARSE_ERROR' }] });
    } finally {
      setImporting(false);
    }
  }

  function handleDownloadTemplate() {
    exportToExcel(
      [{ pilgrimLastName: 'Nom', pilgrimFirstName: 'Prénom', phone: '699112233', idNumber: '1002345699', region: REGIONS[0], pilgrimType: 'PELERIN' }],
      'modele-pelerins.xlsx',
      'Pelerins'
    );
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageSelection() {
    const pageIds = pageItems.map((b) => b.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  async function handleApplyToSelection() {
    setBulkError(null);
    if (selectedIds.size === 0) {
      setBulkError(t('encadreurPortal.selectionRequired'));
      return;
    }
    setBulkBusy(true);
    try {
      const result = await bulkChangeVisaStatus(
        { bordereauIds: [...selectedIds], newStatus: bulkStatus, note: bulkNote },
        user
      );
      toast.success(t('encadreurPortal.bulkSuccess', { count: result.updatedCount }));
      setSelectedIds(new Set());
      setBulkNote('');
      reload();
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleApplyToGroup() {
    setBulkError(null);
    if (!window.confirm(t('encadreurPortal.applyToGroupConfirm', { status: t(`visa.statuses.${bulkStatus}`), count: group.length }))) {
      return;
    }
    setBulkBusy(true);
    try {
      const result = await bulkChangeVisaStatus(
        { encadreurId: user.encadreurId, newStatus: bulkStatus, note: bulkNote },
        user
      );
      toast.success(t('encadreurPortal.bulkSuccess', { count: result.updatedCount }));
      setSelectedIds(new Set());
      setBulkNote('');
      reload();
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading) return <p className="text-afriland-gray-600">{t('common.loading')}</p>;

  const pageIds = pageItems.map((b) => b.id);
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-afriland-black">{t('visa.encadreurLoginTitle')}</h1>
          <p className="text-sm text-afriland-gray-600">{user.name}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={handleExportExcel}>{t('common.exportExcel')}</button>
          <button type="button" className="btn-primary" onClick={handleExportPdf}>{t('common.exportPdf')}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('visa.collected')} value={formatCurrency(stats.collected)} accent="text-afriland-red" />
        <StatCard label={t('visa.target')} value={formatCurrency(stats.target)} />
        <StatCard label={t('visa.eligibleCount')} value={stats.eligible} accent="text-visa-granted" />
        <StatCard label={t('visa.incompleteAlert')} value={stats.incomplete} accent={stats.incomplete > 0 ? 'text-visa-complement' : undefined} />
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
          <div>
            <input
              type="number"
              min="1"
              className={`form-input ${formErrors.pilgrimCount ? 'form-input-error' : ''}`}
              placeholder={t('bordereau.pilgrimCount')}
              value={form.pilgrimCount}
              onChange={(e) => updateForm('pilgrimCount', e.target.value)}
            />
            {formErrors.pilgrimCount && <p className="form-error">{formErrors.pilgrimCount}</p>}
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('common.loading') : t('encadreurPortal.registerButton')}
          </button>
        </form>
        {formError && <p className="form-error">{formError}</p>}
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('encadreurPortal.importTitle')}</p>
        <p className="text-xs text-afriland-gray-600">{t('encadreurPortal.importHelp')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>{t('adminEncadreurs.downloadTemplate')}</button>
          <button type="button" className="btn-primary" onClick={handleImportClick} disabled={importing}>
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
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('encadreurPortal.bulkValidationTitle')}</p>
        <p className="text-xs text-afriland-gray-600">{t('encadreurPortal.bulkValidationHelp')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="form-input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            {VISA_STATUSES.map((status) => <option key={status} value={status}>{t(`visa.statuses.${status}`)}</option>)}
          </select>
          <input
            className="form-input lg:col-span-2"
            placeholder={t('encadreurPortal.notePlaceholder')}
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
          />
          <p className="flex items-center text-sm text-afriland-gray-600">{t('encadreurPortal.selectedCount', { count: selectedIds.size })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={handleApplyToSelection} disabled={bulkBusy}>
            {t('encadreurPortal.applyToSelected')}
          </button>
          <button type="button" className="btn-secondary" onClick={handleApplyToGroup} disabled={bulkBusy}>
            {t('encadreurPortal.applyToGroup')}
          </button>
        </div>
        {bulkError && <p className="form-error">{bulkError}</p>}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={pageAllSelected} onChange={togglePageSelection} aria-label={t('encadreurPortal.selectAll')} />
              </th>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('visa.idNumber')}</th>
              <th className="px-4 py-3">{t('bordereau.table.amount')}</th>
              <th className="px-4 py-3">{t('visa.visaStatus')}</th>
              <th className="px-4 py-3">{t('visa.eligibility')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {pageItems.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelected(b.id)} aria-label={b.id} />
                </td>
                <td className="px-4 py-3">{b.pilgrimFirstName} {b.pilgrimLastName}</td>
                <td className="px-4 py-3 font-mono text-xs">{b.idNumber}</td>
                <td className="px-4 py-3">{formatCurrency(b.amountPaid)}</td>
                <td className="px-4 py-3"><VisaStatusBadge status={b.visaStatus} /></td>
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
