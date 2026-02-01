"use client";

import { useEffect, useState } from "react";
import { LeftBar } from "./LeftBar";
import { TopBar } from "./TopBar";
import { TableSelectionBar } from "./TableSelectionBar";
import { GridViewBar } from "./GridViewBar";
import { ViewSelectorBar } from "./ViewSelectorBar";
import { TableProvider } from "~/components/table/controller/TableProvider";
import { api as trpc } from "~/trpc/react";
import type {
  CellMap,
  ColumnType,
} from "~/components/table/controller/tableTypes";
import { ContentRetriever } from "./ContentRetriever";

interface BasePageShellProps {
  baseId: string;
}

export function BasePageShell({ baseId }: BasePageShellProps) {
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [creatingTable, setCreatingTable] = useState(false);
  const utils = trpc.useUtils();

  const tablesQuery = trpc.table.listTablesByBaseId.useQuery({ baseId });
  const hasTables = !!tablesQuery.data && tablesQuery.data.length > 0;

  // Sync activeTableId with query results
  useEffect(() => {
    if (!activeTableId && tablesQuery.data?.length) {
      const saved = localStorage.getItem(`base:${baseId}:activeTable`);
      const exists = tablesQuery.data.find(t => t.id === saved);
      setActiveTableId(exists ? saved : tablesQuery.data[0]!.id);
    }
  }, [tablesQuery.data, activeTableId, baseId]);

  useEffect(() => {
    if (activeTableId && !activeTableId.startsWith("optimistic-")) {
      localStorage.setItem(`base:${baseId}:activeTable`, activeTableId);
    }
  }, [activeTableId, baseId]);

  // -----------------------
  // Data Queries
  // -----------------------
  const rowsQuery = trpc.row.getRows.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: hasTables && !!activeTableId && !creatingTable },
  );

  const columnsQuery = trpc.column.getColumns.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: hasTables && !!activeTableId && !creatingTable },
  );

  const cellsQuery = trpc.cell.getCells.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: hasTables && !!activeTableId && !creatingTable },
  );

  // -----------------------
  // Mutations
  // -----------------------

  const createTableMutation = trpc.table.createTable.useMutation({
    onMutate: async ({ name }) => {
      setCreatingTable(true);
      await utils.table.listTablesByBaseId.cancel({ baseId });

      const previousTables = utils.table.listTablesByBaseId.getData({ baseId }) ?? [];
      const optimisticId = `optimistic-table-${crypto.randomUUID()}`;

      const optimisticTable = {
        id: optimisticId,
        baseId,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        optimistic: true,
      };

      utils.table.listTablesByBaseId.setData({ baseId }, [...previousTables, optimisticTable]);
      setActiveTableId(optimisticId);

      return { previousTables, optimisticId };
    },
    onSuccess: (data, _vars, ctx) => {
      if (!ctx) return;
      // 'data' is the 'result' returned from the router (the actual Table object)
      utils.table.listTablesByBaseId.setData({ baseId }, (tables = []) =>
        tables.map((t) => (t.id === ctx.optimisticId ? data.result : t))
      );
      setActiveTableId(data.result.id);
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousTables) {
        utils.table.listTablesByBaseId.setData({ baseId }, ctx.previousTables);
        setActiveTableId(ctx.previousTables.at(-1)?.id ?? null);
      }
    },
    onSettled: () => {
      setCreatingTable(false);
      void utils.table.listTablesByBaseId.invalidate({ baseId });
    },
  });

  const renameTableMutation = trpc.table.renameTable.useMutation({
    onMutate: async ({ tableId, name }) => {
      await utils.table.listTablesByBaseId.cancel({ baseId });
      const previousTables = utils.table.listTablesByBaseId.getData({ baseId }) ?? [];

      utils.table.listTablesByBaseId.setData({ baseId }, (old) =>
        old?.map((t) => (t.id === tableId ? { ...t, name } : t))
      );
      return { previousTables };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousTables) utils.table.listTablesByBaseId.setData({ baseId }, ctx.previousTables);
    },
    onSettled: () => {
      void utils.table.listTablesByBaseId.invalidate({ baseId });
    },
  });

  const deleteTableMutation = trpc.table.deleteTable.useMutation({
    onMutate: async ({ tableId }) => {
      await utils.table.listTablesByBaseId.cancel({ baseId });
      const previousTables = utils.table.listTablesByBaseId.getData({ baseId }) ?? [];
      const filtered = previousTables.filter((t) => t.id !== tableId);

      utils.table.listTablesByBaseId.setData({ baseId }, filtered);

      if (activeTableId === tableId) {
        setActiveTableId(filtered[0]?.id ?? null);
      }
      return { previousTables };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousTables) utils.table.listTablesByBaseId.setData({ baseId }, ctx.previousTables);
    },
    onSettled: () => {
      void utils.table.listTablesByBaseId.invalidate({ baseId });
    },
  });

  // -----------------------
  // Event Handlers
  // -----------------------
  const handleCreateTable = () => {
    const name = prompt("Enter the new table name:", "New Table");
    if(!name) return;
    if(name?.trim() === ""){
      alert("New table name cannot be empty");
      return;
    }
    createTableMutation.mutate({ baseId, name: name.trim() });
  };

  const handleRenameTable = (tableId: string) => {
    const name = prompt("Enter the new table name:");
    if (!name?.trim()){
      alert("New table name cannot be empty");
      return;
    }
    renameTableMutation.mutate({ tableId, name: name.trim() });
  };

  const handleDeleteTable = (tableId: string) => {
    if (confirm("Are you sure you want to delete this table?")) {
      deleteTableMutation.mutate({ tableId });
    }
  };

  // -----------------------
  // Transform State for Provider
  // -----------------------
  const initialRows = rowsQuery.data?.rows.map((row, index) => ({
    id: row.id,
    order: index + 1,
  })) ?? [];

  const initialCells = cellsQuery.data?.cells as CellMap ?? {};

  const initialColumns = columnsQuery.data?.columns.map((col, index) => ({
    id: col.id,
    label: col.name,
    order: index + 1,
    columnType: col.columnType as ColumnType,
  })) ?? [];

  const allowCreateTable = tablesQuery.isLoading 
    // If no active table id, means no tables available
    // Otherwise load if still optimistic
    || (activeTableId ? activeTableId.startsWith("optimistic-") : false)
    // Also disable if any non-table query is still loading
    || rowsQuery.isLoading || columnsQuery.isLoading || cellsQuery.isLoading;

  return (
    <TableProvider
      key={activeTableId} // Remounts provider when table changes
      tableId={activeTableId ?? ""}
      initialRows={initialRows}
      initialColumns={initialColumns}
      initialCells={initialCells}
      initialGlobalSearch={""}
    >
      <div className="flex h-screen w-full flex-row overflow-hidden">
        <LeftBar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TopBar baseId={baseId} />
          <TableSelectionBar
            tables={tablesQuery.data ?? []}
            activeTableId={activeTableId}
            onTableSelect={setActiveTableId}
            onCreateTable={handleCreateTable}
            onRenameTable={handleRenameTable}
            creatingTable={creatingTable}
            loadingTable={allowCreateTable}
            onDeleteTable={handleDeleteTable}
          />
          <GridViewBar tableId={activeTableId ?? ""} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-row">
            <ViewSelectorBar tableId={activeTableId ?? ""}/>
            <main className="min-h-0 min-w-0 flex-1">
              <ContentRetriever
                hasTables={hasTables}
                tablesLoading={allowCreateTable}
                tablesError={tablesQuery.error?.message}
                rowsLoading={rowsQuery.isLoading}
                columnsLoading={columnsQuery.isLoading}
                rowsError={rowsQuery.isError}
                columnsError={columnsQuery.isError}
                creatingTable={creatingTable}
                onCreateTable={handleCreateTable}
              />
            </main>
          </div>
        </div>
      </div>
    </TableProvider>
  );
}
