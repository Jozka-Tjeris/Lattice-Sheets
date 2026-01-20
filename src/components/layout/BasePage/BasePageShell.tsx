"use client";

import { useEffect, useState } from "react";
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
  // -----------------------
  // Tables
  // -----------------------
  const tablesQuery = trpc.table.listTablesByBaseId.useQuery({ baseId });
  const hasTables = !!tablesQuery.data && tablesQuery.data.length > 0;

  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [creatingTable, setCreatingTable] = useState(false);

  const utils = trpc.useUtils();

  // Auto-select first table when tables load
  useEffect(() => {
    if (!activeTableId && tablesQuery.data?.length) {
      setActiveTableId(tablesQuery.data[0]!.id);
    }
  }, [tablesQuery.data, activeTableId]);

  // Persist last active table state per base
  useEffect(() => {
    if (activeTableId) {
      localStorage.setItem(`base:${baseId}:activeTable`, activeTableId);
    }
  }, [activeTableId, baseId]);

  useEffect(() => {
    const saved = localStorage.getItem(`base:${baseId}:activeTable`);
    if (saved) {
      setActiveTableId(saved);
    }
  }, [baseId]);

  // Set active table to null if no tables are present
  useEffect(() => {
    if (!hasTables) setActiveTableId(null);
  }, [hasTables]);

  // -----------------------
  // Rows / Columns
  // -----------------------
  const rowsQuery = trpc.row.getRowsWithCells.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: hasTables && !!activeTableId && !creatingTable }
  );

  const columnsQuery = trpc.column.getColumns.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: hasTables && !!activeTableId && !creatingTable }
  );

  // -----------------------
  // Create table mutation
  // -----------------------

  const createTableMutation = trpc.table.createTable.useMutation({
    onMutate: async ({ name }) => {
      setCreatingTable(true);

      await utils.table.listTablesByBaseId.cancel({ baseId });
      await utils.row.getRowsWithCells.cancel({ tableId: activeTableId ?? "" });
      await utils.column.getColumns.cancel({ tableId: activeTableId ?? "" });

      const previousTables =
        utils.table.listTablesByBaseId.getData({ baseId }) ?? [];

      const optimisticId = `optimistic-table-${crypto.randomUUID()}`;

      const optimisticTable = {
        id: optimisticId,
        baseId,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        optimistic: true,
      };

      utils.table.listTablesByBaseId.setData(
        { baseId },
        [...previousTables, optimisticTable]
      );

      setActiveTableId(optimisticId);

      return { previousTables, optimisticId };
    },

    onSuccess: (table, _vars, ctx) => {
      if (!ctx) return;

      utils.table.listTablesByBaseId.setData(
        { baseId },
        (tables = []) =>
          tables.map(t =>
            t.id === ctx.optimisticId ? table : t
          )
      );

      setActiveTableId(table.id);
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;

      utils.table.listTablesByBaseId.setData(
        { baseId },
        ctx.previousTables
      );

      setActiveTableId(
        ctx.previousTables.at(-1)?.id ?? null
      );
    },

    onSettled: async () => {
      setCreatingTable(false);
      await utils.table.listTablesByBaseId.invalidate({ baseId });
      await utils.row.getRowsWithCells.cancel({ tableId: activeTableId ?? "" });
      await utils.column.getColumns.cancel({ tableId: activeTableId ?? "" });
    },
  });

  const renameTableMutation = trpc.table.renameTable.useMutation({
    // Optimistic update
    onMutate: async ({ tableId, name }) => {
      // Cancel any in-flight fetches for tables
      await utils.table.listTablesByBaseId.cancel({ baseId });

      // Snapshot previous tables for rollback
      const previousTables =
        utils.table.listTablesByBaseId.getData({ baseId }) ?? [];

      // Optimistically update table name
      utils.table.listTablesByBaseId.setData({ baseId }, (old) =>
        old?.map((t) =>
          t.id === tableId
            ? { ...t, name } // immutable update
            : t
        )
      );

      return { previousTables };
    },
    // Rollback on error
    onError: (_err, _vars, context) => {
      if (context?.previousTables) {
        utils.table.listTablesByBaseId.setData({ baseId }, context.previousTables);
      }
    },
    // Refresh authoritative data
    onSettled: async () => {
      // Only need to refresh the table list
      await utils.table.listTablesByBaseId.invalidate({ baseId });
    },
  });

  const deleteTableMutation = trpc.table.deleteTable.useMutation({
    // Optimistic update
    onMutate: async ({ tableId }) => {
      // Cancel any in-flight fetches
      await utils.table.listTablesByBaseId.cancel({ baseId });

      // Snapshot previous tables for rollback
      const previousTables =
        utils.table.listTablesByBaseId.getData({ baseId }) ?? [];

      // Optimistically remove the table from the list
      utils.table.listTablesByBaseId.setData({ baseId }, (old) =>
        old?.filter((t) => t.id !== tableId) ?? []
      );

      // If the deleted table was active, update active table to first remaining or null
      if (activeTableId === tableId) {
        setActiveTableId(previousTables?.[0]?.id ?? null);
      }

      return { previousTables };
    },
    // Rollback on error
    onError: (_err, _vars, context) => {
      if (context?.previousTables) {
        utils.table.listTablesByBaseId.setData({ baseId }, context.previousTables);
      }
    },
    // Refresh authoritative data after mutation
    onSettled: async () => {
      await utils.table.listTablesByBaseId.invalidate({ baseId });
    },
  });

  const handleCreateTable = () => {
    const newTableName = prompt("Enter the new table name:", "New Table");
    if(newTableName === null) return;
    if(newTableName.trim() === ""){
      alert("New table name cannot be blank");
      return;
    }
    createTableMutation.mutate({
      baseId,
      name: newTableName.trim(),
    });
  };

  const handleRenameTable = (tableId: string) => {
    const newTableName = prompt("Enter the new table name:");
    if(newTableName === null) return;
    if(newTableName.trim() === ""){
      alert("New table name cannot be blank");
      return;
    }
    renameTableMutation.mutate({
      tableId,
      name: newTableName.trim(),
    });
  };

  const handleDeleteTable = (tableId: string) => {
    if (confirm("Are you sure you want to delete this table?")) {
      deleteTableMutation.mutate({ tableId });
    }
  }

  // -----------------------
  // Initial table state
  // -----------------------
  const initialRows =
    hasTables && rowsQuery.data
      ? rowsQuery.data.rows.map((row, index) => ({
          id: row.id,
          order: index + 1,
        }))
      : [];

  const initialCells =
    hasTables && rowsQuery.data ? (rowsQuery.data.cells as CellMap) : {};

  const initialColumns =
    hasTables && columnsQuery.data
      ? columnsQuery.data.columns.map((col, index) => ({
          id: col.id,
          label: col.name,
          order: index + 1,
          columnType: col.columnType as ColumnType,
        }))
      : [];

  // -----------------------
  // Render
  // -----------------------
  return (
    <TableProvider
      key={activeTableId}
      tableId={activeTableId ?? ""}
      initialRows={initialRows}
      initialColumns={initialColumns}
      initialCells={initialCells}
    >
      <div className="flex flex-row h-screen w-full overflow-hidden">
        <LeftBar />

        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <TopBar 
            baseId={baseId}
          />

          <TableSelectionBar
            tables={tablesQuery.data ?? []}
            activeTableId={activeTableId}
            onTableSelect={setActiveTableId}
            onCreateTable={handleCreateTable}
            onRenameTable={handleRenameTable}
            creatingTable={creatingTable}
            onDeleteTable={handleDeleteTable}
          />

          <GridViewBar />

          <div className="flex flex-row flex-1 min-w-0 min-h-0">
            <ViewSelectorBar />

            <main className="flex-1 min-w-0 min-h-0">
              <ContentRetriever
                hasTables={hasTables}
                tablesLoading={tablesQuery.isLoading}
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