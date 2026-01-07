"use client";

import { useRef, useEffect } from "react";
import { useTableController } from "@/components/table/controller/TableProvider";
import { TableHeader } from "./TableHeader";
import { TableBody } from "./TableBody";

export function BaseTable() {
  const { activeCell, sorting } = useTableController();

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Inside BaseTable.tsx
  const activeCellRef = useRef(activeCell);

  // Keep the ref in sync
  useEffect(() => {
    activeCellRef.current = activeCell;
  }, [activeCell]);

  return (
    <div ref={tableContainerRef} className="w-full overflow-x-auto border" style={{ overscrollBehavior: "contain" }}>
      <div className="max-h-[calc(100vh-136px)] overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
        <table className="table-auto border-collapse w-max">
          <TableHeader key={JSON.stringify(sorting)}/>
          <TableBody />
        </table>
      </div>
    </div>
  );
}
