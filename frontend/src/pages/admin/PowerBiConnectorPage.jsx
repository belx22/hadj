import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBordereaux } from '../../api/bordereauApi';
import { getEncadreurs } from '../../api/referenceDataApi';
import { exportToExcel } from '../../utils/excel';
import StatCard from '../../components/ui/StatCard';
import { formatCurrency } from '../../utils/formatters';

export default function PowerBiConnectorPage() {
  const { t } = useTranslation();
  const [bordereaux, setBordereaux] = useState([]);
  const [encadreurs, setEncadreurs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBordereaux({}), getEncadreurs({ onlyActive: false })]).then(([b, e]) => {
      setBordereaux(b);
      setEncadreurs(e);
      setLoading(false);
    });
  }, []);

  const encadreurName = useMemo(() => {
    const map = new Map(encadreurs.map((enc) => [enc.id, enc.name]));
    return (id) => map.get(id) || id;
  }, [encadreurs]);

  const versementRows = useMemo(() => {
    const rows = [];
    bordereaux.forEach((b) => {
      b.versements.forEach((v) => {
        rows.push({
          BordereauId: b.id,
          Pelerin: `${b.pilgrimFirstName} ${b.pilgrimLastName}`,
          Passeport: b.idNumber,
          Region: b.region,
          Agence: b.agency || '',
          Encadreur: encadreurName(b.encadreurId),
          TypePelerin: b.pilgrimType,
          Saison: b.season,
          StatutVisa: b.visaStatus,
          VersementId: v.id,
          Date: v.createdAt,
          Methode: v.method,
          Reference: v.reference,
          Montant: v.amount,
          StatutVersement: v.status,
          ValideLe: v.validatedAt || '',
          ValidePar: v.validatedBy || '',
        });
      });
    });
    return rows;
  }, [bordereaux, encadreurName]);

  const stats = useMemo(() => {
    const validated = versementRows.filter((r) => r.StatutVersement === 'VALIDE');
    const pending = versementRows.filter((r) => r.StatutVersement === 'PENDING');
    const rejected = versementRows.filter((r) => r.StatutVersement === 'REJETE');
    return {
      total: versementRows.length,
      validatedCount: validated.length,
      validatedAmount: validated.reduce((sum, r) => sum + r.Montant, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, r) => sum + r.Montant, 0),
      rejectedCount: rejected.length,
    };
  }, [versementRows]);

  function handleExport() {
    exportToExcel(versementRows, `powerbi-copilote-hadj-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Versements');
  }

  if (loading) return <p className="text-afriland-gray-600">{t('common.loading')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-afriland-black">{t('powerBi.title')}</h1>
        <p className="text-sm text-afriland-gray-600">{t('powerBi.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('powerBi.totalOperations')} value={stats.total} />
        <StatCard label={t('powerBi.validated')} value={`${stats.validatedCount} (${formatCurrency(stats.validatedAmount)})`} accent="text-visa-granted" />
        <StatCard label={t('powerBi.pending')} value={`${stats.pendingCount} (${formatCurrency(stats.pendingAmount)})`} accent="text-visa-pending" />
        <StatCard label={t('powerBi.rejected')} value={stats.rejectedCount} accent="text-visa-refused" />
      </div>

      <div className="card space-y-3">
        <p className="text-sm font-semibold text-afriland-black">{t('powerBi.exportTitle')}</p>
        <p className="text-sm text-afriland-gray-600">{t('powerBi.exportHelp')}</p>
        <button type="button" className="btn-primary" onClick={handleExport}>
          {t('powerBi.exportButton')}
        </button>
      </div>

      <div className="card space-y-2">
        <p className="text-sm font-semibold text-afriland-black">{t('powerBi.howToTitle')}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-afriland-gray-600">
          <li>{t('powerBi.step1')}</li>
          <li>{t('powerBi.step2')}</li>
          <li>{t('powerBi.step3')}</li>
        </ol>
        <p className="mt-2 text-xs text-afriland-gray-600">{t('powerBi.futureNote')}</p>
      </div>
    </div>
  );
}
