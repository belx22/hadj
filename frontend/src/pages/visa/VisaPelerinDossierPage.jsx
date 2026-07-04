import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePilgrim } from '../../context/PilgrimContext';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import VisaStatusBadge from '../../components/ui/VisaStatusBadge';
import StatCard from '../../components/ui/StatCard';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generatePilgrimAttestation } from '../../utils/pdf';

export default function VisaPelerinDossierPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dossier, logout } = usePilgrim();

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

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label={t('visa.totalPaid')} value={formatCurrency(dossier.amountPaid)} accent="text-afriland-red" />
          <StatCard label={t('visa.balance')} value={formatCurrency(dossier.balance)} />
          <StatCard
            label={t('visa.eligibility')}
            value={dossier.isEligible ? t('visa.eligible') : t('visa.notEligible')}
            accent={dossier.isEligible ? 'text-visa-granted' : 'text-visa-refused'}
          />
        </div>

        <div className="card">
          <p className="mb-3 text-sm font-semibold text-afriland-black">{t('visa.paymentHistory')}</p>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-afriland-gray-600">
              <tr>
                <th className="py-2">{t('bordereau.date')}</th>
                <th className="py-2">{t('bordereau.receiptNumber')}</th>
                <th className="py-2 text-right">{t('bordereau.amountPaid')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-afriland-gray-200">
              {dossier.versements.map((v) => (
                <tr key={v.receiptNumber}>
                  <td className="py-2">{formatDate(v.date)}</td>
                  <td className="py-2 font-mono text-xs">{v.receiptNumber}</td>
                  <td className="py-2 text-right">{formatCurrency(v.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" className="btn-primary" onClick={() => generatePilgrimAttestation(dossier)}>
          {t('visa.downloadAttestation')}
        </button>
      </main>

      <Footer />
    </div>
  );
}
