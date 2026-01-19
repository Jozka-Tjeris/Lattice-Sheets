"use client";

import { MainContent } from "./MainContent";
import { api as trpc } from "~/trpc/react";
import { useState } from "react";

/**
 * Helper component to manage the conditional rendering for MainContent.
 */
export function ContentRetriever({
  baseId,
  tablesQuery,
  rowsQuery,
  columnsQuery,
  hasTables,
}: {
  baseId: string;
  tablesQuery: ReturnType<typeof trpc.table.listTablesByBaseId.useQuery>;
  rowsQuery: ReturnType<typeof trpc.row.getRowsWithCells.useQuery>;
  columnsQuery: ReturnType<typeof trpc.column.getColumns.useQuery>;
  hasTables: boolean;
}) {
  const [creatingTable, setCreatingTable] = useState(false);

  const createTableMutation = trpc.table.createTable.useMutation({
    onSuccess: () => {
      // Refetch tables for base after creation
      tablesQuery.refetch();
      setCreatingTable(false);
    }
  })

  const handleCreateTable = () => {
    setCreatingTable(true);
    createTableMutation.mutate({ baseId, name: "New Table" })
  }

  // Table is loading data
  if(tablesQuery.isLoading){
    return <div className="flex items-center justify-center h-full">Loading tables…</div>;
  }

  // Some error happened with table loading
  if(tablesQuery.isError){
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Failed to load tables: {tablesQuery.error.message}
      </div>
    );
  }

  // No tables to load, return button to add table
  if(!hasTables){
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500 mb-4">No tables yet</p>
        <button 
          onClick={handleCreateTable}
          disabled={creatingTable}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          {creatingTable ? "Creating..." : "Create Table"}
        </button>
      </div>
    );
  }

  // Rows are being loaded in
  if(rowsQuery.isLoading || columnsQuery.isLoading){
    return <div className="flex items-center justify-center h-full">Loading table…</div>;
  }

  // Rows failed to load in
  if(rowsQuery.isError || columnsQuery.isError){
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Failed to load table data
      </div>
    );
  }

  return <MainContent />;
}