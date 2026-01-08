import React, { useCallback } from "react";
import { flexRender } from "@tanstack/react-table";
import { TEST_TABLE_ID, useTableController } from "@/components/table/controller/TableProvider";
import type { TableRow } from "./controller/tableTypes";

/**
 * Notice: We've removed registerRef and activeCell from props 
 * as they are now managed via the table instance or Context.
 */
export function TableBody() {
  const { 
    table, 
    rows, 
    columns, 
    handleAddRow, 
    handleDeleteRow 
  } = useTableController();

  const handleRowRightClick = useCallback(
    (e: React.MouseEvent, rowId: string, rowOrder: number) => {
      e.preventDefault();
      // Use e.stopPropagation to prevent triggering any cell selection logic
      e.stopPropagation();

      const confirmed = window.confirm(
        `Delete row "${rowOrder + 1}"?\n\nThis will remove all its cell values.`
      );

      if (confirmed) {
        handleDeleteRow(rowId);
      }
    },
    [handleDeleteRow]
  );

  // -----------------------------
  // Empty State logic
  // -----------------------------
  if (rows.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length || 1} className="px-4 py-2 text-center text-gray-500">
            No rows to display
          </td>
        </tr>
        {columns.length > 0 && (
          <tr className="bg-gray-50">
            <td colSpan={columns.length || 1} className="px-4 py-2 text-center">
              <button
                onClick={() => handleAddRow(rows.length + 1, TEST_TABLE_ID)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
              >
                + Add Row
              </button>
            </td>
          </tr>
        )}
      </tbody>
    );
  }

  // -----------------------------
  // Render TanStack Row Model
  // -----------------------------
  return (
    <tbody>
      {table.getRowModel().rows.map((row) => (
        <tr
          key={row.id}
          className="border-b last:border-0 hover:bg-[#f0f0f0] h-10"
          onContextMenu={(e) => {const rowOriginal = row.original as TableRow;
            e.preventDefault();
            e.stopPropagation();
            handleRowRightClick(e, rowOriginal.id, rowOriginal.order)}}
        >
          {row.getVisibleCells().map((cell) => (
            <td 
              key={cell.id} 
              className="border-r p-0 align-top"
              style={{ width: cell.column.getSize() }}
            >
              {/* This is where the magic happens. flexRender calls the 
                  cell renderer defined in your TableProvider.
              */}
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))}

      {/* Footer Add Row button */}
      <tr className="bg-gray-50">
        <td colSpan={columns.length || 1} className="px-4 py-2 text-center">
          <button
            onClick={() => handleAddRow(rows.length + 1, TEST_TABLE_ID)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            + Add Row
          </button>
        </td>
      </tr>
    </tbody>
  );
}