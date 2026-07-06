import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { usePilgrim } from '../../context/PilgrimContext';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import VisaStatusBadge from '../../components/ui/VisaStatusBadge';
import VisaJourneyStepper from '../../components/ui/VisaJourneyStepper';
import StatCard from '../../components/ui/StatCard';
import PaymentCodeCard from '../../components/ui/PaymentCodeCard';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generatePilgrimAttestation } from '../../utils/pdf';
import { VERSEMENT_STATUS_COLORS } from '../../utils/constants';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';

export default function VisaPelerinDossierPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dossier, logout } = usePilgrim();
  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(dossier?.versements || []);

  useEffect(() => {
    document.title = 'Copilote Hadj — ' + t('visa.myFile');
  }, [t]);

  if (!dossier) {
    return <Navigate to="/visa/pelerin" replace />;
  }

  function handleLogout() {
    logout();
    navigate('/visa/pelerin');
  }

  return (
    <div className="app-shell-bg flex min-h-screen flex-col">
      <Header>
        <button type="button" onClick={handleLogout} className="btn-secondary !py-1.5 !px-3 text-xs">
          {t('common.logout')}
        </button>
      </Header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-afriland-black">{t('visa.myFile')}</h1>
            <p className="text-sm text-afriland-gray-600">
              {dossier.pilgrimFirstName} {dossier.pilgrimLastName} — {dossier.idNumber}
            </p>
          </div>
          <VisaStatusBadge status={dossier.visaStatus} />
        </div>

        <div className="card">
          <p className="mb-4 text-sm font-semibold text-afriland-black">{t('visa.journeyTitle')}</p>
          <VisaJourneyStepper status={dossier.visaStatus} statusHistory={dossier.statusHistory} />
        </div>

        <PaymentCodeCard code={dossier.id} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t('paymentPage.target')} value={formatCurrency(dossier.targetAmount)} />
          <StatCard label={t('visa.totalPaid')} value={formatCurrency(dossier.amountPaid)} accent="text-afriland-red" />
          <StatCard label={t('visa.balance')} value={formatCurrency(Math.max(dossier.balance, 0))} />
          <StatCard
            label={t('visa.eligibility')}
            value={dossier.isEligible ? t('visa.eligible') : t('visa.notEligible')}
            accent={dossier.isEligible ? 'text-visa-granted' : 'text-visa-refused'}
          />
        </div>

        {dossier.balance > 0 && (
          <div className="card flex flex-wrap items-center justify-between gap-3 border-afriland-red/20 bg-afriland-red/5">
            <p className="text-sm font-medium text-afriland-black">{t('paymentPage.incompleteNotice')}</p>
            <Link to="/visa/pelerin/paiement" className="btn-primary">{t('paymentPage.makePayment')}</Link>
          </div>
        )}

        <div className="card">
          <p className="mb-3 text-sm font-semibold text-afriland-black">{t('visa.paymentHistory')}</p>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-afriland-gray-600">
              <tr>
                <th className="py-2">{t('bordereau.date')}</th>
                <th className="py-2">{t('paymentPage.reference')}</th>
                <th className="py-2 text-right">{t('bordereau.amountPaid')}</th>
                <th className="py-2 text-right">{t('paymentPage.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-afriland-gray-200">
              {pageItems.map((v) => {
                const colors = VERSEMENT_STATUS_COLORS[v.status];
                return (
                  <tr key={v.id}>
                    <td className="py-2">{formatDate(v.createdAt)}</td>
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
                <tr><td colSpan={4} className="py-4 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
              )}
            </tbody>
          </table>
          <div className="-mx-5 -mb-5 mt-3">
            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>

        <div className="card">
          <p className="mb-3 text-sm font-semibold text-afriland-black">{t('visa.notifications')}</p>
          <ul className="space-y-2">
            {[...dossier.notifications].reverse().map((n, index) => (
              <li key={index} className="rounded-md bg-afriland-gray-50 px-3 py-2 text-sm">
                <span className="mr-2 text-xs font-medium text-afriland-gray-600">{formatDate(n.date)}</span>
                {n.message}
              </li>
            ))}
            {dossier.notifications.length === 0 && (
              <li className="text-sm text-afriland-gray-600">{t('common.noData')}</li>
            )}
          </ul>
        </div>

        <button type="button" className="btn-primary" onClick={() => generatePilgrimAttestation(dossier)}>
          {t('visa.downloadAttestation')}
        </button>
      </main>

      <Footer />
    </div>
  );
}
