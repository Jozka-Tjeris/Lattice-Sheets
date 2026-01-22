"use client";

import { memo } from "react";
import { useTableController } from "@/components/table/controller/TableProvider";

interface StickyProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const StickyColumnsBar = memo(function StickyColumnsBar({
  scrollRef,
}: StickyProps) {
  const { table, headerHeight, columns, rows, startVerticalResize, handleAddRow, ROW_HEIGHT } = useTableController();
  const hasColumns = columns.length > 0;

  // Rows exactly as rendered in the main table
  const sortedRows = table.getRowModel().rows;

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar w-[60px] flex-none overflow-y-hidden border-r border-gray-300 bg-gray-50"
      style={{ height: "100%" }}
    >
      <table
        className="w-full border-collapse table-fixed"
        style={{ width: "100%" }}
      >
        {/* Header spacer */}
        <thead>
          <tr>
            <th
              style={{
                height: headerHeight,
                boxSizing: "border-box",
                position: "sticky",
                top: 0,
                zIndex: 30,
                background: "#e0e0e0",
                boxShadow: "inset 0 -1px 0 0 #d1d5db"
              }}
              className="bg-gray-100"
            >
              <div
                onMouseDown={startVerticalResize}
                className="absolute bottom-0 left-0 z-20 h-1 w-full cursor-row-resize hover:bg-blue-400"
              />
            </th>
          </tr>
        </thead>

        <tbody>
          {/* Rows */}
          {hasColumns && sortedRows.map((row) => (
            <tr key={row.id}>
              <td
                className={`border-b text-center text-xs transition-colors ${
                  hasColumns
                    ? "bg-gray-50"
                    : "bg-gray-100 text-gray-400 italic"
                }`}
                style={{
                  height: ROW_HEIGHT,
                  boxSizing: "border-box",
                }}
              >
                {row.index + 1}
              </td>
            </tr>
          ))}
          <tr>
            <td 
              className="text-center text-xs transition-colors bg-gray-50"
              style={{
                height: ROW_HEIGHT,
                boxSizing: "border-box",
              }}
            >
              <button
                onClick={() => {handleAddRow(rows.length + 1)}}
                disabled={!hasColumns}
                className={`inline-flex h-6 w-6 items-center justify-center rounded text-lg leading-none text-white shadow-sm transition 
                  ${hasColumns ? 
                    "bg-green-500 hover:bg-green-600" 
                    : "bg-gray-400 hover:bg-gray-500"}
                  `}
              >
                +
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});
