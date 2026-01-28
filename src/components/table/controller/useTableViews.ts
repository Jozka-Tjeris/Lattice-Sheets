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

  const isValidTableId = !!tableId && !tableId.includes("optimistic-table");
  const didInitDefaultViewRef = useRef(false);

  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeViewConfig, setActiveViewConfig] = useState<CachedTableState | null>(null);
  const [views, setViews] = useState<{ id: string; name: string; config: CachedTableState; optimistic?: boolean, isDefault: boolean }[]>([]);

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

  const isConfigValid = isValidTableId && parsedConfig.success;
  const isViewDirty = !!activeViewConfig && !isEqual(currentConfig, activeViewConfig);
  const initDefaultViewConfig = { isDefault: true, viewName: "Default table view"};

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

  const handleCreateView = useCallback(async (initConfig?: typeof initDefaultViewConfig) => {
    if(!userId) return;
    if(!parsedConfig.success) return;

    let suggestedName = "";
    if(initConfig !== initDefaultViewConfig){
      if(!confirmStructuralChange("Do you want to create a new view?")) return;
      const newViewName = prompt("Enter view name:", "New view");
      if(!newViewName) return;
      if(newViewName?.trim() === ""){
        alert("New view name cannot be empty");
        return;
      }
      suggestedName = (() => {
        const existingNames = new Set(views.map(v => v.name));
        if (!existingNames.has(newViewName.trim())) return newViewName.trim();
        let i = 1;
        let candidate = `${newViewName.trim()} (${i})`;
        while (existingNames.has(candidate)) { i++; candidate = `${newViewName.trim()} (${i})`; }
        return candidate;
      })();
      if(!suggestedName.trim()) return;
    }

    // Generate suggested name if current name already exists
    const optimisticId = `optimistic-view-${crypto.randomUUID()}`;
    const normalizedConfig = normalizeViewConfig(parsedConfig.data);

    const optimisticView = {
      id: optimisticId,
      name: initConfig?.viewName ?? suggestedName,
      config: normalizedConfig,
      optimistic: true,
      isDefault: initConfig?.isDefault ?? false,
    };

    setViews(prev => [...prev, optimisticView]);
    setActiveViewId(optimisticId);
    setActiveViewConfig(normalizedConfig);

    try {
      const { result } = await createViewMutation.mutateAsync({
        tableId,
        name: initConfig?.viewName ?? suggestedName,
        config: parsedConfig.data,
        isDefault: initConfig?.isDefault ?? false,
        optimisticId,
      });

      // Replace optimistic ID with real ID
      setViews(prev =>
        prev.map(v =>
          v.id === optimisticId ? { ...v, id: result.id, optimistic: false } : v
        )
      );
      setActiveViewId(result.id);
    } catch(error: any) {
      console.log(error)
      // Filter out view with optimistic id if fails
      setViews(prev => prev.filter(v => v.id !== optimisticId));
      if (activeViewId === optimisticId) {
        setActiveViewId(null);
        setActiveViewConfig(null);
      }
    }
  }, [userId, parsedConfig, tableId, views, activeViewId, createViewMutation]);

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
  }, [userId, activeViewId, parsedConfig, views, tableId, updateViewMutation]);

  const handleSetDefaultView = useCallback(async (viewId: string) => {
    if(!userId) return;
    if(!viewId) return; 
    if(!parsedConfig.success) return;

    const oldView = views.find(v => v.id === viewId);
    if (!oldView) return;
    const prevDefaultView = views.find(v => v.isDefault);
    if(!prevDefaultView) return;

    // Optimistically update local view
    setViews(prev =>
      prev.map(v => (v.id === viewId ? { ...v, isDefault: true } : { ...v, isDefault: false }))
    );
    applyView(oldView);

    try {
      await updateViewMutation.mutateAsync({
        tableId,
        viewId: viewId,
        config: parsedConfig.data,
      });
    } catch {
      // revert on error
      setViews(prev =>
        prev.map(v => (v.id === viewId ? oldView : 
          (v.id === prevDefaultView?.id ? { ...v, isDefault: true} : v)))
      );
    }
  }, [userId, parsedConfig, views, tableId, updateViewMutation]);

  const handleDeleteView = useCallback(async (viewId: string) => {
    if (!userId) return;
    const viewToDelete = views.find(v => v.id === viewId);
    if (!viewToDelete) return;
    if(views.length <= 1){
      alert("At least one view must be available");
      return;
    }
    if(viewToDelete.isDefault){
      alert("The default view cannot be deleted. Please mark the view as non-default before deleting");
      return;
    }

    if (!confirmStructuralChange(`Delete view "${viewToDelete.name}"?`)) return;

    // Find default view (guaranteed to exist due to prior checks)
    const nextView = views.find(v => v.isDefault)!;

    // Optimistically remove
    setViews(prev => prev.filter(v => v.id !== viewId));
    if (activeViewId === viewId) {
      // Apply new view if current view is deleted
      applyView(nextView);
    }

    try {
      await deleteViewMutation.mutateAsync({
        tableId,
        viewId,
      });
    } catch {
      // revert
      setViews(prev => [...prev, viewToDelete]);
    }
  }, [userId, views, activeViewId, confirmStructuralChange, tableId, deleteViewMutation]);

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
      void handleCreateView(initDefaultViewConfig);
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
    updateViewMutation,
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
    updateViewMutation,
  ]);

  return {
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
