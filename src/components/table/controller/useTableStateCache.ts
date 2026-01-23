"use client";

import { useCallback } from "react";
import type {
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ColumnSizingState,
  ColumnPinningState
} from "@tanstack/react-table";

export type CachedTableState = {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  columnPinning: ColumnPinningState;
};

const VERSION = 1;

export function normalizeState(
  cached: CachedTableState,
  validColumnIds: Set<string>
): CachedTableState {
  return {
    sorting: cached.sorting.filter(s => validColumnIds.has(s.id)),
    columnFilters: cached.columnFilters.filter(f => validColumnIds.has(f.id)),
    columnVisibility: Object.fromEntries(
      Object.entries(cached.columnVisibility).filter(([id]) =>
        validColumnIds.has(id)
      )
    ),
    columnSizing: Object.fromEntries(
      Object.entries(cached.columnSizing).filter(([id]) =>
        validColumnIds.has(id)
      )
    ),
    columnPinning: {
      left: cached.columnPinning.left?.filter(id => validColumnIds.has(id)) ?? [],
      right: cached.columnPinning.right?.filter(id => validColumnIds.has(id)) ?? [],
    }
  };
}

export function useTableStateCache(tableId: string) {
  const storageKey = `table-ui-state:${tableId}:v${VERSION}`;

  const load = useCallback(
    (validColumnIds?: string[]): CachedTableState | null => {
      if (typeof window === "undefined") return null;

      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as CachedTableState;
        if (!parsed || typeof parsed !== "object") return null;

        if (!validColumnIds) {
          return parsed;
        }

        return normalizeState(
          parsed,
          new Set(validColumnIds)
        );
      } catch {
        return null;
      }
    },
    [storageKey]
  );

  const save = useCallback((state: CachedTableState) => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Quota exceeded or disabled storage, fail silently
    }
  }, [storageKey]);

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { load, save, clear };
}
