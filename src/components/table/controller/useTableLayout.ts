import type { ColumnSizingState } from "@tanstack/react-table";
import { useState, useCallback } from "react";

export const ROW_HEIGHT = 40;

export function useTableLayout(initialHeaderHeight: number = ROW_HEIGHT) {
  const [headerHeight, setHeaderHeight] = useState<number>(initialHeaderHeight);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  // Vertical header resize
  const startVerticalResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = headerHeight;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientY - startY;
        setHeaderHeight(Math.max(ROW_HEIGHT, startHeight + delta));
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [headerHeight],
  );

  return {
    ROW_HEIGHT,
    headerHeight,
    setHeaderHeight,
    startVerticalResize,
    columnSizing,
    setColumnSizing,
  };
}
