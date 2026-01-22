"use client";

import { BaseTable } from "~/components/table/BaseTable";
import { StickyColumnsBar } from "./StickyColumnsBar";
import { useTableController } from "~/components/table/controller/TableProvider";
import { useCallback, useEffect, useRef } from "react";

export function MainTableContent() {
  const { setActiveCell, activeCell, columns } = useTableController();
  const containerRef = useRef<HTMLDivElement>(null);

  const stickyScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Reset active cell if no columns present
  useEffect(() => {
    if(columns.length === 0 && activeCell){
      setActiveCell(null);
    }
  }, [columns.length, activeCell, setActiveCell]);

  // Synchronize the vertical scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;

    if (stickyScrollRef.current) {
      stickyScrollRef.current.scrollTop = scrollTop;
    }
  }, []);

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
      className="flex h-full w-full flex-row overflow-hidden"
    >
      <StickyColumnsBar scrollRef={stickyScrollRef} />
      <div
        ref={mainScrollRef}
        onScroll={handleScroll}
        className="min-w-0 flex-1 overflow-auto"
      >
        <BaseTable />
      </div>
    </div>
  );
}
