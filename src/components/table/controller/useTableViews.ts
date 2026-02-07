"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { api as trpc } from "~/trpc/react";
import isEqual from "fast-deep-equal";
import { normalizeState, type CachedTableState } from "./useTableStateCache";
import { ViewConfigSchema, type ViewConfig } from "~/server/api/viewsConfigTypes";
import type { ColumnFiltersState, ColumnPinningState, ColumnSizingState, SortingState, VisibilityState } from "@tanstack/react-table";
import type { Column } from "./tableTypes";
import { INDEX_COL_ID } from "~/constants/table";
import type { JsonValue } from "@prisma/client/runtime/client";
import { LIMITS, warnLimitReached } from "~/constants/limits";

type TableViewStateInput = {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  columnPinning: ColumnPinningState;
  globalSearch: string;
};

type TableViewSetters = {
  setSorting: (updater: SortingState) => void;
  setColumnFilters: (updater: ColumnFiltersState) => void;
  setColumnVisibility: (updater: VisibilityState) => void;
  setColumnSizing: (updater: ColumnSizingState) => void;
  setColumnPinning: (updater: ColumnPinningState) => void;
  setGlobalSearch: (search: string) => void;
};

function toViewConfigInput(
  state: CachedTableState
): {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  columnVisibility?: VisibilityState;
  columnSizing?: ColumnSizingState;
  columnPinning?: { left: string[]; right: string[] };
  globalSearch?: string;
} {
  return {
    sorting: state.sorting,
    columnFilters: state.columnFilters,
    columnVisibility: state.columnVisibility,
    columnSizing: state.columnSizing,
    columnPinning: {
      left: state.columnPinning.left ?? [INDEX_COL_ID],
      right: state.columnPinning.right ?? [],
    },
    globalSearch: state.globalSearch,
  };
}

function normalizeViewConfig(config: ViewConfig): CachedTableState {
  return {
    sorting: config.sorting ?? [],
    columnFilters: (config.columnFilters ?? []).map((filter) => ({
      id: filter.id,
      value: String(filter.value ?? ""),
    })),
    columnVisibility: config.columnVisibility ?? {},
    columnSizing: config.columnSizing ?? {},
    columnPinning: {
      left: config.columnPinning?.left ?? [INDEX_COL_ID],
      right: config.columnPinning?.right ?? [],
    },
    globalSearch: config.globalSearch ?? "",
  };
}

