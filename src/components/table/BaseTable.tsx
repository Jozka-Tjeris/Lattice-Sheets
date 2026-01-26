"use client";

import { useTableStructureController } from "@/components/table/controller/TableProvider";
import { TableHeader } from "./TableHeader";
import { TableBody } from "./TableBody";

export function BaseTable() {
  const { table, sorting } = useTableStructureController();

  return (
    <table
      // Table is fixed to prevent stretching, width uses TanStack's internal total width
      className="w-max table-fixed border-separate border-spacing-0"
      style={{ width: table.getTotalSize() }}
    >
      {/* We keep the key on sorting so the header re-renders instantly */}
      <TableHeader key={JSON.stringify(sorting)} />
      <TableBody />
    </table>
  );
}
