"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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

  // -----------------------
  // Rows / Columns
  // -----------------------
  const rowsQuery = trpc.row.getRowsWithCells.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: !!activeTableId }
  );

  const columnsQuery = trpc.column.getColumns.useQuery(
    { tableId: activeTableId ?? "" },
    { enabled: !!activeTableId }
  );

  // -----------------------
  // Create table mutation
  // -----------------------
  const [creatingTable, setCreatingTable] = useState(false);

  const createTableMutation = trpc.table.createTable.useMutation({
    onMutate: async () => {
      setCreatingTable(true);

      await utils.table.listTablesByBaseId.cancel({ baseId });

      const previousTables =
        utils.table.listTablesByBaseId.getData({ baseId }) ?? [];

      const optimisticId = `optimistic-${crypto.randomUUID()}`;

      const optimisticTable = {
        id: optimisticId,
        baseId,
        name: "New Table",
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

    onSettled: () => {
      setCreatingTable(false);
      utils.table.listTablesByBaseId.invalidate({ baseId });
    },
  });

  const deleteTableMutation = trpc.table.deleteTable.useMutation({
    onMutate: async ({tableId}) => {
      // Cancel any outgoing fetches
      await utils.table.listTablesByBaseId.cancel({ baseId });

      // Snapshot previous tables
      const previousTables = utils.table.listTablesByBaseId.getData({ baseId });

      // Optimistically remove table from the list
      utils.table.listTablesByBaseId.setData({ baseId }, (old) =>
        old?.filter((t) => t.id !== tableId) ?? []
      );

      // Update active table if necessary
      if (activeTableId === tableId) {
        // Pick first remaining table or null
        setActiveTableId(previousTables?.[0]?.id ?? null);
      }

      return { previousTables };
    },
    onError: (_err, _tableId, context) => {
      if (context?.previousTables) {
        utils.table.listTablesByBaseId.setData({ baseId }, context.previousTables);
      }
    },
    onSettled: () => {
      utils.table.listTablesByBaseId.invalidate({ baseId });
    },
  });

  const handleCreateTable = () => {
    createTableMutation.mutate({
      baseId,
      name: "New Table",
    });
  };

  const handleRenameTable = () => {
    throw Error("ADD FUNCTIONALITY");
  };

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
      initialRows={initialRows}
      initialColumns={initialColumns}
      initialCells={initialCells}
    >
      <div className="flex flex-row h-screen w-full overflow-hidden">
        <LeftBar />

        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <TopBar />

          <TableSelectionBar
            tables={tablesQuery.data || []}
            activeTableId={activeTableId}
            onTableSelect={setActiveTableId}
            onCreateTable={handleCreateTable}
            onRenameTable={handleRenameTable}
            creatingTable={creatingTable}
            onDeleteTable={(tableId) => {
              if (confirm("Are you sure you want to delete this table?")) {
                deleteTableMutation.mutate({tableId});
              }
            }}
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


/*
delete table with confirmation
*/