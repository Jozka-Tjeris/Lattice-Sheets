"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { api as trpc } from "~/trpc/react";
import { useTableController } from "~/components/table/controller/TableProvider";
import isEqual from "fast-deep-equal";
import { ViewConfigSchema } from "~/server/api/viewsConfigTypes";
import type { CachedTableState } from "~/components/table/controller/useTableStateCache";

interface ViewSelectorBarProps {
  tableId: string;
}

export function ViewSelectorBar({ tableId }: ViewSelectorBarProps) {
  const { table, globalSearch, setGlobalSearch, setActiveCell } =
    useTableController();

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
      sorting: table.getState().sorting,
      columnFilters: table.getState().columnFilters,
      columnVisibility: table.getState().columnVisibility,
      columnSizing: table.getState().columnSizing,
      columnPinning: table.getState().columnPinning,
      globalSearch,
    }),
    [table, globalSearch]
  );

  const parsedConfig = useMemo(
    () => ViewConfigSchema.safeParse(currentConfig),
    [currentConfig]
  );

  const isConfigValid = parsedConfig.success;
  const isDirty =
    !!activeViewConfig && !isEqual(currentConfig, activeViewConfig);

  /* ---------------------------- Apply View ---------------------------- */
  const applyView = useCallback(
    (view: { id: string; config: unknown }) => {
      if (!view?.config) return;

      const config = view.config as CachedTableState;

      table.setSorting(config.sorting ?? []);
      table.setColumnFilters(config.columnFilters ?? []);
      table.setColumnVisibility(config.columnVisibility ?? {});
      table.setColumnSizing(config.columnSizing ?? {});
      table.setColumnPinning(
        config.columnPinning ?? { left: [], right: [] }
      );

      setGlobalSearch(config.globalSearch ?? "");
      setActiveCell(null);

      setActiveViewId(view.id);
      setActiveViewConfig(config);
    },
    [table, setGlobalSearch, setActiveCell]
  );

  /* ---------------------------- Mutations ----------------------------- */
  const createViewMutation = trpc.views.createView.useMutation({
    onSuccess: async (res) => {
      await Promise.all([viewsQuery.refetch(), defaultViewQuery.refetch()]);
      applyView(res.createdView); // Apply immediately if default
    },
  });

  const updateViewMutation = trpc.views.updateView.useMutation({
    onSuccess: (_, vars) => {
      setActiveViewConfig(vars.config as CachedTableState);
      viewsQuery.refetch();
    },
  });

  const setDefaultViewMutation = trpc.views.setDefaultView.useMutation({
    onSuccess: () => viewsQuery.refetch(),
  });

  const deleteViewMutation = trpc.views.deleteView.useMutation({
    onSuccess: async (data) => {
      await Promise.all([viewsQuery.refetch(), defaultViewQuery.refetch()]);
      if (data.deletedViewId === activeViewId) {
        const next =
          defaultViewQuery.data ?? viewsQuery.data?.[0];
        if (next) applyView(next);
      }
    },
  });

  /* ------------------------ Default View Setup ------------------------ */
  useEffect(() => {
    if (!isValidTableId) return;
    if (
      viewsQuery.status !== "success" ||
      defaultViewQuery.status !== "success"
    )
      return;
    if (didInitDefaultViewRef.current) return;

    didInitDefaultViewRef.current = true;
    const views = viewsQuery.data ?? [];
    const defaultView = defaultViewQuery.data;

    // No views at all: create default from current config
    if (!defaultView && views.length === 0 && parsedConfig.success) {
      createViewMutation.mutate({
        tableId,
        name: "Default Table View",
        config: parsedConfig.data,
        isDefault: true,
      });
      return;
    }

    // Views exist but no default: set first as default
    if (!defaultView && views.length > 0) {
      setDefaultViewMutation.mutate({ viewId: views[0]!.id });
      applyView(views[0]!);
    }
  }, [
    isValidTableId,
    tableId,
    viewsQuery.status,
    defaultViewQuery.status,
    viewsQuery.data,
    defaultViewQuery.data,
    parsedConfig.success,
    parsedConfig.data,
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

  /* ------------------------------ Render ------------------------------ */
  return (
    <div className="border-gray-750 w-70 shrink-0 border-r bg-gray-50 p-2 flex flex-col">
      <h4 className="mb-2 font-bold">Views</h4>

      <div className="flex flex-col gap-1 overflow-y-auto">
        {viewsQuery.data?.map((view) => (
          <div
            key={view.id}
            className={`flex items-center justify-between rounded p-1 ${
              activeViewId === view.id
                ? "bg-gray-200 font-medium"
                : "hover:bg-gray-100"
            }`}
          >
            <button
              className="flex min-w-0 flex-1 items-center gap-1 text-left"
              onClick={() => applyView(view)}
            >
              {view.isDefault && (
                <span className="text-xs text-blue-500">★</span>
              )}
              <span className="truncate">{view.name}</span>
              {activeViewId === view.id && isDirty && (
                <span className="ml-1 text-xs text-orange-500">
                  Draft
                </span>
              )}
            </button>

            {!view.isDefault && (
              <button
                className="ml-2 text-xs text-gray-400 hover:text-blue-500"
                title="Set as default"
                onClick={() => {
                  setDefaultViewMutation.mutate({ viewId: view.id });
                  applyView(view);
                }}
              >
                ★
              </button>
            )}

            <button
              className="ml-2 text-xs text-gray-400 hover:text-red-500"
              title="Delete view"
              disabled={viewsQuery.data?.length === 1}
              onClick={() => {
                if (viewsQuery.data?.length === 1) return;
                if (!confirm(`Delete view "${view.name}"?`)) return;
                deleteViewMutation.mutate({ viewId: view.id });
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <input
          className="w-full border rounded p-1 text-sm"
          placeholder="New view name"
          value={newViewName}
          onChange={(e) => setNewViewName(e.target.value)}
        />

        <button
          className="w-full bg-blue-500 text-white rounded p-1 text-sm hover:bg-blue-600 disabled:opacity-50"
          onClick={handleCreateView}
          disabled={!newViewName.trim() || !isConfigValid}
        >
          Save as New View
        </button>

        <button
          className="w-full bg-gray-200 text-gray-800 rounded p-1 text-sm hover:bg-gray-300 disabled:opacity-50"
          onClick={handleUpdateView}
          disabled={!activeViewId || !isDirty || !isConfigValid}
        >
          Update Selected View
        </button>

        <button
          className="w-full bg-gray-100 text-gray-700 rounded p-1 text-sm hover:bg-gray-200 disabled:opacity-50"
          disabled={!activeViewId || !isDirty}
          onClick={() => {
            const view = viewsQuery.data?.find(
              (v) => v.id === activeViewId
            );
            if (view) applyView(view);
          }}
        >
          Reset to View
        </button>
      </div>
    </div>
  );
}
