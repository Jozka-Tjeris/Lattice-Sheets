"use client";

import { useCallback } from "react";
import type {
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ColumnSizingState,
  ColumnPinningState
} from "@tanstack/react-table";
import type { Column } from "./tableTypes";

export type CachedTableState = {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  columnPinning: ColumnPinningState;
  globalSearch: string;
};

const VERSION = 1;

function toCanonicalColumnId(
  colId: string,
  columns: Column[]
): string | null {
  const col = columns.find(
    c => c.internalId === colId || c.id === colId
  );
  return col?.id ?? null;
}

export function normalizeState(
  cached: CachedTableState,
  columns: Column[],
  validColumnIds: Set<string>
): CachedTableState {
  const mapId = (id: string): string | null => {
    // If it's already valid (e.g. INDEX_COL_ID), keep it
    if (validColumnIds.has(id)) {
      return id;
    }

    // Otherwise try to canonicalize (optimistic --> sreal)
    const canonical = toCanonicalColumnId(id, columns);

    return canonical && validColumnIds.has(canonical)
      ? canonical
      : null;
  };

  // Generic type here means that T can be any object as long is contains id: string
  const mapArray = <T extends { id: string }>(arr: T[]) =>
    arr
      .map(item => {
        const id = mapId(item.id);
        return id ? { ...item, id } : null;
      })
      .filter(Boolean) as T[];

  // fromEntries converts [key, value] arrays into key: value pairs, entries does the reverse
  const mapRecord = <T>(record: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(record)
        .map(([id, value]) => {
          const canonical = mapId(id);
          return canonical ? [canonical, value] : null;
        })
        .filter(Boolean) as [string, T][]
    );

  // arr being optional allows for inputs such as undefined, which handles edge cases well
  const mapPinArray = (arr?: string[]) =>
    Array.from(
      new Set(
        (arr ?? [])
          .map(mapId)
          .filter((id): id is string => Boolean(id))
      )
    );

  return {
    sorting: mapArray(cached.sorting),
    columnFilters: mapArray(cached.columnFilters),
    columnVisibility: mapRecord(cached.columnVisibility),
    columnSizing: mapRecord(cached.columnSizing),
    columnPinning: {
      left: mapPinArray(cached.columnPinning.left),
      right: mapPinArray(cached.columnPinning.right),
    },
    globalSearch: cached.globalSearch,
  };
}

export function useTableStateCache(tableId: string) {
  const storageKey = `table-ui-state:${tableId}:v${VERSION}`;

  const load = useCallback(
    (validColumnIds?: string[], columns?: Column[]): CachedTableState | null => {
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
          columns ?? [],
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
