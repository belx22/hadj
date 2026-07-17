import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getEncadreurCommissions, getSeasons } from '../../api/referenceDataApi';
import StatCard from '../../components/ui/StatCard';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { formatCurrency } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excel';
import { generateListPdf } from '../../utils/pdf';
import { CURRENT_SEASON } from '../../utils/constants';

export default function EncadreurCommissionsPage() {
  const { t } = useTranslation();
  const [season, setSeason] = useState(CURRENT_SEASON);
  const [seasons, setSeasons] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(rows);

  useEffect(() => {
    getSeasons().then((data) => setSeasons([...data].sort((a, b) => b.season - a.season))).catch(() => setSeasons([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    getEncadreurCommissions(season)
      .then((data) => setRows(data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [season]);

  const totalPaid = rows.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalPlaces = rows.reduce((sum, r) => sum + r.placesAcquired, 0);
  const totalCommissionDue = rows.reduce((sum, r) => sum + r.totalCommissionDue, 0);

  // Source unique pour les deux exports : on exporte toutes les lignes de la
  // saison, pas seulement la page affichée.
  function buildExportRows() {
    return rows.map((r) => ({
      Encadreur: r.encadreurName,
      Code: r.encadreurCode,
      MontantVerse: r.totalPaid,
      PrixOfficielHorsCommission: r.officialPrice,
      PlacesAcquises: r.placesAcquired,
      Reliquat: r.reliquat,
      MontantPourPlaceSupplementaire: r.amountNeededForNextPlace,
      CommissionParPelerin: r.commissionPerPilgrim,
      CommissionTotaleDue: r.totalCommissionDue,
    }));
  }

  function handleExportExcel() {
    exportToExcel(buildExportRows(), `commissions-encadreurs-${season}.xlsx`, 'Commissions');
  }

  function handleExportPdf() {
    const exportRows = buildExportRows();
    generateListPdf({
      title: t('adminCommissions.title'),
      subtitle: `${t('bordereau.season')} ${season}`,
      columns: Object.keys(exportRows[0] || { Encadreur: '' }),
      rows: exportRows.map((row) => Object.values(row)),
      filename: `commissions-encadreurs-${season}.pdf`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-afriland-black">{t('adminCommissions.title')}</h1>
          <p className="text-sm text-afriland-gray-600">{t('adminCommissions.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <select className="form-input" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
            {seasons.map((s) => (
              <option key={s.season} value={s.season}>{s.season}</option>
            ))}
          </select>
          <button type="button" className="btn-secondary" onClick={handleExportExcel}>{t('common.exportExcel')}</button>
          <button type="button" className="btn-secondary" onClick={handleExportPdf}>{t('common.exportPdf')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('adminCommissions.totalPaid')} value={formatCurrency(totalPaid)} accent="text-afriland-red" />
        <StatCard label={t('adminCommissions.totalPlaces')} value={totalPlaces} />
        <StatCard label={t('adminCommissions.totalCommissionDue')} value={formatCurrency(totalCommissionDue)} accent="text-visa-granted" />
      </div>

      <div className="card overflow-x-auto">
        <p className="mb-1 text-sm font-semibold text-afriland-black">{t('adminCommissions.tableTitle')}</p>
        <p className="mb-3 text-xs text-afriland-gray-600">{t('adminCommissions.formula')}</p>
        {loading ? (
          <p className="text-afriland-gray-600">{t('common.loading')}</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase text-afriland-gray-600">
              <tr>
                <th className="py-2">{t('bordereau.encadreur')}</th>
                <th className="py-2 text-right">{t('adminCommissions.totalPaidCol')}</th>
                <th className="py-2 text-right">{t('adminCommissions.placesAcquired')}</th>
                <th className="py-2 text-right">{t('adminCommissions.reliquat')}</th>
                <th className="py-2 text-right">{t('adminCommissions.amountNeeded')}</th>
                <th className="py-2 text-right">{t('adminCommissions.commissionDue')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-afriland-gray-200">
              {pageItems.map((r) => (
                <tr key={r.encadreurId}>
                  <td className="py-2">
                    <p className="font-medium text-afriland-black">{r.encadreurName}</p>
                    <p className="text-xs text-afriland-gray-600">{r.encadreurCode}</p>
                  </td>
                  <td className="py-2 text-right">{formatCurrency(r.totalPaid)}</td>
                  <td className="py-2 text-right font-semibold text-afriland-black">{r.placesAcquired}</td>
                  <td className="py-2 text-right">
                    {r.reliquat > 0 ? (
                      <span className="text-visa-granted">{formatCurrency(r.reliquat)}</span>
                    ) : (
                      <span className="text-afriland-gray-600">—</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {r.amountNeededForNextPlace > 0 ? (
                      <span className="text-visa-complement">{formatCurrency(r.amountNeededForNextPlace)}</span>
                    ) : (
                      <span className="text-afriland-gray-600">—</span>
                    )}
                  </td>
                  <td className="py-2 text-right font-semibold text-afriland-black">{formatCurrency(r.totalCommissionDue)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
              )}
            </tbody>
          </table>
        )}
        {!loading && rows.length > 0 && (
          <div className="-mx-5 -mb-5 mt-3">
            <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
