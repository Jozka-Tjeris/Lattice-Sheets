"use client";

import { useState } from "react";
import { api as trpc } from "~/trpc/react";
import { useTableController } from "~/components/table/controller/TableProvider";

interface ViewSelectorBarProps{
  tableId: string;
}

export function ViewSelectorBar({ tableId }: ViewSelectorBarProps) {
  const { table, globalSearch, setGlobalSearch, setActiveCell } = useTableController(); // access table id and state
  const [newViewName, setNewViewName] = useState("");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Fetch all views for this table
  const viewsQuery = trpc.views.getViews.useQuery({ tableId });

  const createViewMutation = trpc.views.createView.useMutation({
    onSuccess: () => {
      setNewViewName("");
      viewsQuery.refetch(); // refresh list after creating
    },
  });

  const updateViewMutation = trpc.views.updateView.useMutation({
    onSuccess: () => viewsQuery.refetch(),
  });

  // Switch type to CachedTableState later on (already included global search)
  const applyView = (view: { config: any }) => {
    // Apply the view config to TableProvider
    if (!view?.config) return;

    const { sorting, columnFilters, columnVisibility, columnSizing, columnPinning, globalSearch } = view.config;

    table.setColumnVisibility(columnVisibility);
    table.setColumnSizing(columnSizing);
    table.setSorting(sorting);
    table.setColumnFilters(columnFilters);
    table.setColumnPinning(columnPinning);
    setGlobalSearch(globalSearch);
    setActiveCell(null);
  };

  const handleCreateView = () => {
    if (!newViewName.trim()) return;
    const currentConfig = {
      sorting: table.getState().sorting,
      columnFilters: table.getState().columnFilters,
      columnVisibility: table.getState().columnVisibility,
      columnSizing: table.getState().columnSizing,
      columnPinning: table.getState().columnPinning,
      globalSearch: globalSearch,
    };

    console.log(globalSearch)

    createViewMutation.mutate({
      tableId,
      name: newViewName,
      config: currentConfig,
      isDefault: false,
    });
  };

  return (
    <div className="border-gray-750 w-70 shrink-0 border-r bg-gray-50 p-2 flex flex-col">
      <h4 className="mb-2 font-bold">Views</h4>

      <div className="flex flex-col gap-1 overflow-y-auto">
        {viewsQuery.data?.map((view) => (
          <button
            key={view.id}
            className= {`text-left p-1 rounded ${activeViewId === view.id ? "" : "hover:bg-gray-100"}`}
            onClick={() => {
              applyView(view);
              setActiveViewId(view.id);
            }}
          >
            {view.name}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <input
          className="w-full border rounded p-1 text-sm"
          placeholder="New view name"
          value={newViewName}
          onChange={(e) => setNewViewName(e.target.value)}
        />
        <button
          className="mt-1 w-full bg-blue-500 text-white rounded p-1 text-sm hover:bg-blue-600"
          onClick={handleCreateView}
        >
          Save Current View
        </button>
      </div>
    </div>
  );
}
