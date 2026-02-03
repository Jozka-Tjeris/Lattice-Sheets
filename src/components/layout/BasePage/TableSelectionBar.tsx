import type { TableData } from "~/components/table/controller/tableTypes";

interface TableSelectionBarProps {
  tables: TableData[];
  activeTableId: string | null;
  onTableSelect: (tableId: string) => void;
  onCreateTable: () => void;
  onDeleteTable: (tableId: string) => void;
  onRenameTable: (tableId: string) => void;
  creatingTable: boolean;
  loadingTable: boolean;
  colorTheme: string | undefined;
}

export function TableSelectionBar({
  tables,
  activeTableId,
  onTableSelect,
  onCreateTable,
  onDeleteTable,
  onRenameTable,
  creatingTable,
  loadingTable,
  colorTheme,
}: TableSelectionBarProps) {
  return (
    <div className="h-8 shrink-0 overflow-x-auto border-t border-gray-300 bg-gray-100 no-scrollbar"
      style={{ backgroundColor: colorTheme + "59" }}
    >
      <div className="flex h-full flex-1 items-stretch">
        {tables.map((table) => {
          const isActive = table.id === activeTableId;

          return (
            <div
              key={table.id}
              className={`flex h-full cursor-pointer items-center border-r px-2 select-none ${isActive ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-white hover:bg-gray-100"} `}
              onClick={() => onTableSelect(table.id)}
              onDoubleClick={() => onRenameTable(table.id)}
            >
              <span className="max-w-[120px] truncate" title={table.name}>{table.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent selecting tab
                  onDeleteTable(table.id);
                }}
                className="ml-2 text-xs text-black hover:text-red-500"
                title="Delete table"
                disabled={creatingTable || loadingTable}
              >
                ✕
              </button>
            </div>
          );
        })}

        {/* Add table */}
        <button
          onClick={onCreateTable}
          disabled={creatingTable || loadingTable}
          className="h-full min-w-24 items-center border-r bg-white pl-2 pr-3 text-sm font-medium hover:bg-gray-100"
        >
          + Add table
        </button>
      </div>
    </div>
  );
}
