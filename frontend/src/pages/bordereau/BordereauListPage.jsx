import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getBordereaux } from '../../api/bordereauApi';
import { getEncadreurs } from '../../api/referenceDataApi';
import { changeVisaStatus } from '../../api/visaApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excel';
import { generateBordereauReceipt, generateListPdf } from '../../utils/pdf';
import { AGENCIES, PILGRIM_TYPES, REGIONS, VISA_STATUSES } from '../../utils/constants';
import VisaStatusBadge from '../../components/ui/VisaStatusBadge';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const STATUS_EDITOR_ROLES = ['GESTIONNAIRE_HADJ', 'SUPERVISEUR', 'ADMIN_DSI'];

export default function BordereauListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [encadreurs, setEncadreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ region: '', encadreurId: '', agency: '', pilgrimType: '' });

  const canEditStatus = STATUS_EDITOR_ROLES.includes(user?.role);
  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(items);

  useEffect(() => {
    getEncadreurs().then(setEncadreurs).catch(() => setEncadreurs([]));
  }, []);

  function reload() {
    setLoading(true);
    getBordereaux(filters)
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function handleStatusChange(bordereauId, newStatus) {
    await changeVisaStatus(bordereauId, newStatus, null);
    toast.success(t('toasts.statusUpdated'));
    reload();
  }

  const encadreurName = useMemo(() => {
    const map = new Map(encadreurs.map((enc) => [enc.id, enc.name]));
    return (id) => map.get(id) || id;
  }, [encadreurs]);

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  // Source unique pour les deux exports : Excel et PDF restent alignés.
  function buildExportRows() {
    return items.map((b) => ({
      Reference: b.reference,
      Pelerin: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
      Telephone: b.phone,
      Region: b.region,
      Agence: b.agency,
      Encadreur: encadreurName(b.encadreurId),
      Montant: b.amountPaid,
      Date: b.createdAt,
      Priorite: b.onlinePriority ? 'Oui' : 'Non',
      StatutVisa: b.visaStatus,
    }));
  }

  function handleExportExcel() {
    exportToExcel(buildExportRows(), 'bordereaux.xlsx', 'Bordereaux');
  }

  function handleExportPdf() {
    const rows = buildExportRows();
    generateListPdf({
      title: t('bordereau.listTitle'),
      columns: Object.keys(rows[0] || { Reference: '' }),
      rows: rows.map((row) => Object.values(row)),
      filename: 'bordereaux.pdf',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-afriland-black">{t('bordereau.listTitle')}</h1>
          <p className="text-sm text-afriland-gray-600">{items.length} {t('nav.bordereauList').toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={handleExportExcel}>{t('common.exportExcel')}</button>
          <button type="button" className="btn-secondary" onClick={handleExportPdf}>{t('common.exportPdf')}</button>
          <Link to="/bordereaux/nouveau" className="btn-primary">{t('nav.bordereauNew')}</Link>
        </div>
      </div>

      <div className="card grid grid-cols-2 gap-3 sm:grid-cols-4">
        <select className="form-input" value={filters.region} onChange={(e) => updateFilter('region', e.target.value)}>
          <option value="">{t('dashboard.filters.region')}</option>
          {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
        </select>
        <select className="form-input" value={filters.encadreurId} onChange={(e) => updateFilter('encadreurId', e.target.value)}>
          <option value="">{t('dashboard.filters.encadreur')}</option>
          {encadreurs.map((enc) => <option key={enc.id} value={enc.id}>{enc.name}</option>)}
        </select>
        <select className="form-input" value={filters.agency} onChange={(e) => updateFilter('agency', e.target.value)}>
          <option value="">{t('dashboard.filters.agency')}</option>
          {AGENCIES.map((agency) => <option key={agency} value={agency}>{agency}</option>)}
        </select>
        <select className="form-input" value={filters.pilgrimType} onChange={(e) => updateFilter('pilgrimType', e.target.value)}>
          <option value="">{t('dashboard.filters.type')}</option>
          {PILGRIM_TYPES.map((type) => <option key={type} value={type}>{t(`bordereau.pilgrimTypes.${type}`)}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('bordereau.table.id')}</th>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('bordereau.table.amount')}</th>
              <th className="px-4 py-3">{t('bordereau.table.region')}</th>
              <th className="px-4 py-3">{t('bordereau.table.encadreur')}</th>
              <th className="px-4 py-3">{t('bordereau.table.date')}</th>
              <th className="px-4 py-3">{t('bordereau.table.priority')}</th>
              <th className="px-4 py-3">{t('visa.visaStatus')}</th>
              <th className="px-4 py-3">{t('bordereau.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
            {!loading && pageItems.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-mono text-xs">{b.id}</td>
                <td className="px-4 py-3">{b.pilgrimFirstName} {b.pilgrimLastName}</td>
                <td className="px-4 py-3">
                  {formatCurrency(b.amountPaid)}
                  {b.balance > 0 && <span className="block text-xs text-afriland-gray-600">/ {formatCurrency(b.targetAmount)}</span>}
                </td>
                <td className="px-4 py-3">{b.region}</td>
                <td className="px-4 py-3">{encadreurName(b.encadreurId)}</td>
                <td className="px-4 py-3">{formatDate(b.createdAt)}</td>
                <td className="px-4 py-3">{b.onlinePriority ? '⭐' : '—'}</td>
                <td className="px-4 py-3">
                  {canEditStatus ? (
                    <select
                      className="form-input !py-1 text-xs"
                      value={b.visaStatus}
                      onChange={(e) => handleStatusChange(b.id, e.target.value)}
                    >
                      {VISA_STATUSES.map((status) => (
                        <option key={status} value={status}>{t(`visa.statuses.${status}`)}</option>
                      ))}
                    </select>
                  ) : (
                    <VisaStatusBadge status={b.visaStatus} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <button type="button" className="text-xs font-semibold text-afriland-red hover:underline" onClick={() => generateBordereauReceipt(b)}>
                    {t('common.download')}
                  </button>
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
