import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getSeasons, createSeason, updateSeason } from '../../api/referenceDataApi';
import { formatCurrency } from '../../utils/formatters';
import { CURRENT_SEASON, DEFAULT_OFFICIAL_PRICE, MONTHS, PILGRIM_TYPES } from '../../utils/constants';

const EMPTY_PRICES = PILGRIM_TYPES.reduce((acc, type) => ({ ...acc, [type]: DEFAULT_OFFICIAL_PRICE }), {});
const EMPTY_FORM = {
  season: CURRENT_SEASON + 1,
  month: 6,
  prices: { ...EMPTY_PRICES },
  officialPriceExcludingCommission: DEFAULT_OFFICIAL_PRICE,
  commissionPerPilgrim: 0,
};

export default function SeasonsAdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [editingSeason, setEditingSeason] = useState(null);
  const [editValues, setEditValues] = useState({});

  function reload() {
    setLoading(true);
    getSeasons()
      .then((data) => setSeasons([...data].sort((a, b) => b.season - a.season)))
      .catch(() => setSeasons([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createSeason({
        season: Number(form.season),
        month: Number(form.month),
        year: Number(form.season),
        isOpen: true,
        prices: form.prices,
        officialPriceExcludingCommission: Number(form.officialPriceExcludingCommission),
        commissionPerPilgrim: Number(form.commissionPerPilgrim),
      });
      toast.success(t('toasts.seasonCreated'));
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      if (err.code === 'SEASON_EXISTS') setError(t('adminSeasons.errors.exists'));
      else setError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(season) {
    setEditingSeason(season.season);
    setEditValues({
      isOpen: season.isOpen,
      prices: { ...season.prices },
      officialPriceExcludingCommission: season.officialPriceExcludingCommission || 0,
      commissionPerPilgrim: season.commissionPerPilgrim || 0,
    });
  }

  async function saveEdit(season) {
    await updateSeason(season, editValues);
    toast.success(t('toasts.seasonUpdated'));
    setEditingSeason(null);
    reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-afriland-black">{t('adminSeasons.title')}</h1>
        <p className="text-sm text-afriland-gray-600">{t('adminSeasons.subtitle')}</p>
      </div>

      <form onSubmit={handleCreate} className="card space-y-4">
        <p className="text-sm font-semibold text-afriland-black">{t('adminSeasons.newSeason')}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="form-label">{t('adminSeasons.year')}</label>
            <input
              type="number"
              className="form-input"
              value={form.season}
              onChange={(e) => setForm((prev) => ({ ...prev, season: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">{t('adminSeasons.month')}</label>
            <select
              className="form-input"
              value={form.month}
              onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
            >
              {MONTHS.map((label, index) => (
                <option key={label} value={index + 1}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PILGRIM_TYPES.map((type) => (
            <div key={type}>
              <label className="form-label">{t(`bordereau.pilgrimTypes.${type}`)}</label>
              <input
                type="number"
                className="form-input"
                value={form.prices[type]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, prices: { ...prev.prices, [type]: Number(e.target.value) } }))
                }
              />
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-md bg-afriland-gray-50 p-3">
          <p className="text-xs font-semibold text-afriland-black">{t('adminSeasons.commissionSettings')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">{t('adminSeasons.officialPriceExcludingCommission')}</label>
              <input
                type="number"
                className="form-input"
                value={form.officialPriceExcludingCommission}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, officialPriceExcludingCommission: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="form-label">{t('adminSeasons.commissionPerPilgrim')}</label>
              <input
                type="number"
                className="form-input"
                value={form.commissionPerPilgrim}
                onChange={(e) => setForm((prev) => ({ ...prev, commissionPerPilgrim: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t('common.loading') : t('adminSeasons.create')}
        </button>
      </form>

      <div className="space-y-4">
        {loading && <p className="text-afriland-gray-600">{t('common.loading')}</p>}
        {!loading && seasons.map((season) => (
          <div key={season.season} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-afriland-black">
                  {t('bordereau.season')} {season.season} — {MONTHS[(season.month || 1) - 1]}
                </p>
                <p className="text-xs text-afriland-gray-600">
                  {season.isOpen ? t('adminSeasons.open') : t('adminSeasons.closed')}
                </p>
              </div>
              {editingSeason === season.season ? (
                <div className="flex gap-2">
                  <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => saveEdit(season.season)}>{t('common.save')}</button>
                  <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setEditingSeason(null)}>{t('common.cancel')}</button>
                </div>
              ) : (
                <button type="button" className="text-xs font-semibold text-afriland-red hover:underline" onClick={() => startEdit(season)}>
                  {t('adminEncadreurs.edit')}
                </button>
              )}
            </div>

            {editingSeason === season.season ? (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editValues.isOpen}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, isOpen: e.target.checked }))}
                  />
                  {t('adminSeasons.open')}
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PILGRIM_TYPES.map((type) => (
                    <div key={type}>
                      <label className="form-label">{t(`bordereau.pilgrimTypes.${type}`)}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editValues.prices[type]}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, prices: { ...prev.prices, [type]: Number(e.target.value) } }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2 rounded-md bg-afriland-gray-50 p-3">
                  <p className="text-xs font-semibold text-afriland-black">{t('adminSeasons.commissionSettings')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">{t('adminSeasons.officialPriceExcludingCommission')}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editValues.officialPriceExcludingCommission}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, officialPriceExcludingCommission: Number(e.target.value) }))
                        }
                      />
                    </div>
                    <div>
                      <label className="form-label">{t('adminSeasons.commissionPerPilgrim')}</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editValues.commissionPerPilgrim}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, commissionPerPilgrim: Number(e.target.value) }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PILGRIM_TYPES.map((type) => (
                    <div key={type} className="rounded-md bg-afriland-gray-50 px-3 py-2">
                      <p className="text-xs text-afriland-gray-600">{t(`bordereau.pilgrimTypes.${type}`)}</p>
                      <p className="text-sm font-semibold text-afriland-black">{formatCurrency(season.prices[type])}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-afriland-gray-50 px-3 py-2">
                    <p className="text-xs text-afriland-gray-600">{t('adminSeasons.officialPriceExcludingCommission')}</p>
                    <p className="text-sm font-semibold text-afriland-black">
                      {formatCurrency(season.officialPriceExcludingCommission)}
                    </p>
                  </div>
                  <div className="rounded-md bg-afriland-gray-50 px-3 py-2">
                    <p className="text-xs text-afriland-gray-600">{t('adminSeasons.commissionPerPilgrim')}</p>
                    <p className="text-sm font-semibold text-afriland-black">
                      {formatCurrency(season.commissionPerPilgrim)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
