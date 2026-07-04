import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { getPendingVersements, getVersementsHistory, validateVersement, rejectVersement } from '../../api/paymentsApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { VERSEMENT_STATUS_COLORS } from '../../utils/constants';

const TABS = ['pending', 'history'];

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

      {tab === 'pending' ? <PendingTab /> : <HistoryTab />}
    </div>
  );
}

function PendingTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  function reload() {
    setLoading(true);
    getPendingVersements().then((data) => {
      setRows(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleValidate(row) {
    setBusyId(row.id);
    setError(null);
    try {
      await validateVersement(row.bordereauId, row.id, user);
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

  async function handleReject(row) {
    const reason = window.prompt(t('paymentValidation.rejectPrompt'));
    if (reason === null) return;
    setBusyId(row.id);
    try {
      await rejectVersement(row.bordereauId, row.id, reason, user);
      reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="card border-visa-refused/30 bg-visa-refused/5">
          <p className="text-sm font-semibold text-visa-refused">{error}</p>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('paymentPage.method')}</th>
              <th className="px-4 py-3">{t('paymentPage.reference')}</th>
              <th className="px-4 py-3">{t('bordereau.agency')}</th>
              <th className="px-4 py-3 text-right">{t('bordereau.amountPaid')}</th>
              <th className="px-4 py-3">{t('bordereau.date')}</th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
            {!loading && rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.pilgrimName}</p>
                  <p className="text-xs text-afriland-gray-600">{row.idNumber}</p>
                </td>
                <td className="px-4 py-3">{t(`paymentPage.methods.${row.method}`)}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.reference}</td>
                <td className="px-4 py-3">{row.agency || '—'}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.amount)}</td>
                <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
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
      </div>
    </div>
  );
}

function HistoryTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });

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

  return (
    <div className="space-y-4">
      <div className="card grid grid-cols-2 gap-3 sm:grid-cols-4">
        <select className="form-input" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
          <option value="">{t('common.all')}</option>
          <option value="VALIDE">{t('paymentPage.statuses.VALIDE')}</option>
          <option value="REJETE">{t('paymentPage.statuses.REJETE')}</option>
        </select>
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
              <th className="px-4 py-3">{t('paymentPage.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
            {!loading && rows.map((row) => {
              const colors = VERSEMENT_STATUS_COLORS[row.status];
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.pilgrimName}</p>
                    <p className="text-xs text-afriland-gray-600">{row.idNumber}</p>
                  </td>
                  <td className="px-4 py-3">{t(`paymentPage.methods.${row.method}`)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.reference}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.amount)}</td>
                  <td className="px-4 py-3">{formatDate(row.validatedAt)}</td>
                  <td className="px-4 py-3">{row.validatedBy || '—'}</td>
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
      </div>
    </div>
  );
}
