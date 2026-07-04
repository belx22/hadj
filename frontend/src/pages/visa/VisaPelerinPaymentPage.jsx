import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { usePilgrim } from '../../context/PilgrimContext';
import { createVersementOnline } from '../../api/visaApi';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import StatCard from '../../components/ui/StatCard';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AGENCIES, VERSEMENT_METHODS, VERSEMENT_STATUS_COLORS } from '../../utils/constants';

const EMPTY_FORM = { method: 'MOBILE_MONEY_ORANGE', amount: '', reference: '', agency: '' };

export default function VisaPelerinPaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dossier, login, logout } = usePilgrim();

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!dossier) {
    return <Navigate to="/visa/pelerin" replace />;
  }

  const remaining = dossier.balance - dossier.pendingAmount;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  function handleLogout() {
    logout();
    navigate('/visa/pelerin');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError(t('paymentPage.errors.amountRequired'));
      return;
    }
    if (amount > remaining) {
      setError(t('paymentPage.errors.amountTooHigh'));
      return;
    }
    if (form.method === 'AGENCE' && (!form.agency || !form.reference.trim())) {
      setError(t('paymentPage.errors.agencyRefRequired'));
      return;
    }
    if (form.method !== 'AGENCE' && !form.reference.trim()) {
      setError(t('paymentPage.errors.mobileRefRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await createVersementOnline(dossier.idNumber, dossier.phone, {
        method: form.method,
        amount,
        reference: form.reference.trim(),
        agency: form.method === 'AGENCE' ? form.agency : null,
      });
      await login(dossier.idNumber, dossier.phone);
      setForm(EMPTY_FORM);
      setSuccess(true);
    } catch {
      setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell-bg flex min-h-screen flex-col">
      <Header>
        <button type="button" onClick={handleLogout} className="btn-secondary !py-1.5 !px-3 text-xs">
          {t('common.logout')}
        </button>
      </Header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-afriland-black">{t('paymentPage.title')}</h1>
            <p className="text-sm text-afriland-gray-600">
              {dossier.pilgrimFirstName} {dossier.pilgrimLastName} — {dossier.idNumber}
            </p>
          </div>
          <Link to="/visa/pelerin/dossier" className="text-sm font-semibold text-afriland-red hover:underline">
            {t('paymentPage.backToDossier')}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t('paymentPage.target')} value={formatCurrency(dossier.targetAmount)} />
          <StatCard label={t('paymentPage.validated')} value={formatCurrency(dossier.amountPaid)} accent="text-visa-granted" />
          <StatCard label={t('paymentPage.pending')} value={formatCurrency(dossier.pendingAmount)} accent="text-visa-pending" />
          <StatCard label={t('paymentPage.remaining')} value={formatCurrency(Math.max(remaining, 0))} accent="text-afriland-red" />
        </div>

        {success && (
          <div className="card border-visa-pending/40 bg-visa-pending/5">
            <p className="text-sm font-semibold text-yellow-800">{t('paymentPage.pendingNotice')}</p>
          </div>
        )}

        {remaining <= 0 ? (
          <div className="card border-visa-granted/30 bg-visa-granted/5">
            <p className="text-sm font-semibold text-visa-granted">{t('paymentPage.complete')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <p className="text-sm font-semibold text-afriland-black">{t('paymentPage.newPayment')}</p>

            <div>
              <label className="form-label">{t('paymentPage.method')}</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {VERSEMENT_METHODS.map((method) => (
                  <button
                    type="button"
                    key={method}
                    onClick={() => update('method', method)}
                    className={clsx(
                      'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                      form.method === method
                        ? 'border-afriland-red bg-afriland-red/10 text-afriland-red'
                        : 'border-afriland-gray-400 text-afriland-gray-600'
                    )}
                  >
                    {t(`paymentPage.methods.${method}`)}
                  </button>
                ))}
              </div>
            </div>

            {form.method === 'AGENCE' && (
              <div>
                <label className="form-label">{t('bordereau.agency')}</label>
                <select className="form-input" value={form.agency} onChange={(e) => update('agency', e.target.value)}>
                  <option value="">{t('common.all')}</option>
                  {AGENCIES.map((agency) => (
                    <option key={agency} value={agency}>{agency}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="form-label">
                {form.method === 'AGENCE' ? t('paymentPage.agencyReference') : t('paymentPage.mobileReference')}
              </label>
              <input className="form-input" value={form.reference} onChange={(e) => update('reference', e.target.value)} />
            </div>

            <div>
              <label className="form-label">{t('paymentPage.amount')}</label>
              <input
                type="number"
                min="1"
                max={remaining}
                className="form-input"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
              />
              <p className="mt-1 text-xs text-afriland-gray-600">{t('paymentPage.maxAmount', { amount: formatCurrency(remaining) })}</p>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? t('common.loading') : t('paymentPage.submit')}
            </button>
          </form>
        )}

        <div className="card">
          <p className="mb-3 text-sm font-semibold text-afriland-black">{t('visa.paymentHistory')}</p>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-afriland-gray-600">
              <tr>
                <th className="py-2">{t('bordereau.date')}</th>
                <th className="py-2">{t('paymentPage.method')}</th>
                <th className="py-2">{t('paymentPage.reference')}</th>
                <th className="py-2 text-right">{t('bordereau.amountPaid')}</th>
                <th className="py-2 text-right">{t('paymentPage.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-afriland-gray-200">
              {dossier.versements.map((v) => {
                const colors = VERSEMENT_STATUS_COLORS[v.status];
                return (
                  <tr key={v.id}>
                    <td className="py-2">{formatDate(v.createdAt)}</td>
                    <td className="py-2">{t(`paymentPage.methods.${v.method}`)}</td>
                    <td className="py-2 font-mono text-xs">{v.reference}</td>
                    <td className="py-2 text-right">{formatCurrency(v.amount)}</td>
                    <td className="py-2 text-right">
                      <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', colors.bg, colors.text)}>
                        <span className={clsx('h-1.5 w-1.5 rounded-full', colors.dot)} />
                        {t(`paymentPage.statuses.${v.status}`)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {dossier.versements.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}
