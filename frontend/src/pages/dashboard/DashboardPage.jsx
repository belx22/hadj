import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getReporting } from '../../api/reportingApi';
import { getEncadreurs } from '../../api/referenceDataApi';
import { getGroupedPayments } from '../../api/visaApi';
import StatCard from '../../components/ui/StatCard';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excel';
import { generateReportingPdf } from '../../utils/pdf';
import { AGENCIES, PILGRIM_TYPES, REGIONS } from '../../utils/constants';

const CHART_COLORS = ['#C8102E', '#111111', '#9CA3AF', '#F5C518', '#2563EB', '#16A34A'];

const TABS = ['global', 'byEncadreur', 'byRegion', 'groupedPayments', 'closure'];

export default function DashboardPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ region: '', encadreurId: '', agency: '', pilgrimType: '', from: '', to: '' });
  const [reporting, setReporting] = useState(null);
  const [encadreurs, setEncadreurs] = useState([]);
  const [groupedPayments, setGroupedPayments] = useState([]);
  const [tab, setTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const groupedPage = usePagination(groupedPayments);

  useEffect(() => {
    getEncadreurs().then(setEncadreurs).catch(() => setEncadreurs([]));
    getGroupedPayments().then(setGroupedPayments).catch(() => setGroupedPayments([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    getReporting(filters)
      .then((data) => setReporting(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [filters]);

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  function resetFilters() {
    setFilters({ region: '', encadreurId: '', agency: '', pilgrimType: '', from: '', to: '' });
  }

  const progressData = useMemo(() => {
    if (!reporting) return [];
    const sorted = [...reporting.items].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    let cumulative = 0;
    return sorted.map((b) => {
      cumulative += b.amountPaid;
      return { date: b.createdAt, cumulative };
    });
  }, [reporting]);

  function handleExportExcel() {
    if (!reporting) return;
    exportToExcel(
      reporting.items.map((b) => ({
        Reference: b.reference,
        Pelerin: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
        Region: b.region,
        Encadreur: b.encadreurId,
        Montant: b.amountPaid,
        Date: b.createdAt,
        StatutVisa: b.visaStatus,
      })),
      `reporting-hadj-${reporting.season}.xlsx`,
      'Reporting'
    );
  }

  if (loading) {
    return <p className="text-afriland-gray-600">{t('common.loading')}</p>;
  }
  if (loadError || !reporting) {
    return <p className="text-visa-refused">{t('common.error')}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-afriland-black">{t('dashboard.title')}</h1>
          <p className="text-sm text-afriland-gray-600">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={handleExportExcel}>{t('common.exportExcel')}</button>
          <button type="button" className="btn-primary" onClick={() => generateReportingPdf(reporting)}>{t('common.exportPdf')}</button>
        </div>
      </div>

      <div className="card grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <select className="form-input" value={filters.region} onChange={(e) => updateFilter('region', e.target.value)}>
          <option value="">{t('dashboard.filters.region')}</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="form-input" value={filters.encadreurId} onChange={(e) => updateFilter('encadreurId', e.target.value)}>
          <option value="">{t('dashboard.filters.encadreur')}</option>
          {encadreurs.map((enc) => <option key={enc.id} value={enc.id}>{enc.name}</option>)}
        </select>
        <select className="form-input" value={filters.agency} onChange={(e) => updateFilter('agency', e.target.value)}>
          <option value="">{t('dashboard.filters.agency')}</option>
          {AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="form-input" value={filters.pilgrimType} onChange={(e) => updateFilter('pilgrimType', e.target.value)}>
          <option value="">{t('dashboard.filters.type')}</option>
          {PILGRIM_TYPES.map((type) => <option key={type} value={type}>{t(`bordereau.pilgrimTypes.${type}`)}</option>)}
        </select>
        <input type="date" className="form-input" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
        <input type="date" className="form-input" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
        <button type="button" className="btn-secondary col-span-2 sm:col-span-4 lg:col-span-1" onClick={resetFilters}>
          {t('dashboard.filters.reset')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={t('dashboard.kpis.totalCollected')} value={formatCurrency(reporting.totalCollected)} accent="text-afriland-red" />
        <StatCard label={t('dashboard.kpis.totalPilgrims')} value={reporting.totalPilgrims} />
        <StatCard label={t('dashboard.kpis.eligiblePilgrims')} value={reporting.eligiblePilgrims} accent="text-visa-granted" />
        <StatCard label={t('dashboard.kpis.bordereauxCount')} value={reporting.bordereauxCount} />
        <StatCard label={t('dashboard.kpis.avgAmount')} value={formatCurrency(reporting.avgAmount)} />
      </div>

      {reporting.insufficientBalanceCount > 0 && (
        <div className="card border-visa-complement/40 bg-visa-complement/5">
          <p className="text-sm font-semibold text-visa-complement">
            {t('dashboard.insufficientBalanceAlert', { count: reporting.insufficientBalanceCount })}
          </p>
        </div>
      )}

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
            {t(`dashboard.tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'global' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card">
            <p className="mb-3 text-sm font-semibold text-afriland-black">{t('dashboard.charts.collectionProgress')}</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="cumulative" stroke="#C8102E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <p className="mb-3 text-sm font-semibold text-afriland-black">{t('dashboard.charts.byType')}</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={reporting.byType} dataKey="count" nameKey="type" outerRadius={90} label>
                  {reporting.byType.map((entry, index) => (
                    <Cell key={entry.type} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card lg:col-span-2">
            <p className="mb-3 text-sm font-semibold text-afriland-black">{t('dashboard.charts.seasonComparison')}</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reporting.seasonComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="season" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="collected" fill="#111111" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'byEncadreur' && (
        <div className="card">
          <p className="mb-3 text-sm font-semibold text-afriland-black">{t('dashboard.charts.byEncadreur')}</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reporting.byEncadreur} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="encadreurName" tick={{ fontSize: 11 }} width={140} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="collected" fill="#C8102E" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'byRegion' && (
        <div className="card">
          <p className="mb-3 text-sm font-semibold text-afriland-black">{t('dashboard.charts.geoDistribution')}</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reporting.byRegion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="region" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="collected" fill="#111111" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'groupedPayments' && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-afriland-black">{t('dashboard.groupedPayments.title')}</p>
          <p className="text-xs text-afriland-gray-600">{t('dashboard.groupedPayments.subtitle')}</p>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-afriland-gray-600">
              <tr>
                <th className="py-2">{t('bordereau.date')}</th>
                <th className="py-2">{t('dashboard.groupedPayments.payer')}</th>
                <th className="py-2 text-right">{t('common.total')}</th>
                <th className="py-2">{t('dashboard.groupedPayments.beneficiaries')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-afriland-gray-200">
              {groupedPage.pageItems.map((g) => (
                <tr key={g.groupPaymentId}>
                  <td className="py-2 align-top">{formatDate(g.createdAt)}</td>
                  <td className="py-2 align-top">{g.payerName} ({g.payerIdNumber})</td>
                  <td className="py-2 text-right align-top">{formatCurrency(g.totalAmount)}</td>
                  <td className="py-2">
                    <ul className="space-y-1">
                      {g.beneficiaries.map((b) => (
                        <li key={b.idNumber} className="text-xs text-afriland-gray-700">
                          {b.name} ({b.idNumber}) — {formatCurrency(b.amount)} — {t('bordereau.encadreur')}:{' '}
                          {b.encadreurCode || '—'}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
              {groupedPayments.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={groupedPage.page} totalPages={groupedPage.totalPages} totalItems={groupedPage.totalItems} pageSize={groupedPage.pageSize} onPageChange={groupedPage.setPage} />
        </div>
      )}

      {tab === 'closure' && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-afriland-black">{t('dashboard.closureReport')}</p>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-afriland-gray-200">
              <Row label={t('dashboard.kpis.totalCollected')} value={formatCurrency(reporting.totalCollected)} />
              <Row label={t('dashboard.kpis.totalPilgrims')} value={reporting.totalPilgrims} />
              <Row label={t('dashboard.kpis.eligiblePilgrims')} value={reporting.eligiblePilgrims} />
              <Row label={t('dashboard.eligibleFormula')} value="" />
              <Row label={t('dashboard.insufficientBalance')} value={reporting.insufficientBalanceCount} />
              <Row label={t('dashboard.kpis.bordereauxCount')} value={reporting.bordereauxCount} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <td className="py-2 text-afriland-gray-600">{label}</td>
      <td className="py-2 text-right font-semibold text-afriland-black">{value}</td>
    </tr>
  );
}
