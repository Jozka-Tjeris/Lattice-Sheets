"use client";

import { BaseTable } from "~/components/table/BaseTable";
import { useTableStructureController } from "~/components/table/controller/TableProvider";
import { useEffect, useRef } from "react";

export function MainTableContent() {
  const { setActiveCell, activeCell, columns, mainScrollRef } = useTableStructureController();
  const containerRef = useRef<HTMLDivElement>(null);
  

  // Reset active cell if no columns present
  useEffect(() => {
    if(columns.length === 0 && activeCell){
      setActiveCell(null);
    }
  }, [columns.length, activeCell, setActiveCell]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!activeCell) return;
      // If the click is NOT in the sidebar AND NOT in the table
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActiveCell(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeCell, setActiveCell]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-1 overflow-hidden"
    >
      <div
        ref={mainScrollRef}
        // overscroll-none prevents overscrolling, no-scrollbar hides scrollbar
        className="min-w-0 flex-1 overflow-auto overscroll-none"
      >
        <BaseTable />
      </div>
    </div>
  );
}
