import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getBordereaux, getEncadreurs } from '../../api/bordereauApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excel';
import { generateBordereauReceipt } from '../../utils/pdf';
import { AGENCIES, PILGRIM_TYPES, REGIONS } from '../../utils/constants';

export default function BordereauListPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [encadreurs, setEncadreurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ region: '', encadreurId: '', agency: '', pilgrimType: '' });

  useEffect(() => {
    getEncadreurs().then(setEncadreurs);
  }, []);

  useEffect(() => {
    setLoading(true);
    getBordereaux(filters).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [filters]);

  const encadreurName = useMemo(() => {
    const map = new Map(encadreurs.map((enc) => [enc.id, enc.name]));
    return (id) => map.get(id) || id;
  }, [encadreurs]);

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  function handleExportExcel() {
    exportToExcel(
      items.map((b) => ({
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
      })),
      'bordereaux.xlsx',
      'Bordereaux'
    );
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
              <th className="px-4 py-3">{t('bordereau.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
            {!loading && items.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-mono text-xs">{b.id}</td>
                <td className="px-4 py-3">{b.pilgrimFirstName} {b.pilgrimLastName}</td>
                <td className="px-4 py-3">{formatCurrency(b.amountPaid)}</td>
                <td className="px-4 py-3">{b.region}</td>
                <td className="px-4 py-3">{encadreurName(b.encadreurId)}</td>
                <td className="px-4 py-3">{formatDate(b.createdAt)}</td>
                <td className="px-4 py-3">{b.onlinePriority ? '⭐' : '—'}</td>
                <td className="px-4 py-3">
                  <button type="button" className="text-xs font-semibold text-afriland-red hover:underline" onClick={() => generateBordereauReceipt(b)}>
                    {t('common.download')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
