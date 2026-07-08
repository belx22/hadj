import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getPassportDeposits, togglePassportDeposit } from '../../api/attestationsApi';
import { getSeasons } from '../../api/referenceDataApi';
import StatCard from '../../components/ui/StatCard';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { generatePassportDepositCertificate } from '../../utils/pdf';
import { CURRENT_SEASON } from '../../utils/constants';

export default function PassportAttestationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [season, setSeason] = useState(CURRENT_SEASON);
  const [seasons, setSeasons] = useState([]);
  const [data, setData] = useState({ items: [], totalPilgrims: 0, depositedPilgrims: 0, remainingPilgrims: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(data.items);

  useEffect(() => {
    getSeasons().then((s) => setSeasons([...s].sort((a, b) => b.season - a.season)));
  }, []);

  function reload() {
    setLoading(true);
    getPassportDeposits(season).then((result) => {
      setData(result);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  async function handleToggle(row) {
    setBusyId(row.bordereauId);
    try {
      await togglePassportDeposit(row.bordereauId, !row.passportDeposited, user);
      toast.success(row.passportDeposited ? t('attestations.cancelledToast') : t('attestations.depositedToast'));
      reload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-afriland-black">{t('attestations.title')}</h1>
          <p className="text-sm text-afriland-gray-600">{t('attestations.subtitle')}</p>
        </div>
        <select className="form-input" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
          {seasons.map((s) => (
            <option key={s.season} value={s.season}>{s.season}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('attestations.totalPilgrims')} value={data.totalPilgrims} />
        <StatCard label={t('attestations.deposited')} value={data.depositedPilgrims} accent="text-visa-granted" />
        <StatCard label={t('attestations.remaining')} value={data.remainingPilgrims} accent="text-visa-complement" />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('bordereau.table.pilgrim')}</th>
              <th className="px-4 py-3">{t('bordereau.table.encadreur')}</th>
              <th className="px-4 py-3 text-right">{t('bordereau.pilgrimCount')}</th>
              <th className="px-4 py-3">{t('attestations.status')}</th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.loading')}</td></tr>
            )}
            {!loading && data.items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
            {!loading && pageItems.map((row) => (
              <tr key={row.bordereauId}>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.pilgrimName}</p>
                  <p className="text-xs text-afriland-gray-600">{row.idNumber}</p>
                </td>
                <td className="px-4 py-3">{row.encadreurName || '—'}</td>
                <td className="px-4 py-3 text-right">{row.pilgrimCount}</td>
                <td className="px-4 py-3">
                  {row.passportDeposited ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-visa-granted/15 px-2.5 py-1 text-xs font-semibold text-green-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-visa-granted" />
                      {t('attestations.depositedOn', { date: row.passportDepositedAt })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-visa-complement/15 px-2.5 py-1 text-xs font-semibold text-orange-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-visa-complement" />
                      {t('attestations.notDeposited')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                      disabled={busyId === row.bordereauId}
                      onClick={() => handleToggle(row)}
                    >
                      {row.passportDeposited ? t('attestations.cancelDeposit') : t('attestations.markDeposited')}
                    </button>
                    {row.passportDeposited && (
                      <button
                        type="button"
                        className="btn-primary !px-3 !py-1.5 text-xs"
                        onClick={() => generatePassportDepositCertificate(row)}
                      >
                        {t('attestations.download')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  );
}
