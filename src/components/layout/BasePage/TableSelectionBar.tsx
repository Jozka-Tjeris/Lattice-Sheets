import type { TableData } from "~/components/table/controller/tableTypes"

interface TableSelectionBarProps{
    tables: TableData[],
    baseId: string
}

export function TableSelectionBar({ tables, baseId }: TableSelectionBarProps){
    return <div className="shrink-0 h-8 border-1 border-gray-750 bg-gray-50">
        table selection bar
    </div>
}