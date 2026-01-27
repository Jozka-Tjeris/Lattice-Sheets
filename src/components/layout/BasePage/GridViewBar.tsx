"use client";

import {
  useTableStructureController,
  useTableViewController,
} from "~/components/table/controller/TableProvider";

export function GridViewBar() {
  /* ----------------------- Structure state ----------------------- */
  const {
    globalSearch,
    setGlobalSearch,
    setActiveCell,
  } = useTableStructureController();

  /* ------------------------- View state -------------------------- */
  const {
    views,
    defaultView,
    activeViewId,
    isViewDirty,
    applyView,
    resetViewConfig,
    handleSetDefaultView,
  } = useTableViewController();

  /* -------------------------- Handlers --------------------------- */
  const handleSelectView = (viewId: string) => {
    const view = views.find((v) => v.id === viewId);
    if (!view) return;
    applyView({ id: view.id, config: view.config });
  };

  const handleClearView = () => {
    resetViewConfig();
    setActiveCell(null);
  };

  return (
    <div className="flex items-center gap-4 border-b bg-gray-50 px-3 py-2">
      {/* -------------------- Active View Selector -------------------- */}
      <select
        value={activeViewId ?? ""}
        onChange={(e) => handleSelectView(e.target.value)}
        className="rounded border px-2 py-1 text-sm truncate w-[22%]"
      >
        <option value="" disabled>
          Select view
        </option>

        {views.map((v) => (
          <option key={v.id} value={v.id}>
            {v.id === defaultView?.id ? "★" : ""} {v.name}
          </option>
        ))}
      </select>

      {/* ---------------- Unsaved Changes Indicator ---------------- */}
      {isViewDirty && (
        <span className="text-xs font-medium text-orange-500">
          You have unsaved changes
        </span>
      )}

      {/* ---------------- Clear Configuration ---------------- */}
      <button
        onClick={handleClearView}
        className="ml-auto rounded bg-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-300"
      >
        Clear View Configuration
      </button>

      {/* ---------------- Set Default ---------------- */}
      {activeViewId && activeViewId !== defaultView?.id && (
        <button
          onClick={() =>
            handleSetDefaultView({ id: activeViewId, config: null })
          }
          className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300"
        >
          Set Default
        </button>
      )}

      {/* ---------------- Global Search ---------------- */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Global Search:</label>
        <input
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search"
          className="w-52 rounded border px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