export function useTableViews(
  tableId: string,
  state: TableViewStateInput,
  setters: TableViewSetters,
  setActiveCell: (cell: { rowId: string; columnId: string } | null) => void,
  setCached: (value: React.SetStateAction<CachedTableState | null>) => void,
  save: (state: CachedTableState) => void,
  columns: Column[],
) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const utils = trpc.useUtils();

  const isValidTableId = !!tableId && !tableId.includes("optimistic-table");

  const tableScopeRef = useRef<{ tableId: string } | null>(null);
  const activeViewIdRef = useRef<string | null>(null);

  const isStale = useCallback(() => tableScopeRef.current?.tableId !== tableId, [tableId]);

  if (tableScopeRef.current?.tableId !== tableId) {
    tableScopeRef.current = { tableId };
  }

  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeViewConfig, setActiveViewConfig] = useState<CachedTableState | null>(null);
  const [views, setViews] = useState<
    { id: string; name: string; config: CachedTableState; tableId: string; optimistic?: boolean; isDefault: boolean }[]
  >([]);

  const viewsQuery = trpc.views.getViews.useQuery({ tableId }, { enabled: isValidTableId });

  const currentConfig = useMemo(
    () => ({
      sorting: state.sorting,
      columnFilters: state.columnFilters,
      columnVisibility: state.columnVisibility,
      columnSizing: state.columnSizing,
      columnPinning: state.columnPinning,
      globalSearch: state.globalSearch,
    }),
    [
      state.sorting,
      state.columnFilters,
      state.columnVisibility,
      state.columnSizing,
      state.columnPinning,
      state.globalSearch,
    ]
  );

  const parsedConfig = useMemo(() => ViewConfigSchema.safeParse(currentConfig), [currentConfig]);

  const isConfigValid = isValidTableId && parsedConfig.success;
  const isViewDirty = !!activeViewConfig && !isEqual(currentConfig, activeViewConfig);

  /* ---------------- Apply View ---------------- */
  const applyView = useCallback(
    (view: { id: string; tableId: string; config: unknown }) => {
      if (!view?.config || view.tableId !== tableId) return;
      const config = normalizeViewConfig(view.config);
      setters.setSorting(config.sorting ?? []);
      setters.setColumnFilters(config.columnFilters ?? []);
      setters.setColumnVisibility(config.columnVisibility ?? {});
      setters.setColumnSizing(config.columnSizing ?? {});
      setters.setColumnPinning(config.columnPinning ?? { left: [INDEX_COL_ID], right: [] });
      setters.setGlobalSearch(config.globalSearch ?? "");

      setActiveCell(null);
      setActiveViewId(view.id);
      activeViewIdRef.current = view.id;
      setActiveViewConfig(config);
      setCached(config);
      save(config);
    },
    [setters, setActiveCell, tableId, save, setCached]
  );

  const createViewMutation = trpc.views.createView.useMutation();
  const updateViewMutation = trpc.views.updateView.useMutation();
  const deleteViewMutation = trpc.views.deleteView.useMutation();

  const confirmStructuralChange = useCallback((action: string) => {
    return confirm(
      `${action}\n\nChanges are applied immediately and saved automatically.`
    );
  }, []);

  /* ---------------- Handlers ---------------- */
  const handleCreateView = useCallback(async () => {
    if (!userId || !parsedConfig.success) return;
    const tableIdAtCallTime = tableId;

    if(views.length >= LIMITS.VIEW){
      warnLimitReached("VIEW");
      return;
    }

    if (!confirmStructuralChange("Do you want to create a new view?")) return;
    const newViewName = prompt(`Enter view name (max length: ${LIMITS.TEXT}) (be careful, you can't change the view name later):`, "New view");
    if(!newViewName) return;
    if (!newViewName.trim()) {
      alert("New view name cannot be empty");
      return;
    }
    const suggestedName = (() => {
      const existingNames = new Set(views.map((v) => v.name));
      if (!existingNames.has(newViewName.trim())) return newViewName.trim();
      let i = 1;
      let candidate = `${newViewName.trim()} (${i})`;
      while (existingNames.has(candidate)) {
        i++;
        candidate = `${newViewName.trim()} (${i})`;
      }
      return candidate;
    })();

    const optimisticId = `optimistic-view-${crypto.randomUUID()}`;
    const normalizedConfig = normalizeViewConfig(parsedConfig.data);

    const optimisticView = {
      id: optimisticId,
      tableId,
      name: suggestedName,
      config: normalizedConfig,
      optimistic: true,
      isDefault: false,
    };

    const optimisticViewCache = {
      id: optimisticId,
      name: suggestedName,
      createdAt: new Date(),
      updatedAt: new Date(),
      tableId,
      config: parsedConfig.data,
      isDefault: false
    }

    setViews((prev) => prev.filter((v) => v.tableId === tableId).concat(optimisticView));

    // Perform optimistic update in cache
    utils.views.getViews.setData({ tableId }, (prev): typeof prev =>
        prev ? [...prev, optimisticViewCache] : [optimisticViewCache]
    );

    setActiveViewId(optimisticId);
    activeViewIdRef.current = optimisticId;
    setActiveViewConfig(normalizedConfig);

    try {
      const { result } = await createViewMutation.mutateAsync({
        tableId,
        name: suggestedName,
        config: parsedConfig.data,
        isDefault: false,
        optimisticId,
      });
      // Reconcile IDs in cache regardless if stale or not
      utils.views.getViews.setData({ tableId: tableIdAtCallTime }, (prev): typeof prev =>
          prev ? prev.map(v => v.id === optimisticId ? result : v) : prev
      );
      // Only update UI if not stale
      if (isStale() || tableId !== tableIdAtCallTime) return;
      setViews((prev) =>
        prev.map((v) => (v.id === optimisticId ? { ...v, id: result.id, optimistic: false } : v))
      );
      setActiveViewId(result.id);
      activeViewIdRef.current = result.id;
    } catch {
      // Rollback cache regardless if stale or not
      utils.views.getViews.setData({ tableId: tableIdAtCallTime }, (prev): typeof prev =>
          prev ? prev.filter(v => v.id !== optimisticId) : []
      );
      // Only update UI if not stale
      if (isStale() || tableId !== tableIdAtCallTime) return;
      setViews((prev) => prev.filter((v) => v.id !== optimisticId));
      if (activeViewIdRef.current === optimisticId) {
        setActiveViewId(null);
        activeViewIdRef.current = null;
        setActiveViewConfig(null);
      }
    }
  }, [userId, parsedConfig, tableId, views, createViewMutation, confirmStructuralChange, isStale, utils.views.getViews]);

  const handleUpdateView = useCallback(async () => {
    if (!userId || !activeViewIdRef.current || !parsedConfig.success) return;
    const tableIdAtCallTime = tableId;

    const oldView = views.find((v) => v.id === activeViewIdRef.current);
    if (!oldView) return;

    const prevCache = utils.views.getViews.getData({ tableId });

    const normalizedConfig = normalizeViewConfig(parsedConfig.data);
    setViews((prev) =>
      prev.map((v) => (v.id === activeViewIdRef.current ? { ...v, config: normalizedConfig } : v))
    );

    // Optimistic update for cache
    utils.views.getViews.setData({ tableId }, (prev): typeof prev =>
      prev ? prev.map(v => v.id === activeViewIdRef.current ? { ...v, config: parsedConfig.data } : v)
        : prev
    );

    setActiveViewConfig(normalizedConfig);

    try {
      await updateViewMutation.mutateAsync({
        tableId,
        viewId: activeViewIdRef.current,
        config: parsedConfig.data,
      });
      if (isStale() || tableId !== tableIdAtCallTime) return;
    } catch {
      // Always restore cache
      utils.views.getViews.setData({ tableId: tableIdAtCallTime }, () => prevCache);
      if (isStale() || tableId !== tableIdAtCallTime) return;
      setViews((prev) => prev.map((v) => (v.id === activeViewIdRef.current ? oldView : v)));
      setActiveViewConfig(oldView.config);
    }
  }, [userId, parsedConfig, views, tableId, updateViewMutation, isStale, utils.views.getViews]);

  const handleSetDefaultView = useCallback(async (viewId: string) => {
    if (!userId || !viewId || !parsedConfig.success) return;
    const tableIdAtCallTime = tableId;

    const oldView = views.find((v) => v.id === viewId);
    if (!oldView) return;
    const prevDefaultView = views.find((v) => v.isDefault)!;

    setViews((prev) => prev.map((v) => ({ ...v, isDefault: v.id === viewId })));

    // snapshot cache state
    const prevCache = utils.views.getViews.getData({ tableId });

    // Optimistic update for cache
    utils.views.getViews.setData({ tableId }, (prev): typeof prev =>
      prev
        ? prev.map(v => ({
            ...v,
            isDefault: v.id === viewId,
          }))
        : prev
    );

    applyView(oldView);

    try {
      await updateViewMutation.mutateAsync({
        tableId,
        viewId,
        config: parsedConfig.data,
        isDefault: true
      });
      // Update cache regardless if stale or not
      utils.views.getViews.setData({ tableId: tableIdAtCallTime }, (prev) =>
        prev
          ? prev.map(v => ({ ...v, isDefault: v.id === viewId }))
          : prev
      );
      if (isStale() || tableId !== tableIdAtCallTime) return;
      activeViewIdRef.current = viewId;
    } catch {
      // Rollback cache regardless if stale or not
      utils.views.getViews.setData({ tableId: tableIdAtCallTime }, () => prevCache);
      if (isStale() || tableId !== tableIdAtCallTime) return;
      setViews((prev) =>
        prev.map((v) =>
          v.id === viewId
            ? oldView
            : v.id === prevDefaultView?.id
            ? { ...v, isDefault: true }
            : { ...v, isDefault: false }
        )
      );
    }
  }, [userId, parsedConfig, views, tableId, updateViewMutation, applyView, isStale, utils.views.getViews]);

  const handleDeleteView = useCallback(async (viewId: string) => {
    if (!userId) return;
    const tableIdAtCallTime = tableId;
    const viewToDelete = views.find((v) => v.id === viewId);
    if (!viewToDelete) return;
    if (views.length <= 1) {
      alert("At least one view must be available");
      return;
    }
    if (viewToDelete.isDefault) {
      alert("The default view cannot be deleted. Please mark the view as non-default before deleting");
      return;
    }

    if (!confirmStructuralChange(`Delete view "${viewToDelete.name}"?`)) return;

    const nextView =
      views.find((v) => v.isDefault && v.tableId === tableId) ?? views.find((v) => v.id !== viewId)!;

    const prevCache = utils.views.getViews.getData({ tableId });

    setViews((prev) => prev.filter((v) => v.id !== viewId));

    utils.views.getViews.setData({ tableId }, (prev): typeof prev =>
      prev ? prev.filter(v => v.id !== viewId) : prev
    );

    if (activeViewIdRef.current === viewId) {
      applyView(nextView);
    }

    try {
      await deleteViewMutation.mutateAsync({ tableId, viewId });
      if (isStale() || tableId !== tableIdAtCallTime) return;
    } catch {
      // Rollback cache regardless if stale or not
      utils.views.getViews.setData({ tableId: tableIdAtCallTime }, () => prevCache);
      if (isStale() || tableId !== tableIdAtCallTime) return;
      setViews((prev) => [...prev, viewToDelete]);
    }
  },[userId, views, confirmStructuralChange, tableId, deleteViewMutation, applyView, isStale, utils.views.getViews]);

  const resetViewConfig = useCallback(() => {
    setters.setSorting([]);
    setters.setColumnFilters([]);
    setters.setColumnVisibility({});
    setters.setColumnSizing({});
    setters.setColumnPinning({ left: [INDEX_COL_ID], right: [] });
    setters.setGlobalSearch("");
    setActiveCell(null);
  }, [setters, setActiveCell]);

  /* ---------------- Default View Setup ---------------- */
  useEffect(() => {
    if (!userId || !isValidTableId || !viewsQuery.data) return;
    const tableIdAtCallTime = tableId;

    
    if (isStale() || tableId !== tableIdAtCallTime) return;
    const normalizedViews = viewsQuery.data?.map((v) => ({
      ...v,
      tableId,
      config: normalizeViewConfig(v.config as ViewConfig),
    }));
    setViews(normalizedViews);
    // Only apply default view if there is no activeViewId yet
    if (!activeViewIdRef.current) {
      const defaultView = normalizedViews.find((v) => v.isDefault);
      if (defaultView) applyView(defaultView);
    }
  }, [isValidTableId, tableId, isStale, userId, viewsQuery.data, applyView]);

  /* ------------------- onStructureCommitted ------------------- */
  const onStructureCommitted = useCallback(() => {
    if (!userId || !activeViewIdRef.current) return;
    const tableIdAtCallTime = tableId;

    const normalized = normalizeState(
      currentConfig,
      columns,
      new Set(columns.map(c => c.id).concat(INDEX_COL_ID))
    );

    setViews((prev) =>
      prev.map((v) =>
        v.id === activeViewIdRef.current ? { ...v, config: normalized } : v
      )
    );

    utils.views.getViews.setData({ tableId: tableIdAtCallTime }, (prev) =>
      prev
        ? prev.map(v =>
            v.id === activeViewIdRef.current
              ? { ...v, config: toViewConfigInput(normalized) as JsonValue }
              : v
          )
        : prev
    );

    setActiveViewConfig(normalized);
    setCached(normalized);
    void save(normalized);

    void updateViewMutation.mutateAsync({
      tableId,
      viewId: activeViewIdRef.current,
      config: toViewConfigInput(normalized),
    });
  }, [activeViewIdRef, currentConfig, columns, save, setCached, userId, tableId, updateViewMutation, utils.views.getViews]);

  return {
    activeViewId,
    setActiveViewId: (id: string | null) => {
      setActiveViewId(id);
      activeViewIdRef.current = id;
    },
    activeViewConfig,
    setActiveViewConfig,
    currentConfig,
    isViewDirty,
    isConfigValid,
    views,
    applyView,
    resetViewConfig,
    handleCreateView,
    handleUpdateView,
    handleSetDefaultView,
    handleDeleteView,
    onStructureCommitted,
  };
}
