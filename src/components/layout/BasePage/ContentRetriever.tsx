"use client";

import { MainTableContent } from "./MainTableContent";

interface ContentRetrieverProps {
  hasTables: boolean;
  tablesLoading: boolean;
  tablesError?: string;
  rowsLoading: boolean;
  columnsLoading: boolean;
  rowsError: boolean;
  columnsError: boolean;
  creatingTable: boolean;
  onCreateTable: () => void;
}

export function ContentRetriever({
  hasTables,
  tablesLoading,
  tablesError,
  rowsLoading,
  columnsLoading,
  rowsError,
  columnsError,
  creatingTable,
  onCreateTable,
}: ContentRetrieverProps) {
  // Tables loading
  if (tablesLoading) {
    return <div className="flex items-center justify-center h-full">Loading tables…</div>;
  }

  // Tables error
  if (tablesError) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Failed to load tables: {tablesError}
      </div>
    );
  }

  // No tables
  if (!hasTables) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-500 mb-4">No tables yet</p>
        <button
          onClick={onCreateTable}
          disabled={creatingTable}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {creatingTable ? "Creating…" : "Create Table"}
        </button>
      </div>
    );
  }

  // Table data loading
  if (rowsLoading || columnsLoading) {
    return <div className="flex items-center justify-center h-full">Loading table…</div>;
  }

  // Table data error
  if (rowsError || columnsError) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Failed to load table data
      </div>
    );
  }

  return <MainTableContent />;
}