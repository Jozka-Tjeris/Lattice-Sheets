import React, { useCallback } from "react";
import { flexRender } from "@tanstack/react-table";
import { useTableController } from "@/components/table/controller/TableProvider";

/**
 * Notice: We've removed registerRef and activeCell from props
 * as they are now managed via the table instance or Context.
 */
export function TableBody() {
  const { table, rows, columns, handleDeleteRow, ROW_HEIGHT, activeCell } =
    useTableController();

  const hasRows = rows.length > 0;
  const hasColumns = columns.length > 0;

  const handleRowRightClick = useCallback(
    (e: React.MouseEvent, rowId: string, rowPosition: number) => {
      e.preventDefault();
      // Use e.stopPropagation to prevent triggering any cell selection logic
      e.stopPropagation();

      const confirmed = window.confirm(
        `Delete row "${rowPosition}"?\n\nThis will remove all its cell values.`,
      );

      if (confirmed) {
        handleDeleteRow(rowId);
      }
    },
    [handleDeleteRow],
  );

  // -----------------------------
  // Empty State logic
  // -----------------------------
  if (!hasRows && !hasColumns) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={Math.max(columns.length, 1)}
            className="italic px-4 text-center text-gray-500"
            style={{ height: ROW_HEIGHT, minHeight: ROW_HEIGHT }}
          >
            No rows to display
          </td>
        </tr>
      </tbody>
    );
  }

  if (hasRows && !hasColumns) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={1}
            className="text-center text-gray-500 italic align-middle"
            style={{ height: 2*ROW_HEIGHT }}
          >
            <div className="flex h-full items-center justify-center">
              {rows.length} row{rows.length > 1 ? "s" : ""} hidden.
              <br />
              Add a column to view data.
            </div>
          </td>
        </tr>
      </tbody>
    );
  }

  const leftOffsetMap: Record<string, number> = {};
  let cumulativeLeft = 0;
  columns.forEach(col => {
    if (table.getColumn(col.internalId ?? col.id)?.getIsPinned()) {
      leftOffsetMap[col.internalId ?? col.id] = cumulativeLeft;
      cumulativeLeft += col.width ?? 180; // fallback to default width
    }
  });

  const headerGroups = table.getHeaderGroups();

  // -----------------------------
  // Render TanStack Row Model
  // -----------------------------
  return (
    <tbody>
      {table.getRowModel().rows.map((row, idx) => (
        <tr
          key={row.id}
          onContextMenu={(e) => {
            const rowOriginal = row.original;
            e.preventDefault();
            e.stopPropagation();
            handleRowRightClick(e, rowOriginal.id, idx + 1);
          }}
        >
          {row.getVisibleCells().map((cell) => {
            const isActive = activeCell?.rowId === row.id && activeCell?.columnId === cell.column.id;
            // Active cell should be above regular cells but under pinned cells
            // Active pinned cell should be above other cells but under headers
            const zIdxVal = (isActive ? 5 : 0) + (cell.column.getIsPinned() ? 20 : 0);
            return (
              <td
                key={cell.id}
                className="h-full border-r border-b p-0 align-top"
                // Tailwind cannot generate dynamic classes, must use inline styles
                style={{ 
                  width: cell.column.getSize(),
                  height: ROW_HEIGHT,
                  position: cell.column.getIsPinned() ? "sticky" : "relative",
                  left: cell.column.getIsPinned() ? leftOffsetMap[cell.column.id] : undefined,
                  zIndex: zIdxVal,
                  background: cell.column.getIsPinned() ? "#fefefe" : undefined,
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            )
          })}
          {/* Filler cell for add column button */}
          <td className="h-full border-b"/>
        </tr>
      ))}
      <tr>
        {/* Filler cells for padding */}
        {headerGroups[0]?.headers.map((header, idx) => (
          <td key={idx} className="h-full border-r"
            style={{ 
              width: header.column.getSize(), 
              height: ROW_HEIGHT,
              position: header.column.getIsPinned() ? "sticky" : "relative",
              left: header.column.getIsPinned() ? leftOffsetMap[header.column.id] : undefined,
              zIndex: header.column.getIsPinned() ? 20 : 0,
              background: "#fefefe",
            }}
          />
        ))}
      </tr>
    </tbody>
  );
}
