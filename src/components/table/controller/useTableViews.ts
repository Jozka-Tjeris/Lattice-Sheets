"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { api as trpc } from "~/trpc/react";
import isEqual from "fast-deep-equal";
import { normalizeState, type CachedTableState } from "./useTableStateCache";
import { ViewConfigSchema, type ViewConfig } from "~/server/api/viewsConfigTypes";
import type { ColumnFiltersState, ColumnPinningState, ColumnSizingState, SortingState, VisibilityState } from "@tanstack/react-table";
import type { Column } from "./tableTypes";

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
      left: state.columnPinning.left ?? [],
      right: state.columnPinning.right ?? [],
    },
    globalSearch: state.globalSearch,
  };
}

function normalizeViewConfig(config: ViewConfig): CachedTableState {
  return {
    sorting: config.sorting ?? [],
    // Map through filters to ensure the 'value' is treated as a string
    columnFilters: (config.columnFilters ?? []).map(filter => ({
      id: filter.id,
      // Force it to a string, or provide a fallback
      value: String(filter.value ?? ""), 
    })),
    columnVisibility: config.columnVisibility ?? {},
    columnSizing: config.columnSizing ?? {},
    columnPinning: {
      left: config.columnPinning?.left ?? [],
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
  INDEX_COL_ID: string,
) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [newViewName, setNewViewName] = useState("Default Table View");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeViewConfig, setActiveViewConfig] = useState<CachedTableState | null>(null);
  const [views, setViews] = useState<{ id: string; name: string; config: CachedTableState; optimistic?: boolean, isDefault: boolean }[]>([]);

  const isValidTableId = !!tableId && !tableId.includes("optimistic-table");
  const didInitDefaultViewRef = useRef(false);

  /* ----------------------------- Queries ----------------------------- */
  const viewsQuery = trpc.views.getViews.useQuery(
    { tableId },
    { enabled: isValidTableId }
  );

  const defaultViewQuery = trpc.views.getDefaultView.useQuery(
    { tableId },
    { enabled: isValidTableId }
  );

  /* -------------------------- Current Config -------------------------- */
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

  const parsedConfig = useMemo(
    () => ViewConfigSchema.safeParse(currentConfig),
    [currentConfig]
  );

  const isConfigValid = parsedConfig.success;
  const isViewDirty = !!activeViewConfig && !isEqual(currentConfig, activeViewConfig);

  /* ---------------------------- Apply View ---------------------------- */
  const applyView = useCallback(
    (view: { id: string; config: unknown }) => {
      if (!view?.config) return;

      const config = normalizeViewConfig(view.config);
      setters.setSorting(config.sorting ?? []);
      setters.setColumnFilters(config.columnFilters ?? []);
      setters.setColumnVisibility(config.columnVisibility ?? {});
      setters.setColumnSizing(config.columnSizing ?? {});
      setters.setColumnPinning(config.columnPinning ?? { left: [], right: [] });
      setters.setGlobalSearch(config.globalSearch ?? "");

      setActiveCell(null);
      setActiveViewId(view.id);
      setActiveViewConfig(config);
    },
    [setters, setActiveCell]
  );

  const persistAppliedView = useCallback((config: CachedTableState) => {
    // Update cached table state to persist across page navigation
    setCached(config);
    save(config);
  }, [setCached, save]);

  const createViewMutation = trpc.views.createView.useMutation();
  const updateViewMutation = trpc.views.updateView.useMutation();
  const deleteViewMutation = trpc.views.deleteView.useMutation();

  /* -------------------------- Handlers --------------------------- */
  const confirmStructuralChange = useCallback((action: string) => {
    return confirm(
      `${action}\n\nChanges are applied immediately and saved automatically.`
    );
  }, []);

  const handleCreateView = useCallback(async () => {
    if(!userId) return;
    if(!newViewName.trim()) return; 
    if(!parsedConfig.success) return;

    // Generate suggested name if current name already exists
    const optimisticId = `optimistic-view-${crypto.randomUUID()}`;
    const suggestedName = (() => {
      const existingNames = new Set(views.map(v => v.name));
      if (!existingNames.has(newViewName.trim())) return newViewName.trim();
      let i = 1;
      let candidate = `${newViewName.trim()} (${i})`;
      while (existingNames.has(candidate)) { i++; candidate = `${newViewName.trim()} (${i})`; }
      return candidate;
    })();

    const normalizedConfig = normalizeViewConfig(parsedConfig.data);

    const optimisticView = {
      id: optimisticId,
      name: suggestedName,
      config: normalizedConfig,
      optimistic: true,
      isDefault: false,
    };

    setViews(prev => [...prev, optimisticView]);
    setActiveViewId(optimisticId);
    setActiveViewConfig(normalizedConfig);
    setNewViewName("");

    try {
      const { result } = await createViewMutation.mutateAsync({
        tableId,
        name: suggestedName,
        config: parsedConfig.data,
        optimisticId,
      });

      // Replace optimistic ID with real ID
      setViews(prev =>
        prev.map(v =>
          v.id === optimisticId ? { ...v, id: result.id, optimistic: false } : v
        )
      );
      setActiveViewId(result.id);
    } catch {
      // Filter out view with optimistic id if fails
      setViews(prev => prev.filter(v => v.id !== optimisticId));
      if (activeViewId === optimisticId) {
        setActiveViewId(null);
        setActiveViewConfig(null);
      }
    }
  }, [userId, newViewName, parsedConfig, tableId, views, activeViewId]);

  const handleUpdateView = useCallback(async () => {
    if(!userId) return;
    if(!activeViewId) return; 
    if(!parsedConfig.success) return;

    const oldView = views.find(v => v.id === activeViewId);
    if (!oldView) return;

    const normalizedConfig = normalizeViewConfig(parsedConfig.data);

    // Optimistically update local view
    setViews(prev =>
      prev.map(v => (v.id === activeViewId ? { ...v, config: normalizedConfig } : v))
    );
    setActiveViewConfig(normalizedConfig);

    try {
      await updateViewMutation.mutateAsync({
        tableId,
        viewId: activeViewId,
        config: parsedConfig.data,
      });
    } catch {
      // revert on error
      setViews(prev =>
        prev.map(v => (v.id === activeViewId ? oldView : v))
      );
      setActiveViewConfig(oldView.config);
    }
  }, [userId, activeViewId, parsedConfig, views, tableId]);

  const handleSetDefaultView = useCallback(async (viewId: string) => {
    if(!userId) return;
    if(!viewId) return; 
    if(!parsedConfig.success) return;

    const oldView = views.find(v => v.id === viewId);
    if (!oldView) return;

    // Optimistically update local view
    setViews(prev =>
      prev.map(v => (v.id === viewId ? { ...v, config: oldView.config, isDefault: true } : v))
    );
    setActiveViewConfig(oldView.config);

    try {
      await updateViewMutation.mutateAsync({
        tableId,
        viewId: viewId,
        config: parsedConfig.data,
      });
    } catch {
      // revert on error
      setViews(prev =>
        prev.map(v => (v.id === viewId ? oldView : v))
      );
      setActiveViewConfig(oldView.config);
    }
  }, [userId, parsedConfig, views, tableId]);

  const handleDeleteView = useCallback(async (viewId: string) => {
    if (!userId) return;
    const viewToDelete = views.find(v => v.id === viewId);
    if (!viewToDelete) return;

    if (!confirmStructuralChange(`Delete view "${viewToDelete.name}"?`)) return;

    // Optimistically remove
    setViews(prev => prev.filter(v => v.id !== viewId));
    if (activeViewId === viewId) {
      setActiveViewId(null);
      setActiveViewConfig(null);
    }

    try {
      await deleteViewMutation.mutateAsync({
        tableId,
        viewId,
      });
    } catch {
      // revert
      setViews(prev => [...prev, viewToDelete]);
      if (!activeViewId) {
        setActiveViewId(viewToDelete.id);
        setActiveViewConfig(viewToDelete.config);
      }
    }
  }, [userId, views, activeViewId, confirmStructuralChange, tableId]);

  const resetViewConfig = useCallback(() => {
    setters.setSorting([]);
    setters.setColumnFilters([]);
    setters.setColumnVisibility({});
    setters.setColumnSizing({});
    setters.setColumnPinning({ left: [INDEX_COL_ID], right: [] });
    setters.setGlobalSearch("");

    setActiveCell(null);
  }, [setters, setActiveCell, INDEX_COL_ID]);

  /* ------------------------ Default View Setup ------------------------ */
  const initialConfigRef = useRef<typeof parsedConfig.data | null>(null);

  useEffect(() => {
    if (!initialConfigRef.current && parsedConfig.success) {
      initialConfigRef.current = parsedConfig.data;
    }
  }, [parsedConfig.success, parsedConfig.data]);

  useEffect(() => {
    if (!userId) return;
    if (!isValidTableId) return;
    if (didInitDefaultViewRef.current) return;

    if (viewsQuery.status !== "success" || defaultViewQuery.status !== "success") return;

    didInitDefaultViewRef.current = true;

    const queryViews = (viewsQuery.data ?? []).map(v => ({
      ...v,
      config: normalizeViewConfig(v.config as ViewConfig),
    }));
    
    const defaultView = defaultViewQuery.data 
      ? { ...defaultViewQuery.data, config: normalizeViewConfig(defaultViewQuery.data.config as ViewConfig) }
      : null;

    setViews(queryViews);

    // Default exists --> apply it
    if (defaultView) {
      applyView(defaultView);
      persistAppliedView(defaultView.config);
      return;
    }

    // No default views exist, pick first view as fallback
    if (queryViews.length > 0) {
      const firstView = queryViews[0]!;
      applyView(firstView);
      persistAppliedView(firstView.config);

      void updateViewMutation.mutateAsync({
        tableId,
        viewId: firstView.id,
        config: toViewConfigInput(firstView.config),
      });
      return;
    }

    // Create a view from current state if none exist
    if (initialConfigRef.current) {
      void handleCreateView(); 
    }
  }, [
    isValidTableId,
    viewsQuery.status,
    viewsQuery.data,
    defaultViewQuery.status,
    defaultViewQuery.data,
    applyView,
    persistAppliedView,
    userId,
    handleCreateView,
    tableId,
  ]);

  useEffect(() => {
    didInitDefaultViewRef.current = false;
  }, [tableId]);

  /* ------------------- onStructureCommitted ------------------- */
  const onStructureCommitted = useCallback(() => {
    if (!userId) return;
    if (!activeViewId) return;

    const normalized = normalizeState(
      currentConfig,
      columns,
      new Set(columns.map(c => c.id).concat(INDEX_COL_ID))
    );

    // Optimistically update local active view
    setViews(prev =>
      prev.map(v =>
        v.id === activeViewId ? { ...v, config: normalized } : v
      )
    );

    setActiveViewConfig(normalized);
    setCached(normalized);
    void save(normalized);

    void updateViewMutation.mutateAsync({
      tableId,
      viewId: activeViewId,
      config: toViewConfigInput(normalized),
    });
  }, [
    activeViewId,
    currentConfig,
    columns,
    INDEX_COL_ID,
    save,
    setCached,
    userId,
    tableId,
  ]);

  return {
    newViewName,
    setNewViewName,
    activeViewId,
    setActiveViewId,
    activeViewConfig,
    setActiveViewConfig,
    currentConfig,
    isViewDirty,
    isConfigValid,
    views,
    applyView,
    persistAppliedView,
    resetViewConfig,
    handleCreateView,
    handleUpdateView,
    handleSetDefaultView,
    handleDeleteView,
    onStructureCommitted,
  };
}
