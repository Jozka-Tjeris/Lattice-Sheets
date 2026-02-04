"use client";

import { useCallback } from "react";
import { flexRender, type Header, type SortDirection } from "@tanstack/react-table";
import { useTableStructureController } from "@/components/table/controller/TableProvider";
import {
  type ColumnType,
  type TableRow,
  COLUMN_CONFIG,
} from "./controller/tableTypes";
import { INDEX_COL_ID } from "~/constants/table";
import Image from "next/image";

interface TableHeaderContentProps{
  isFiltered: boolean;
  isSorted: false | SortDirection;
  isPinned: false | 'left' | 'right';
  actualId: string;
  type: ColumnType;
  header: Header<TableRow, unknown>;
  configIcon: string;
}

function TableHeaderContent({ isFiltered, isSorted, isPinned, actualId, type, header, configIcon}: TableHeaderContentProps){
  const { handleRenameColumn, isNumericalValue } = useTableStructureController();

  const onFilterColumnClick = useCallback(
    (header: Header<TableRow, unknown>, columnType: string) => {
      const currFilterVal = header.column.getFilterValue() as string;
      let filterVal = prompt(
        "Set a filter value for this column (Leave blank to clear the filter): ", currFilterVal,
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
    <div className="flex h-full w-full flex-row items-center gap-2">
      <div className="w-[80%] flex flex-grow cursor-pointer flex-row items-center gap-1.5 overflow-hidden transition-colors hover:text-gray-900">
        <span className="w-4 flex-shrink-0 text-center font-mono text-[10px] text-gray-400">
          {configIcon}
        </span>
        <span
          className="truncate"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => handleRenameColumn(actualId)}
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
        {/* Pin Icon */}
        <button
          className={`px-1 ${
            isPinned ? "text-blue-500 opacity-100" : "text-gray-400"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if(!isPinned) header.column.pin('left');
            else header.column.pin(false);
          }}
        >
          {isPinned ? 
          <Image src="/assets/unpin.png" alt="unpin" width="16" height="16"/>
          : 
          <Image src="/assets/pin.png" alt="pin" width="16" height="16"/>
          }
        </button>
      </div>
    </div>
  );
}

export function TableHeader() {
  const {
    table,
    columns,
    handleAddColumn,
    handleDeleteColumn,
    headerHeight,
    startVerticalResize,
    getPinnedLeftStyle
  } = useTableStructureController();

  const headerGroups = table.getHeaderGroups();

  return (
    <thead className="bg-gray-50 text-[11px] tracking-wider text-gray-500 uppercase">
      {columns.length > 0 ? (
        headerGroups.map((group) => (
          <tr key={group.id} style={{ height: headerHeight }}>
            {group.headers.map((header) => {
              const isRowIndex = header.id === INDEX_COL_ID; // detect row index column

              if (isRowIndex) {
                return (
                  <th
                    key={header.id}
                    style={{
                      width: header.column.columnDef.size,
                      minWidth: header.column.columnDef.minSize,
                      maxWidth: header.column.columnDef.maxSize,
                      height: headerHeight,
                      top: 0,
                      zIndex: 40,
                      ...getPinnedLeftStyle(header.column.columnDef.id!)
                    }}
                    className="border-r border-b bg-gray-200 px-3 py-2 font-medium text-center text-gray-500 select-none"
                  >
                    #
                  </th>
                );
              }

              const isSorted = header.column.getIsSorted();
              const isFiltered = header.column.getIsFiltered();
              const isPinned = header.column.getIsPinned();

              const meta = header.column.columnDef.meta as {
                columnType: ColumnType;
                dbId: string;
              };
              const type = meta?.columnType ?? "text";
              const actualId = meta?.dbId;
              const config = COLUMN_CONFIG[type];

              return (
                <th
                  key={header.id}
                  style={header.column.getIsPinned() ? {
                    width: header.getSize(),
                    //Add min and max width to prevent shrinking and stretching respectively
                    minWidth: header.column.columnDef.minSize,
                    maxWidth: header.column.columnDef.maxSize,
                    height: headerHeight,
                    top: 0,
                    zIndex: 40,
                    ...getPinnedLeftStyle(header.column.columnDef.id!),
                  } : {
                    width: header.getSize(),
                    //Add min and max width to prevent shrinking and stretching respectively
                    minWidth: header.column.columnDef.minSize,
                    maxWidth: header.column.columnDef.maxSize,
                    height: headerHeight,
                    position: "sticky",
                    top: 0,
                    zIndex: 30,
                  }}
                  className={`border-r border-b px-3 py-2 font-medium transition-colors select-none last:border-r-0 border-gray-300 ${
                    isSorted ? "bg-blue-50" : "bg-gray-100"
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleDeleteColumn(actualId);
                  }}
                >
                  {!header.isPlaceholder && (
                    <TableHeaderContent 
                      isFiltered={isFiltered}
                      isSorted={isSorted}
                      isPinned={isPinned}
                      actualId={actualId}
                      type={type}
                      header={header}
                      configIcon={config.icon}
                    />
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
              className="border-b bg-gray-100 border-gray-300 p-0 text-center"
              style={{ 
                width: 50,
                position: "sticky",
                top: 0,
                zIndex: 30,
              }}
            >
              <button
                onClick={() => handleAddColumn()}
                className="inline-flex h-6 w-6 items-center justify-center rounded bg-green-500 text-lg leading-none text-white shadow-sm transition hover:bg-green-600"
              >
                +
              </button>
            </th>
          </tr>
        ))
      ) : (
        // No columns — single row with centered Add Column button
        <tr>
          {/* Don't add flex to th and keep height in th, otherwise it introduces fractional pixels */}
          <th
            colSpan={1} // could span more if you want full width dynamically
            className="w-90"
            style={{ height: headerHeight }}
          >
            <div className="flex h-full w-full flex-row items-center border-b border-gray-300">
              <span className="flex-1 pl-2 pr-2 text-gray-500">
                No columns yet — add one to display rows
              </span>
              <div className="flex items-center pr-4">
                <button
                  onClick={() => handleAddColumn()}
                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-green-500 text-lg leading-none text-white shadow-sm transition hover:bg-green-600"
                >
                  +
                </button>
              </div>
            </div>
          </th>
        </tr>
      )}
    </thead>
  );
}
