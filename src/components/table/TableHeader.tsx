"use client";

import { useCallback } from "react";
import { flexRender } from "@tanstack/react-table";
import { useTableController } from "@/components/table/controller/TableProvider";

export function TableHeader() {
  const { table, handleAddColumn, handleDeleteColumn, handleRenameColumn, headerHeight, setHeaderHeight } = useTableController();
  const headerGroups = table.getHeaderGroups();

  // -----------------------------
  // Vertical Resize Logic
  // -----------------------------
  const startVerticalResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = headerHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      setHeaderHeight(Math.max(32, startHeight + delta));
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [headerHeight, setHeaderHeight]);

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleHeaderDoubleClick = useCallback((columnId: string) => {
    const newLabel = prompt("Enter new column name:");
    if (newLabel) handleRenameColumn(columnId, newLabel);
  }, [handleRenameColumn]);

  const handleHeaderRightClick = useCallback((e: React.MouseEvent, columnId: string, label: string) => {
    e.preventDefault();
    if (window.confirm(`Delete column "${label}"?\n\nThis will remove all its cell values.`)) {
      handleDeleteColumn(columnId);
    }
  }, [handleDeleteColumn]);

  const hasColumns = headerGroups.some(group => group.headers.length > 0);

  return (
    <thead className="border-b bg-gray-50">
      {hasColumns ? (
        headerGroups.map(group => (
          <tr key={group.id} style={{ height: headerHeight }}>
            {group.headers.map(header => {
              const columnId = header.column.id;
              const isSorted = header.column.getIsSorted();
              const isFiltered = header.column.getIsFiltered();

              return (
                <th
                  key={header.id}
                  style={{ width: header.getSize(), height: headerHeight, position: 'relative' }}
                  className={`px-4 py-2 text-left font-semibold select-none border-r last:border-r-0 ${
                    isSorted ? "bg-blue-50" : ""
                  }`}
                  onDoubleClick={() => handleHeaderDoubleClick(columnId)}
                  onContextMenu={(e) => handleHeaderRightClick(e, columnId, String(header.column.columnDef.header))}
                >
                  {!header.isPlaceholder && (
                    <>
                      {/* Header Content Wrapper */}
                      <div className="flex items-center justify-between h-full w-full pr-4">
                        <span
                          className="cursor-pointer hover:underline flex items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap"
                          onClick={(e) => {
                            // 1. Get the latest handler directly from the table instance
                            const handler = table.getColumn(columnId)?.getToggleSortingHandler();
                            if (handler) handler(e);
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          
                          {/* Sorting Icons */}
                          <span className="text-blue-600 font-bold">
                            {isSorted === "asc" ? " ↑" : isSorted === "desc" ? " ↓" : ""}
                          </span>
                        </span>

                        {/* Filter Indicator/Button */}
                        <button
                          className={`text-xs transition-colors ${
                            isFiltered ? "text-blue-600" : "text-gray-300 hover:text-gray-600"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Toggle a dummy filter or open a menu
                            const nextValue = isFiltered ? undefined : "1";
                            header.column.setFilterValue(nextValue);
                          }}
                        >
                          {isFiltered ? "●" : "○"}
                        </button>
                      </div>

                      {/* Horizontal resize handle */}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-1 cursor-col-resize z-10 hover:bg-blue-400 transition-colors ${
                            header.column.getIsResizing() ? "bg-blue-600 w-px" : "bg-transparent"
                          }`}
                        />
                      )}

                      {/* Vertical resize handle */}
                      <div
                        onMouseDown={startVerticalResize}
                        className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-blue-400 transition-colors z-10"
                      />
                    </>
                  )}
                </th>
              );
            })}

            {/* Final 'Add Column' Header Cell */}
            <th className="bg-gray-50 border-l p-0 text-center" style={{ width: 50 }}>
              <button
                onClick={handleAddColumn}
                className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded hover:bg-green-600 transition shadow-sm text-lg leading-none"
              >
                +
              </button>
            </th>
          </tr>
        ))
      ) : (
        <tr style={{ height: headerHeight }}>
           <th colSpan={100} className="px-4 py-2 text-center text-gray-400 font-normal">
            No columns yet. Click &quot;+&quot; to start.
            <button
                onClick={handleAddColumn}
                className="ml-4 inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded hover:bg-green-600 transition"
              >
                +
              </button>
          </th>
        </tr>
      )}
    </thead>
  );
}