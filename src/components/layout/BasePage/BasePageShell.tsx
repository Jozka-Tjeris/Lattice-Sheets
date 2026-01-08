"use client"

import { LeftBar } from "./LeftBar";
import { TopBar } from "./TopBar";
import { TableSelectionBar } from "./TableSelectionBar";
import { GridViewBar } from "./GridViewBar";
import { ViewSelectorBar } from "./ViewSelectorBar";
import { MainContent } from "./MainContent";
import { TableProvider, TEST_TABLE_ID } from "~/components/table/controller/TableProvider";
import { api as trpc } from "~/trpc/react";
import type { CellMap, ColumnType } from "~/components/table/controller/tableTypes";

export function BasePageShell() {
  const rowsQuery = trpc.table.getRowsWithCells.useQuery({ tableId: TEST_TABLE_ID });
  const columnsQuery = trpc.table.getColumns.useQuery({ tableId: TEST_TABLE_ID });

  if (rowsQuery.isLoading || columnsQuery.isLoading) {
    return <div>Loading table…</div>;
  }

  if (!rowsQuery.data || !columnsQuery.data) {
    return <div>Failed to load table</div>;
  }

  const backendCells = rowsQuery.data.cells;

  const initialRows = rowsQuery.data.rows.map((row, index) => ({
    id: row.id,
    order: index,
  }))

  const initialCells = backendCells as CellMap;

  const initialColumns = columnsQuery.data.columns.map((col) => ({
    id: col.id,
    label: col.name,
    type: col.type as ColumnType
  }))

  return <TableProvider
      initialRows={initialRows}
      initialColumns={initialColumns}
      initialCells={initialCells}
    >
      <div className="flex flex-row h-screen w-full overflow-hidden">
      <LeftBar />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <TopBar />
        <TableSelectionBar />
        <GridViewBar />
        <div className="flex flex-row flex-1 min-w-0 min-h-0">
          <ViewSelectorBar />
          <main className="flex-1 min-w-0 min-h-0">
              <MainContent/>
            </main>
        </div>
      </div>
    </div>
  </TableProvider>
}
