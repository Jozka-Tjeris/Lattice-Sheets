"use client";

import { useTableViewController } from "~/components/table/controller/TableProvider";

export function ViewSelectorBar() {
  const { newViewName,
    setNewViewName,
    activeViewId,
    isDirty,
    isConfigValid,
    views,
    applyView,
    handleCreateView,
    handleUpdateView,
    handleSetDefaultView,
    handleDeleteView,} = useTableViewController();

  /* ------------------------------ Render ------------------------------ */
  return (
    <div className="border-gray-750 w-70 shrink-0 border-r bg-gray-50 p-2 flex flex-col">
      <h4 className="mb-2 font-bold">Views</h4>

      <div className="flex flex-col gap-1 overflow-y-auto">
        {views.map((view) => (
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
              onClick={() => applyView({ id: view.id, config: view.config })}
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
                onClick={() => handleSetDefaultView(view)}
              >
                ★
              </button>
            )}

            <button
              className="ml-2 text-xs text-gray-400 hover:text-red-500"
              title="Delete view"
              disabled={views.length === 1}
              onClick={() => {
                if (views.length === 1) return;
                if (!confirm(`Delete view "${view.name}"?`)) return;
                handleDeleteView(view);
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
            const view = views.find(
              (v) => v.id === activeViewId
            );
            if (view) applyView({ id: view.id, config: view.config });
          }}
        >
          Reset to View
        </button>
      </div>
    </div>
  );
}
