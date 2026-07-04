import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getPendingVersements, validateVersement, rejectVersement } from '../../api/paymentsApi';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PaymentValidationPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-afriland-black">{t('paymentValidation.title')}</h1>
        <p className="text-sm text-afriland-gray-600">{t('paymentValidation.subtitle')}</p>
      </div>

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
