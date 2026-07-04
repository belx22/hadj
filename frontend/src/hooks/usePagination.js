import { useEffect, useMemo, useState } from 'react';

// `items` should be a stable reference (state, or a memoized derived array) —
// the page resets to 1 whenever it changes (new filters, new fetch, etc.).
export default function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [items]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return { page: safePage, setPage, totalPages, totalItems, pageSize, pageItems };
}
