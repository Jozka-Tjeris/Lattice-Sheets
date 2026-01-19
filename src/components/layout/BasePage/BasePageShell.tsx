"use client";

import { LeftBar } from "./LeftBar";
import { TopBar } from "./TopBar";
import { TableSelectionBar } from "./TableSelectionBar";
import { GridViewBar } from "./GridViewBar";
import { ViewSelectorBar } from "./ViewSelectorBar";
import { TableProvider } from "~/components/table/controller/TableProvider";
import { api as trpc } from "~/trpc/react";
import type { CellMap, ColumnType } from "~/components/table/controller/tableTypes";
import { ContentRetriever } from "./ContentRetriever";

interface BasePageShellProps {
  baseId: string;
}

export function BasePageShell({ baseId }: BasePageShellProps) {
  const tablesQuery = trpc.table.listTablesByBaseId.useQuery({ baseId });

  const hasTables = !!tablesQuery.data && tablesQuery.data.length > 0;
  const tableId = tablesQuery.data?.[0]?.id;

  const rowsQuery = trpc.row.getRowsWithCells.useQuery(
    { tableId: tableId || "" },
    { enabled: !!tableId }
  );

  const columnsQuery = trpc.column.getColumns.useQuery(
    { tableId: tableId || "" },
    { enabled: !!tableId }
  );

  const initialRows = hasTables && rowsQuery.data
    ? rowsQuery.data.rows.map((row, index) => ({ id: row.id, order: index + 1 }))
    : [];

  const initialCells = hasTables && rowsQuery.data ? (rowsQuery.data.cells as CellMap) : {};

  const initialColumns = hasTables && columnsQuery.data
    ? columnsQuery.data.columns.map((col, index) => ({
        id: col.id,
        label: col.name,
        order: index + 1,
        columnType: col.columnType as ColumnType,
      }))
    : [];

  return <TableProvider
      initialRows={initialRows}
      initialColumns={initialColumns}
      initialCells={initialCells}
    >
      <div className="flex flex-row h-screen w-full overflow-hidden">
      <LeftBar />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <TopBar />
        <TableSelectionBar tables={tablesQuery.data || []} baseId={baseId} />
        <GridViewBar />
        <div className="flex flex-row flex-1 min-w-0 min-h-0">
          <ViewSelectorBar />
          <main className="flex-1 min-w-0 min-h-0">
            <ContentRetriever
              baseId={baseId}
              tablesQuery={tablesQuery}
              rowsQuery={rowsQuery}
              columnsQuery={columnsQuery}
              hasTables={hasTables}
            />
          </main>
        </div>
      </div>
    </div>
  </TableProvider>
}
