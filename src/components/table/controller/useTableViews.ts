"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { api as trpc } from "~/trpc/react";
import isEqual from "fast-deep-equal";
import { normalizeState, type CachedTableState } from "./useTableStateCache";
import { ViewConfigSchema } from "~/server/api/viewsConfigTypes";
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
  const [newViewName, setNewViewName] = useState("");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeViewConfig, setActiveViewConfig] =
    useState<CachedTableState | null>(null);

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
  const isViewDirty =
    !!activeViewConfig && !isEqual(currentConfig, activeViewConfig);

  /* ---------------------------- Apply View ---------------------------- */
  const applyView = useCallback(
    (view: { id: string; config: unknown }) => {
      if (!view?.config) return;

      const config = view.config as CachedTableState;

      setters.setSorting(config.sorting ?? []);
      setters.setColumnFilters(config.columnFilters ?? []);
      setters.setColumnVisibility(config.columnVisibility ?? {});
      setters.setColumnSizing(config.columnSizing ?? {});
      setters.setColumnPinning(config.columnPinning ?? { left: [], right: [] });
      setters.setGlobalSearch(config.globalSearch ?? "");

      setActiveCell(null);
      setActiveViewId(view.id);
      setActiveViewConfig(config);
      // Update cached table state to persist across page navigation
      setCached(config);
      save(config);
    },
    [setters, setActiveCell, save, setCached]
  );

  /* ---------------------------- Mutations ----------------------------- */
  const createViewMutation = trpc.views.createView.useMutation({
    onSuccess: async (res) => {
      await Promise.all([viewsQuery.refetch(), defaultViewQuery.refetch()]);
      applyView(res.createdView); // Apply immediately
    },
  });

  const updateViewMutation = trpc.views.updateView.useMutation({
    onSuccess: async (_, vars) => {
      setActiveViewConfig(vars.config as CachedTableState);
      if (vars?.config) {
        applyView({ id: activeViewId!, config: vars.config }); // Sync cache & active config
      }
      await viewsQuery.refetch();
    },
  });

  const setDefaultViewMutation = trpc.views.setDefaultView.useMutation({
    onSuccess: async () => {
      await Promise.all([viewsQuery.refetch(), defaultViewQuery.refetch()]);
    }
  });

  const deleteViewMutation = trpc.views.deleteView.useMutation({
    onSuccess: async (res) => {
      await Promise.all([viewsQuery.refetch(), defaultViewQuery.refetch()]);
      if (res.deletedViewId === activeViewId) {
        const next =
          defaultViewQuery.data ?? viewsQuery.data?.[0];
        if (next) applyView(next);
        else resetViewConfig(); // fallback if no views remain
      }
    },
  });

  /* ------------------------ Default View Setup ------------------------ */
  const initialConfigRef = useRef<typeof parsedConfig.data | null>(null);

  useEffect(() => {
    if (!initialConfigRef.current && parsedConfig.success) {
      initialConfigRef.current = parsedConfig.data;
    }
  }, [parsedConfig.success, parsedConfig.data]);

  useEffect(() => {
    if (!isValidTableId) return;
    if (didInitDefaultViewRef.current) return;

    if (
      viewsQuery.status !== "success" ||
      defaultViewQuery.status !== "success"
    ) {
      return;
    }

    didInitDefaultViewRef.current = true;

    const views = viewsQuery.data ?? [];
    const defaultView = defaultViewQuery.data;

    // Default exists --> apply it
    if (defaultView) {
      applyView(defaultView);
      return;
    }

    // Views exist but no default --> promote and apply first
    if (views.length > 0) {
      setDefaultViewMutation.mutate({ viewId: views[0]!.id });
      applyView(views[0]!);
      return;
    }

    // No views --> create default from initial config
    if (initialConfigRef.current) {
      createViewMutation.mutate({
        tableId,
        name: "Default Table View",
        config: initialConfigRef.current,
        isDefault: true,
      });
    }
  }, [
    isValidTableId,
    tableId,
    viewsQuery.status,
    viewsQuery.data,
    defaultViewQuery.status,
    defaultViewQuery.data,
    applyView,
    setDefaultViewMutation,
    createViewMutation,
  ]);

  useEffect(() => {
    didInitDefaultViewRef.current = false;
  }, [tableId]);

  /* ---------------------------- Handlers ------------------------------ */

  // Compute suggested name dynamically
  const suggestedName = useMemo(() => {
    if (!newViewName.trim() || !viewsQuery.data) return "";

    const existingNames = new Set(viewsQuery.data.map((v) => v.name));

    if (!existingNames.has(newViewName.trim())) return newViewName.trim();

    let i = 1;
    let candidate = `${newViewName.trim()} (${i})`;
    while (existingNames.has(candidate)) {
      i++;
      candidate = `${newViewName.trim()} (${i})`;
    }
    return candidate;
  }, [newViewName, viewsQuery.data]);

  const handleCreateView = () => {
    if (!newViewName.trim() || !parsedConfig.success) return;

    createViewMutation.mutate({
      tableId,
      name: suggestedName, // Use the auto-suggested name
      config: parsedConfig.data,
      isDefault: false,
    });

    setNewViewName(""); // reset input
  };

  const handleUpdateView = () => {
    if (!activeViewId || !parsedConfig.success) return;

    updateViewMutation.mutate({
      viewId: activeViewId,
      config: parsedConfig.data,
    });
  };

  const resetViewConfig = useCallback(() => {
    setters.setSorting([]);
    setters.setColumnFilters([]);
    setters.setColumnVisibility({});
    setters.setColumnSizing({});
    setters.setColumnPinning({ left: [], right: [] });
    setters.setGlobalSearch("");

    setActiveCell(null);
    setActiveViewId(null);
    setActiveViewConfig(null);
  }, [setters, setActiveCell]);

  const handleSetDefaultView = (view: { id: string; config: unknown; }) => {
    setDefaultViewMutation.mutate({ viewId: view.id });
    applyView(view);
  }

  const handleDeleteView = (view: { id: string; config: unknown; }) => {
    deleteViewMutation.mutate({ viewId: view.id });
  }

  const onStructureCommitted = useCallback(() => {
    if (!activeViewId) return;

    const normalized = normalizeState(
      currentConfig,
      columns,
      new Set(columns.map(c => c.id).concat(INDEX_COL_ID))
    );

    // Structural changes are irreversible → auto-save
    updateViewMutation.mutate({
      viewId: activeViewId,
      config: toViewConfigInput(normalized),
    });

    applyView({ id: activeViewId, config: normalized });
  }, [
    activeViewId,
    currentConfig,
    columns,
    updateViewMutation,
    applyView,
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
    views: viewsQuery.data ?? [],
    defaultView: defaultViewQuery.data,
    applyView,
    resetViewConfig,
    handleCreateView,
    handleUpdateView,
    handleSetDefaultView,
    handleDeleteView,
    onStructureCommitted,
  };
}
