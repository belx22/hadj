import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePagination from './usePagination';

const makeItems = (n) => Array.from({ length: n }, (_, i) => i + 1);

describe('usePagination', () => {
  it('découpe les éléments en pages', () => {
    const { result } = renderHook(() => usePagination(makeItems(25), 10));
    expect(result.current.totalItems).toBe(25);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('change de page', () => {
    const items = makeItems(25); // référence stable entre les rendus
    const { result } = renderHook(() => usePagination(items, 10));
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);
    expect(result.current.pageItems[0]).toBe(11);
  });

  it('borne la page au nombre total de pages', () => {
    const items = makeItems(5);
    const { result } = renderHook(() => usePagination(items, 10));
    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(1);
  });

  it('gère une liste vide', () => {
    const { result } = renderHook(() => usePagination([], 10));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pageItems).toEqual([]);
  });
});
