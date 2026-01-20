"use client";

import { useCallback } from "react";
import { flexRender, type Header } from "@tanstack/react-table";
import { TEST_TABLE_ID, useTableController } from "@/components/table/controller/TableProvider";
import { type ColumnType, type TableRow, COLUMN_CONFIG } from "./controller/tableTypes";

export function TableHeader() {
  const { table, columns, handleAddColumn, handleDeleteColumn, handleRenameColumn, headerHeight, setHeaderHeight, isNumericalValue } = useTableController();
  const headerGroups = table.getHeaderGroups();

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

  const onAddColumnClick = useCallback(() => {
    const name = prompt("Enter column name:", `Column ${columns.length + 1}`);
    if (!name) return;
    const typeInput = prompt("Enter column type (text, number) [default is text]:", "text");
    if (typeInput === null) return;
    const type: ColumnType = typeInput.toLowerCase().trim() === "number" ? "number" : "text";
    handleAddColumn(columns.length + 1, TEST_TABLE_ID, name, type);
  }, [columns.length, handleAddColumn]);

  const onFilterColumnClick = useCallback((header: Header<TableRow, unknown>, columnType: string) => {
    let filterVal = prompt("Set a filter value for this column (Leave blank to clear the filter): ");
    // null here means cancel prompt
    if(filterVal === null) return;
    // empty string case, use null to clear both text and number input
    else if (filterVal === "") filterVal = null;
    // Check filter if column type is number
    if (columnType === "number" && filterVal) {
      if(!isNumericalValue(filterVal)){
        alert("Text is not a valid filter value for a number type column");
        return;
      }
    }
    header.column.setFilterValue(filterVal);
  }, [isNumericalValue]);

  const hasColumns = headerGroups.some(group => group.headers.length > 0);

  return (
    <thead className="border-b bg-gray-50 uppercase text-[11px] tracking-wider text-gray-500">
      {hasColumns ? (
        headerGroups.map(group => (
          <tr key={group.id} style={{ height: headerHeight }}>
            {group.headers.map(header => {
              const columnId = header.column.id;
              const isSorted = header.column.getIsSorted();
              const isFiltered = header.column.getIsFiltered();
              
              // Correctly typed metadata extraction
              const meta = header.column.columnDef.meta as { columnType?: ColumnType };
              const type = meta?.columnType ?? "text";
              const config = COLUMN_CONFIG[type];

              return (
                <th
                  key={header.id}
                  style={{ width: header.getSize(), height: headerHeight, position: 'relative' }}
                  className={`px-3 py-2 font-medium select-none border-r last:border-r-0 transition-colors ${
                    isSorted ? "bg-blue-50/50" : ""
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (window.confirm(`Delete column?`)) handleDeleteColumn(columnId, TEST_TABLE_ID);
                  }}
                >
                  {!header.isPlaceholder && (
                    <div className={`flex items-center w-full h-full gap-2 flex-row`}>
                      
                      {/* 1. Icon & Label Wrapper */}
                      <div 
                        className={`flex items-center gap-1.5 overflow-hidden cursor-pointer hover:text-gray-900 transition-colors flex-grow flex-row w-[80%]}`}
                      >
                        <span className="text-gray-400 font-mono text-[10px] w-4 flex-shrink-0 text-center">
                          {config.icon}
                        </span>
                        <span className="truncate"
                          onClick={(e) => {e.stopPropagation();}}
                          onDoubleClick={() => {
                            const newLabel = prompt("Enter new column name:");
                            if (newLabel && newLabel.trim() !== "") handleRenameColumn(columnId, newLabel.trim(), TEST_TABLE_ID);
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                      </div>

                      {/* 2. Filter Button (Always on the "inside" of the cell) */}
                      <div className="flex flex-row items-center text-[16px] flex-shrink-0 transition-opacity">
                          <span
                          className={`px-1 flex-shrink-0 transition-opacity ${
                            isSorted
                              ? "text-blue-500 font-bold opacity-100"
                              : "text-gray-400 opacity-100"
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {isSorted === "asc" ? "↑" : (isSorted === "desc" ? "↓" : "↕")}
                        </span>
                        <button
                          className={`px-1 ${
                            isFiltered ? "opacity-100 text-blue-600" : "text-gray-500"
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

                  {/* Resizers */}
                  <div onMouseDown={header.getResizeHandler()} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 z-20" />
                  <div onMouseDown={startVerticalResize} className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-blue-400 z-20" />
                </th>
              );
            })}

            {/* Final 'Add Column' Header Cell */}
            <th className="bg-gray-50 border-l p-0 text-center" style={{ width: 50 }}>
              <button
                onClick={onAddColumnClick}
                className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded hover:bg-green-600 transition shadow-sm text-lg leading-none"
              >
                +
              </button>
            </th>
          </tr>
        ))
      ) : null}
    </thead>
  );
}