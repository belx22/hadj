import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { useToast } from '../../context/ToastContext';
import { getPassportDeposits, togglePassportDeposit, importPassportDeposits } from '../../api/attestationsApi';
import { getSeasons, getEncadreurs } from '../../api/referenceDataApi';
import StatCard from '../../components/ui/StatCard';
import Pagination from '../../components/ui/Pagination';
import usePagination from '../../hooks/usePagination';
import { exportTemplateToExcel } from '../../utils/excel';
import { buildPassportDepositTemplateRows } from '../../utils/importTemplates';
import { generatePassportDepositCertificate, generateGroupPassportDepositCertificate } from '../../utils/pdf';
import { CURRENT_SEASON } from '../../utils/constants';

const DEPOSIT_CHOICES = ['OUI', 'NON'];

export default function PassportAttestationsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [season, setSeason] = useState(CURRENT_SEASON);
  const [seasons, setSeasons] = useState([]);
  const [encadreurs, setEncadreurs] = useState([]);
  const [encadreurFilter, setEncadreurFilter] = useState('');
  const [data, setData] = useState({ items: [], totalPilgrims: 0, depositedPilgrims: 0, remainingPilgrims: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

  // Situation filtrable par encadreur : les totaux (total / déposés / restants)
  // sont recalculés sur la sélection → donne le « reste à déposer » par groupe.
  const filteredItems = useMemo(
    () => (encadreurFilter ? data.items.filter((i) => i.encadreurId === encadreurFilter) : data.items),
    [data.items, encadreurFilter]
  );
  const stats = useMemo(() => {
    const total = filteredItems.reduce((sum, i) => sum + i.pilgrimCount, 0);
    const deposited = filteredItems.filter((i) => i.passportDeposited).reduce((sum, i) => sum + i.pilgrimCount, 0);
    return { total, deposited, remaining: Math.max(total - deposited, 0) };
  }, [filteredItems]);

  // Récapitulatif par encadreur : total / déposés / restants pour chaque groupe.
  const byEncadreur = useMemo(() => {
    const map = new Map();
    data.items.forEach((i) => {
      const key = i.encadreurId || '—';
      const row = map.get(key) || { encadreurId: i.encadreurId, encadreurName: i.encadreurName || '—', total: 0, deposited: 0 };
      row.total += i.pilgrimCount;
      if (i.passportDeposited) row.deposited += i.pilgrimCount;
      map.set(key, row);
    });
    return [...map.values()]
      .map((r) => ({ ...r, remaining: Math.max(r.total - r.deposited, 0) }))
      .sort((a, b) => b.remaining - a.remaining);
  }, [data.items]);

  const depositedInSelection = useMemo(() => filteredItems.filter((i) => i.passportDeposited), [filteredItems]);

  const { page, setPage, totalPages, totalItems, pageSize, pageItems } = usePagination(filteredItems);

  useEffect(() => {
    getSeasons().then((s) => setSeasons([...s].sort((a, b) => b.season - a.season))).catch(() => setSeasons([]));
    getEncadreurs({ onlyActive: false }).then(setEncadreurs).catch(() => setEncadreurs([]));
  }, []);

  function handleDownloadGroupCertificate() {
    if (depositedInSelection.length === 0) return;
    const enc = encadreurs.find((e) => e.id === encadreurFilter);
    generateGroupPassportDepositCertificate({
      encadreurName: enc?.name || t('attestations.allEncadreurs'),
      encadreurId: encadreurFilter || null,
      season,
      deposits: depositedInSelection.map((i) => ({
        pilgrimName: i.pilgrimName,
        idNumber: i.idNumber,
        phone: i.phone,
        pilgrimCount: i.pilgrimCount,
        passportDepositedAt: i.passportDepositedAt,
      })),
    });
  }

  function reload() {
    setLoading(true);
    getPassportDeposits(season)
      .then((result) => setData(result))
      .catch(() => setData({ items: [], totalPilgrims: 0, depositedPilgrims: 0, remainingPilgrims: 0 }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  async function handleToggle(row) {
    setBusyId(row.bordereauId);
    try {
      await togglePassportDeposit(row.bordereauId, !row.passportDeposited);
      toast.success(row.passportDeposited ? t('attestations.cancelledToast') : t('attestations.depositedToast'));
      reload();
    } finally {
      setBusyId(null);
    }
  }

  function handleDownloadTemplate() {
    // Pré-rempli avec les pèlerins de la saison et leur statut de dépôt actuel
    // (OUI/NON) : l'opérateur bascule seulement ce qui change puis réimporte.
    const rows = data.items.length
      ? buildPassportDepositTemplateRows(data.items)
      : [{ Pelerin: '', idNumber: '1002345678', deposited: 'OUI' }];
    exportTemplateToExcel(rows, 'modele-depots-passeports.xlsx', 'DepotsPasseports', { deposited: DEPOSIT_CHOICES });
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportSummary(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // On tolère les en-têtes usuels (FR/EN/AR) plutôt que d'imposer un nom exact.
      const rows = rawRows.map((row) => {
        const lower = Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]);
        const pick = (keys) => {
          const match = lower.find(([k]) => keys.includes(k));
          return match ? String(match[1] ?? '').trim() : '';
        };
        return {
          idNumber: pick(['idnumber', 'cni', 'passeport', 'cni / passeport', 'n° cni / passeport', 'رقم البطاقة']),
          deposited: pick(['deposited', 'depot', 'dépôt', 'depose', 'déposé', 'statut', 'الإيداع']),
        };
      });

      const summary = await importPassportDeposits(rows, season);
      setImportSummary(summary);
      if (summary.updated.length > 0) {
        toast.success(t('attestations.import.successToast', { count: summary.updated.length }));
        reload();
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-afriland-black">{t('attestations.title')}</h1>
          <p className="text-sm text-afriland-gray-600">{t('attestations.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="form-input"
            value={encadreurFilter}
            onChange={(e) => setEncadreurFilter(e.target.value)}
          >
            <option value="">{t('attestations.allEncadreurs')}</option>
            {encadreurs.map((enc) => <option key={enc.id} value={enc.id}>{enc.name}</option>)}
          </select>
          <select className="form-input" value={season} onChange={(e) => setSeason(Number(e.target.value))}>
            {seasons.map((s) => (
              <option key={s.season} value={s.season}>{s.season}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('attestations.totalPilgrims')} value={stats.total} />
        <StatCard label={t('attestations.deposited')} value={stats.deposited} accent="text-visa-granted" />
        <StatCard label={t('attestations.remaining')} value={stats.remaining} accent="text-visa-complement" />
      </div>

      {/* Attestation collective : couvre tous les passeports déposés de la
          sélection courante (un encadreur, ou tous). */}
      {depositedInSelection.length > 0 && (
        <button type="button" className="btn-primary" onClick={handleDownloadGroupCertificate}>
          {t('attestations.downloadGroupCertificate', { count: depositedInSelection.length })}
        </button>
      )}

      {/* Situation de dépôt par encadreur (tous les groupes). */}
      <div className="card overflow-x-auto p-0">
        <p className="px-4 pt-4 text-sm font-semibold text-afriland-black">{t('attestations.byEncadreurTitle')}</p>
        <table className="mt-2 w-full min-w-[520px] text-left text-sm">
          <thead className="bg-afriland-gray-50 text-xs uppercase text-afriland-gray-600">
            <tr>
              <th className="px-4 py-3">{t('bordereau.table.encadreur')}</th>
              <th className="px-4 py-3 text-right">{t('attestations.totalPilgrims')}</th>
              <th className="px-4 py-3 text-right">{t('attestations.deposited')}</th>
              <th className="px-4 py-3 text-right">{t('attestations.remaining')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-afriland-gray-200">
            {byEncadreur.map((r) => (
              <tr key={r.encadreurId || 'none'} className="cursor-pointer hover:bg-afriland-gray-50" onClick={() => setEncadreurFilter(r.encadreurId || '')}>
                <td className="px-4 py-3">{r.encadreurName}</td>
                <td className="px-4 py-3 text-right">{r.total}</td>
                <td className="px-4 py-3 text-right text-visa-granted">{r.deposited}</td>
                <td className={`px-4 py-3 text-right font-semibold ${r.remaining > 0 ? 'text-visa-complement' : 'text-visa-granted'}`}>{r.remaining}</td>
              </tr>
            ))}
            {byEncadreur.length === 0 && !loading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-afriland-gray-600">{t('common.noData')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card space-y-3">
        <div>
          <p className="text-sm font-semibold text-afriland-black">{t('attestations.import.title')}</p>
          <p className="text-xs text-afriland-gray-600">{t('attestations.import.help')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={handleDownloadTemplate}>
            {t('attestations.import.downloadTemplate')}
          </button>
          <button type="button" className="btn-primary" onClick={handleImportClick} disabled={importing}>
            {importing ? t('common.loading') : t('attestations.import.importFile')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {importSummary && (
          <div className="rounded-md bg-afriland-gray-50 p-3 text-sm">
            <p className="font-medium text-visa-granted">
              {t('attestations.import.updated', { count: importSummary.updated.length })}
            </p>
            {importSummary.notFound.length > 0 && (
              <p className="text-afriland-gray-600">
                {t('attestations.import.notFound', { count: importSummary.notFound.length })}
              </p>
            )}
            {importSummary.invalid.length > 0 && (
              <p className="text-visa-refused">
                {t('attestations.import.invalid', { count: importSummary.invalid.length })}
              </p>
            )}
          </div>
        )}
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
            {!loading && filteredItems.length === 0 && (
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
