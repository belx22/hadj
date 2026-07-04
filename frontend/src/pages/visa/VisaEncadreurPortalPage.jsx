import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getEncadreurGroup } from '../../api/visaApi';
import StatCard from '../../components/ui/StatCard';
import VisaStatusBadge from '../../components/ui/VisaStatusBadge';
import { formatCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excel';
import { generateReportingPdf } from '../../utils/pdf';
import { CURRENT_SEASON } from '../../utils/constants';

export default function VisaEncadreurPortalPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [group, setGroup] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEncadreurGroup(user.encadreurId).then((groupData) => {
      setGroup(groupData);
      setLoading(false);
    });
  }, [user.encadreurId]);

  const stats = useMemo(() => {
    const collected = group.reduce((sum, b) => sum + b.amountPaid, 0);
    const target = group.reduce((sum, b) => sum + b.targetAmount, 0);
    const eligible = group.reduce((sum, b) => sum + b.eligiblePilgrims, 0);
    const incomplete = group.filter((b) => !b.isComplete).length;
    return { collected, target, eligible, incomplete };
  }, [group]);

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

  if (loading) return <p className="text-afriland-gray-600">{t('common.loading')}</p>;

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

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('visa.idNumber')}</th>
              <th className="px-4 py-3">{t('bordereau.table.amount')}</th>
              <th className="px-4 py-3">{t('visa.visaStatus')}</th>
              <th className="px-4 py-3">{t('visa.eligibility')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {group.map((b) => (
              <tr key={b.id}>
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
      </div>
    </div>
  );
}
