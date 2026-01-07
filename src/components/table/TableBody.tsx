import { flexRender } from "@tanstack/react-table";
import { useTableContext } from "./TableContext";
import type { TableRow } from "./mockTableData";
import { useCallback } from "react";

export function TableBody() {
  const { table, handleAddRow, handleDeleteRow } = useTableContext<TableRow>();
  const rows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();
  const hasColumns = headerGroups.some(group => group.headers.length > 0);

  const handleRowRightClick = useCallback(
    (e: React.MouseEvent, rowId: string, rowOrder: number) => {
      e.preventDefault();

      const confirmed = window.confirm(
        `Delete row "${rowOrder+1}"?\n\nThis will remove all its cell values.`
      );

      if (confirmed) {
        handleDeleteRow(rowId);
      }
    },
    [handleDeleteRow]
  );

  if (rows.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={table.getAllColumns().length || 1} className="px-4 py-2 text-center text-gray-500">
            No rows to display
          </td>
        </tr>
        {hasColumns ? (
            //Add row button
            <tr className="bg-gray-50">
              <td colSpan={table.getAllColumns().length || 1} className="px-4 py-2 text-center">
                <button
                  onClick={() => {
                    // handleAddRow comes from BaseTable
                    handleAddRow?.();
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                  + Add Row
                </button>
              </td>
            </tr>
          ) : (
            <></>
          )
        }
      </tbody>
    );
  }

  return (
    <tbody>
      {table.getRowModel().rows.map(row => (
        <tr key={row.id} className="border-b last:border-0 hover:bg-[#f0f0f0]"
          onContextMenu={(e) => handleRowRightClick(e, row.original.id, row.original.order)}>
          {row.getVisibleCells().map(cell => (
            <td key={cell.id} className="border-r p-0 align-top">
              {flexRender(
                cell.column.columnDef.cell,
                cell.getContext()
              )}
            </td>
          ))}
        </tr>
      ))}
      {/* Add Row Button */}
      <tr className="bg-gray-50">
        <td colSpan={table.getAllColumns().length || 1} className="px-4 py-2 text-center">
          <button
            onClick={() => {
              // handleAddRow comes from BaseTable
              handleAddRow?.();
            }}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            + Add Row
          </button>
        </td>
      </tr>
    </tbody>
  );
}
