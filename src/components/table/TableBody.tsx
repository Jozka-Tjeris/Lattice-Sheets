import React, { useCallback } from "react";
import { flexRender } from "@tanstack/react-table";
import { useTableStructureController } from "@/components/table/controller/TableProvider";

export function TableBody() {
  const { table, rows, columns, handleAddRow, handleDeleteRow, ROW_HEIGHT, DEFAULT_COL_WIDTH, activeCell, rowVirtualizer } =
    useTableStructureController();

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
    if (col.internalId === "__row_index__") return;
    if (table.getColumn(col.internalId ?? col.id)?.getIsPinned()) {
      leftOffsetMap[col.internalId ?? col.id] = cumulativeLeft;
      cumulativeLeft += col.width ?? DEFAULT_COL_WIDTH; // fallback to default width
    }
  });

  const headerGroups = table.getHeaderGroups();
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // -----------------------------
  // Render TanStack Row Model
  // -----------------------------
  return (
    <tbody>
      {/* Top spacer */}
      <tr style={{ height: virtualRows[0]?.start ?? 0 }}>
        <td colSpan={columns.length} />
      </tr>
      
      {virtualRows.map((virtualRow) => {
        const row = table.getRowModel().rows[virtualRow.index]!;
        const idx = virtualRow.index;

        return (
          <tr
            key={row.id}
            onContextMenu={(e) => {
              handleRowRightClick(e, row.id, idx + 1);
            }}
          >
            {row.getVisibleCells().map((cell) => {
              if(cell.column.columnDef.id === "__row_index__"){
                return (
                  <td
                    key={cell.id}
                    className="flex h-full border-r border-b p-0 align-top bg-gray-100 font-mono text-sm justify-center items-center"
                    style={{
                      width: cell.column.getSize(),
                      height: ROW_HEIGHT,
                      position: "sticky",
                      left: 0,
                      zIndex: 20,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              }
              const isActive =
                activeCell?.rowId === row.id &&
                activeCell?.columnId === cell.column.id;

              const zIdxVal = (isActive ? 5 : 0) + (cell.column.getIsPinned() ? 20 : 0);

              return (
                <td
                  key={cell.id}
                  className="h-full border-r border-b p-0 align-top"
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
              );
            })}
            <td className="h-full border-b" />
          </tr>
        );
      })}

      {/* Bottom spacer */}
      <tr style={{ height: totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) }}>
        <td colSpan={columns.length} />
      </tr>
      <tr>
        {/* Filler cells for padding */}
        {headerGroups[0]?.headers.map((header, idx) => {
          if(header.column.columnDef.id === "__row_index__"){
            return (
              <td 
                key={idx}
                className="text-center text-xs transition-colors bg-gray-100 border-r"
                style={{
                  width: header.column.getSize(),
                  height: ROW_HEIGHT,
                  position: "sticky",
                  left: 0,
                  zIndex: 20,
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
            )
          }
          return (
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
        )})}
      </tr>
    </tbody>
  );
}
