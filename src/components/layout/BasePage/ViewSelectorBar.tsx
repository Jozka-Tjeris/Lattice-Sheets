"use client";

import { useEffect, useState } from "react";
import { api as trpc } from "~/trpc/react";
import { useTableController } from "~/components/table/controller/TableProvider";
import isEqual from "fast-deep-equal";
import { ViewConfigSchema } from "~/server/api/viewsConfigTypes";

interface ViewSelectorBarProps {
  tableId: string;
}

export function ViewSelectorBar({ tableId }: ViewSelectorBarProps) {
  const { table, globalSearch, setGlobalSearch, setActiveCell } = useTableController();

  const [newViewName, setNewViewName] = useState("");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [activeViewConfig, setActiveViewConfig] = useState<any | null>(null);

  // Fetch all views
  const viewsQuery = trpc.views.getViews.useQuery({ tableId });

  // Fetch default view
  const defaultViewQuery = trpc.views.getDefaultView.useQuery({ tableId });

  // On first load, apply the default view
  useEffect(() => {
    const defaultView = defaultViewQuery.data;
    if (defaultView && (!activeViewId || activeViewId === defaultView.id)) {
      applyView(defaultView);
    }
  }, [defaultViewQuery.data]);

  const getCurrentConfig = () => ({
    sorting: table.getState().sorting,
    columnFilters: table.getState().columnFilters,
    columnVisibility: table.getState().columnVisibility,
    columnSizing: table.getState().columnSizing,
    columnPinning: table.getState().columnPinning,
    globalSearch: globalSearch,
  });

  const applyView = (view: { id: string; config: any }) => {
    if (!view?.config) return;

    const { sorting, columnFilters, columnVisibility, columnSizing, columnPinning, globalSearch } = view.config;

    table.setSorting(sorting ?? []);
    table.setColumnFilters(columnFilters ?? []);
    table.setColumnVisibility(columnVisibility ?? {});
    table.setColumnSizing(columnSizing ?? {});
    table.setColumnPinning(columnPinning ?? { left: [], right: [] });

    setGlobalSearch(globalSearch ?? "");
    setActiveCell(null);

    setActiveViewId(view.id);
    setActiveViewConfig(view.config);
  };

  const createViewMutation = trpc.views.createView.useMutation({
    onSuccess: () => {
      setNewViewName("");
      viewsQuery.refetch();
    },
  });

  const updateViewMutation = trpc.views.updateView.useMutation({
    onSuccess: () => viewsQuery.refetch(),
  });

  const setDefaultViewMutation = trpc.views.setDefaultView.useMutation({
    onSuccess: () => viewsQuery.refetch(),
  });

  const deleteViewMutation = trpc.views.deleteView.useMutation({
    onSuccess: (data) => {
      viewsQuery.refetch();

      if (data.deletedViewId === activeViewId) {
        setActiveViewId(null);
        setActiveViewConfig(null);
      }
    },
  });

  const handleCreateView = () => {
    if (!newViewName.trim()) return;

    const currentConfig = getCurrentConfig();

    // Validate current config
    const parsed = ViewConfigSchema.safeParse(currentConfig);
    if (!parsed.success) {
      console.error("Invalid view config:", parsed.error);
      alert("Cannot save view: invalid configuration.");
      return;
    }

    createViewMutation.mutate({
      tableId,
      name: newViewName,
      config: parsed.data, // validated config
      isDefault: false,
    });
  };

  const handleUpdateView = () => {
    if (!activeViewId) return;
    const currentConfig = getCurrentConfig();
    const parsed = ViewConfigSchema.safeParse(currentConfig);
    if (!parsed.success) {
      console.error("Invalid view config:", parsed.error);
      alert("Cannot update view: invalid configuration.");
      return;
    }

    updateViewMutation.mutate({
      viewId: activeViewId,
      config: parsed.data,
    });
  };

  const isDirty = activeViewConfig && !isEqual(getCurrentConfig(), activeViewConfig);
  // Determine if the current config is valid
  const currentConfig = getCurrentConfig();
  const isConfigValid = ViewConfigSchema.safeParse(currentConfig).success;

  return (
    <div className="border-gray-750 w-70 shrink-0 border-r bg-gray-50 p-2 flex flex-col">
      <h4 className="mb-2 font-bold">Views</h4>

      <div className="flex flex-col gap-1 overflow-y-auto">
        {viewsQuery.data?.map((view) => (
          <div
            key={view.id}
            className={`flex items-center justify-between rounded p-1 ${
              activeViewId === view.id ? "bg-gray-200 font-medium" : "hover:bg-gray-100"
            }`}
          >
            <button
              className="flex min-w-0 flex-1 items-center gap-1 text-left"
              onClick={() => applyView(view)}
            >
              {view.isDefault && <span className="text-xs text-blue-500">★</span>}
              <span className="truncate">{view.name}</span>
              {activeViewId === view.id && isDirty && (
                <span className="ml-1 text-xs text-orange-500">Draft</span>
              )}
            </button>

            {!view.isDefault && (
              <button
                className="ml-2 text-xs text-gray-400 hover:text-blue-500"
                title="Set as default"
                onClick={() => setDefaultViewMutation.mutate({ viewId: view.id })}
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
                const confirmed = confirm(`Delete view "${view.name}"? This cannot be undone.`);
                if (!confirmed) return;
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
          title={!isConfigValid ? "Cannot save: invalid table configuration" : undefined}
        >
          Save as New View
        </button>

        <button
          className="w-full bg-gray-200 text-gray-800 rounded p-1 text-sm hover:bg-gray-300 disabled:opacity-50"
          onClick={handleUpdateView}
          disabled={!activeViewId || !isDirty || !isConfigValid}
          title={
            !activeViewId
              ? "Select a view to update"
              : !isDirty
                ? "No changes to save"
                : !isConfigValid
                  ? "Cannot update: invalid table configuration"
                  : undefined
          }
        >
          Update Selected View
        </button>
        <button
          className="w-full bg-gray-100 text-gray-700 rounded p-1 text-sm hover:bg-gray-200 disabled:opacity-50"
          disabled={!activeViewId || !isDirty}
          onClick={() => {
            const view = viewsQuery.data?.find((v) => v.id === activeViewId);
            if (view) applyView(view);
          }}
        >
          Reset to View
        </button>
      </div>
    </div>
  );
}
