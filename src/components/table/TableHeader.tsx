"use client";

import { useCallback } from "react";
import { flexRender, type Header } from "@tanstack/react-table";
import { useTableController } from "@/components/table/controller/TableProvider";
import {
  type ColumnType,
  type TableRow,
  COLUMN_CONFIG,
} from "./controller/tableTypes";

export function TableHeader() {
  const {
    table,
    columns,
    handleAddColumn,
    handleDeleteColumn,
    handleRenameColumn,
    headerHeight,
    setHeaderHeight,
    isNumericalValue,
  } = useTableController();

  const headerGroups = table.getHeaderGroups();

  const startVerticalResize = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [headerHeight, setHeaderHeight],
  );

  const onAddColumnClick = useCallback(() => {
    const name = prompt("Enter column name:", `Column ${columns.length + 1}`);
    if (!name) return;
    const typeInput = prompt(
      "Enter column type (text, number) [default is text]:",
      "text",
    );
    if (typeInput === null) return;
    const type: ColumnType =
      typeInput.toLowerCase().trim() === "number" ? "number" : "text";
    handleAddColumn(columns.length + 1, name, type);
  }, [columns.length, handleAddColumn]);

  const onFilterColumnClick = useCallback(
    (header: Header<TableRow, unknown>, columnType: string) => {
      let filterVal = prompt(
        "Set a filter value for this column (Leave blank to clear the filter): ",
      );
      if (filterVal === null) return;
      else if (filterVal === "") filterVal = null;
      if (columnType === "number" && filterVal && !isNumericalValue(filterVal)) {
        alert("Text is not a valid filter value for a number type column");
        return;
      }
      header.column.setFilterValue(filterVal);
    },
    [isNumericalValue],
  );

  return (
    <thead className="border-b bg-gray-50 text-[11px] tracking-wider text-gray-500 uppercase">
      {headerGroups.length > 0 ? (
        headerGroups.map((group) => (
          <tr key={group.id} style={{ height: headerHeight }}>
            {group.headers.map((header) => {
              const isSorted = header.column.getIsSorted();
              const isFiltered = header.column.getIsFiltered();

              const meta = header.column.columnDef.meta as {
                columnType: ColumnType;
                dbId: string;
              };
              const type = meta?.columnType;
              const actualId = meta?.dbId;
              const config = COLUMN_CONFIG[type];

              return (
                <th
                  key={header.id}
                  style={{
                    width: header.getSize(),
                    height: headerHeight,
                    position: "relative",
                  }}
                  className={`border-r px-3 py-2 font-medium transition-colors select-none last:border-r-0 ${
                    isSorted ? "bg-blue-50/50" : ""
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (window.confirm(`Delete column?`))
                      handleDeleteColumn(actualId);
                  }}
                >
                  {!header.isPlaceholder && (
                    <div className="flex h-full w-full flex-row items-center gap-2">
                      <div className="w-[80%] flex flex-grow cursor-pointer flex-row items-center gap-1.5 overflow-hidden transition-colors hover:text-gray-900">
                        <span className="w-4 flex-shrink-0 text-center font-mono text-[10px] text-gray-400">
                          {config.icon}
                        </span>
                        <span
                          className="truncate"
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={() => {
                            const newLabel = prompt("Enter new column name:");
                            if (newLabel && newLabel.trim() !== "")
                              handleRenameColumn(actualId, newLabel.trim());
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                      </div>
                      <div className="flex flex-shrink-0 flex-row items-center text-[16px] transition-opacity">
                        <span
                          className={`flex-shrink-0 px-1 transition-opacity ${
                            isSorted
                              ? "font-bold text-blue-500 opacity-100"
                              : "text-gray-400 opacity-100"
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {isSorted === "asc"
                            ? "↑"
                            : isSorted === "desc"
                              ? "↓"
                              : "↕"}
                        </span>
                        <button
                          className={`px-1 ${
                            isFiltered
                              ? "text-blue-600 opacity-100"
                              : "text-gray-500"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onFilterColumnClick(header, type);
                          }}
                        >
                          {isFiltered ? "●" : "○"}
                        </button>
                      </div>
                    </div>
                  )}
                  <div
                    onMouseDown={header.getResizeHandler()}
                    className="absolute top-0 right-0 z-20 h-full w-1 cursor-col-resize hover:bg-blue-400"
                  />
                  <div
                    onMouseDown={startVerticalResize}
                    className="absolute bottom-0 left-0 z-20 h-1 w-full cursor-row-resize hover:bg-blue-400"
                  />
                </th>
              );
            })}

            {/* Add Column Button */}
            <th
              className="border-l bg-gray-50 p-0 text-center"
              style={{ width: 50 }}
            >
              <button
                onClick={onAddColumnClick}
                className="inline-flex h-6 w-6 items-center justify-center rounded bg-green-500 text-lg leading-none text-white shadow-sm transition hover:bg-green-600"
              >
                +
              </button>
            </th>
          </tr>
        ))
      ) : (
        // No columns — single row with centered Add Column button
        <tr style={{ height: headerHeight }}>
          <th
            colSpan={1} // could span more if you want full width dynamically
            className="text-center py-4"
          >
            <button
              onClick={onAddColumnClick}
              className="inline-flex h-8 w-8 items-center justify-center rounded bg-green-500 text-lg leading-none text-white shadow-sm transition hover:bg-green-600"
            >
              +
            </button>
          </th>
        </tr>
      )}
    </thead>
  );
}
