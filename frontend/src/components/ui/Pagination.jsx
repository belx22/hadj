import { useTranslation } from 'react-i18next';

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  const { t } = useTranslation();

  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-afriland-gray-200 px-4 py-3">
      <p className="text-xs text-afriland-gray-600">{t('pagination.range', { start, end, total: totalItems })}</p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary !px-3 !py-1.5 text-xs"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {t('pagination.previous')}
          </button>
          <span className="text-xs text-afriland-gray-600">{t('pagination.page', { page, totalPages })}</span>
          <button
            type="button"
            className="btn-secondary !px-3 !py-1.5 text-xs"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
