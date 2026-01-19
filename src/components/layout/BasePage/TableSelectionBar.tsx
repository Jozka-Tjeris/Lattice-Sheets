import type { TableData } from "~/components/table/controller/tableTypes";

interface TableSelectionBarProps {
  tables: TableData[];
  activeTableId: string | null;
  onTableSelect: (tableId: string) => void;
  onCreateTable: () => void;
  onDeleteTable: (tableId: string) => void;
  onRenameTable: (tableId: string, newLabel: string) => void;
  creatingTable: boolean;
}

export function TableSelectionBar({
  tables,
  activeTableId,
  onTableSelect,
  onCreateTable,
  onDeleteTable,
  onRenameTable,
  creatingTable,
}: TableSelectionBarProps) {
  return (
    <div className="shrink-0 h-8 border-t border-gray-300 bg-blue-100">
      <div className="flex h-full items-stretch">
        {tables.map((table) => {
          const isActive = table.id === activeTableId;

          return (
            <div
              key={table.id}
              className={`flex items-center h-full px-2 border-r cursor-pointer select-none
                ${isActive ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-white hover:bg-gray-100"}
              `}
              onClick={() => onTableSelect(table.id)}
              onDoubleClick={() => {
                const newLabel = prompt("Enter new table name:");
                if(newLabel) onRenameTable(table.id, newLabel);
              }}
            >
              <span className="truncate max-w-[120px]">{table.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent selecting tab
                  if (confirm(`Are you sure you want to delete "${table.name}"?`)) {
                    onDeleteTable(table.id);
                  }
                }}
                className="ml-2 text-black hover:text-red-500 text-xs"
                title="Delete table"
              >
                ✕
              </button>
            </div>
          );
        })}

        {/* Add table */}
        <button
          onClick={onCreateTable}
          disabled={creatingTable}
          className="flex items-center h-full px-3 bg-white hover:bg-gray-100 border-r text-sm font-medium"
        >
          + Add table
        </button>
      </div>
    </div>
  );
}