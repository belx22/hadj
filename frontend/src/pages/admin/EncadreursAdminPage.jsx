import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getEncadreurs, createEncadreur, updateEncadreur, importEncadreurs } from '../../api/referenceDataApi';
import { exportToExcel, exportTemplateToExcel } from '../../utils/excel';
import { generateListPdf } from '../../utils/pdf';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { REGIONS } from '../../utils/constants';

const EMPTY_FORM = { name: '', region: REGIONS[0], code: '' };

const HEADER_ALIASES = {
  name: ['name', 'nom', 'nom de l\'encadreur', 'اسم المؤطر'],
  region: ['region', 'région', 'منطقة'],
  code: ['code', 'code encadreur', 'رمز المؤطر'],
};

function normalizeRow(rawRow) {
  const lowerEntries = Object.entries(rawRow).map(([key, value]) => [key.trim().toLowerCase(), value]);
  const pick = (field) => {
    const match = lowerEntries.find(([key]) => HEADER_ALIASES[field].includes(key));
    return match ? String(match[1] ?? '').trim() : '';
  };
  return { name: pick('name'), region: pick('region'), code: pick('code') };
}

export default function EncadreursAdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [encadreurs, setEncadreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [editError, setEditError] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(encadreurs);

  function reload() {
    setLoading(true);
    getEncadreurs({ onlyActive: false }).then((data) => {
      setEncadreurs(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  function codeErrorMessage(err) {
    if (err.code === 'INVALID_CODE') return t('adminEncadreurs.errors.invalidCode');
    if (err.code === 'CODE_TAKEN') return t('adminEncadreurs.errors.codeTaken');
    return t('common.error');
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError(null);
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await createEncadreur(form);
      toast.success(t('toasts.encadreurCreated'));
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setCreateError(codeErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(enc) {
    setEditingId(enc.id);
    setEditValues({ name: enc.name, region: enc.region, code: enc.code || '' });
    setEditError(null);
  }

  async function saveEdit(id) {
    setEditError(null);
    try {
      await updateEncadreur(id, editValues);
      toast.success(t('toasts.encadreurUpdated'));
      setEditingId(null);
      reload();
    } catch (err) {
      setEditError(codeErrorMessage(err));
    }
  }

  async function toggleActive(enc) {
    await updateEncadreur(enc.id, { active: !enc.active });
    toast.info(t('toasts.encadreurStatusUpdated'));
    reload();
  }

  function handleDownloadTemplate() {
    exportTemplateToExcel(
      [{ name: 'El Hadj Exemple Nom', region: REGIONS[0], code: '' }],
      'modele-encadreurs.xlsx',
      'Encadreurs',
      { region: REGIONS }
    );
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  // Source unique pour les deux exports : Excel et PDF restent alignés.
  function buildExportRows() {
    return encadreurs.map((enc) => ({
      Nom: enc.name,
      Code: enc.code || '—',
      Region: enc.region,
      Statut: enc.active ? 'Actif' : 'Inactif',
    }));
  }

  function handleExportExcel() {
    exportToExcel(buildExportRows(), 'encadreurs.xlsx', 'Encadreurs');
  }

  function handleExportPdf() {
    const rows = buildExportRows();
    generateListPdf({
      title: t('adminEncadreurs.title'),
      columns: Object.keys(rows[0] || { Nom: '' }),
      rows: rows.map((row) => Object.values(row)),
      filename: 'encadreurs.pdf',
    });
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
      const summary = await importEncadreurs(rows);
      setImportSummary(summary);
      reload();
    } catch {
      setImportSummary({ created: [], skipped: [], errors: [{ row: 0, reason: 'PARSE_ERROR' }] });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-afriland-black">{t('adminEncadreurs.title')}</h1>
          <p className="text-sm text-afriland-gray-600">{t('adminEncadreurs.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleExportExcel}>{t('common.exportExcel')}</button>
          <button type="button" className="btn-secondary" onClick={handleExportPdf}>{t('common.exportPdf')}</button>
        </div>
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('adminEncadreurs.importTitle')}</p>
        <p className="text-xs text-afriland-gray-600">{t('adminEncadreurs.importHelp')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>
            {t('adminEncadreurs.downloadTemplate')}
          </button>
          <button type="button" className="btn-primary" onClick={handleImportClick} disabled={importing}>
            {importing ? t('common.loading') : t('adminEncadreurs.importFile')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {importSummary && (
          <div className="rounded-md bg-afriland-gray-50 p-3 text-sm">
            <p className="font-medium text-visa-granted">
              {t('adminEncadreurs.importCreated', { count: importSummary.created.length })}
            </p>
            {importSummary.skipped.length > 0 && (
              <p className="text-afriland-gray-600">
                {t('adminEncadreurs.importSkipped', { count: importSummary.skipped.length })}
              </p>
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

      <form onSubmit={handleCreate} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          className="form-input"
          placeholder={t('adminEncadreurs.name')}
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <select
          className="form-input"
          value={form.region}
          onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
        >
          {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
        </select>
        <input
          className="form-input font-mono uppercase"
          placeholder={t('adminEncadreurs.codePlaceholder')}
          maxLength={3}
          value={form.code}
          onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
        />
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('common.loading') : t('adminEncadreurs.add')}
        </button>
        {createError && <p className="form-error sm:col-span-4">{createError}</p>}
        <p className="text-xs text-afriland-gray-600 sm:col-span-4">{t('adminEncadreurs.codeHelp')}</p>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('adminEncadreurs.name')}</th>
              <th className="px-4 py-3">{t('bordereau.region')}</th>
              <th className="px-4 py-3">{t('adminEncadreurs.code')}</th>
              <th className="px-4 py-3">{t('adminEncadreurs.status')}</th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>}
            {!loading && pageItems.map((enc) => (
              <tr key={enc.id}>
                {editingId === enc.id ? (
                  <>
                    <td className="px-4 py-2">
                      <input
                        className="form-input"
                        value={editValues.name}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className="form-input"
                        value={editValues.region}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, region: e.target.value }))}
                      >
                        {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className="form-input font-mono uppercase"
                        maxLength={3}
                        value={editValues.code}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      />
                    </td>
                    <td className="px-4 py-2">{enc.active ? t('adminEncadreurs.active') : t('adminEncadreurs.inactive')}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => saveEdit(enc.id)}>{t('common.save')}</button>
                        <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
                      </div>
                      {editError && <p className="form-error mt-1">{editError}</p>}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">{enc.name}</td>
                    <td className="px-4 py-3">{enc.region}</td>
                    <td className="px-4 py-3 font-mono text-xs">{enc.code || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={enc.active ? 'text-visa-granted font-semibold' : 'text-visa-refused font-semibold'}>
                        {enc.active ? t('adminEncadreurs.active') : t('adminEncadreurs.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" className="text-xs font-semibold text-afriland-red hover:underline" onClick={() => startEdit(enc)}>
                          {t('adminEncadreurs.edit')}
                        </button>
                        <button type="button" className="text-xs font-semibold text-afriland-gray-600 hover:underline" onClick={() => toggleActive(enc)}>
                          {enc.active ? t('adminEncadreurs.deactivate') : t('adminEncadreurs.activate')}
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}
