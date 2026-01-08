import { useEffect, useState, useRef, memo } from "react";
import { type CellValue } from "./controller/tableTypes";
import { useMoveActiveCell } from "./controller/tableNavigation";
import { useTableController } from "./controller/TableProvider";

type TableCellProps = {
  value: CellValue;
  onChange: (newValue: CellValue) => void;
  onClick: () => void; // notify parent that this cell is active
  columnId: string;
  columnType: "text" | "number";
  rowId: string;
  cellId: string;
  registerRef?: (id: string, el: HTMLDivElement | null) => void;
};

export const TableCell = memo(function TableCell({
  value,
  onChange,
  onClick,
  rowId,
  columnId,
  columnType,
  cellId,
  registerRef
}: TableCellProps) {
  const { activeCell } = useTableController();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const isActive = activeCell?.rowId === rowId && activeCell?.columnId === columnId;
  
  // Sync local state if external value changes (e.g., undo/redo or formulas)
  useEffect(() => {
    if (!isEditing){
      setLocalValue(value);
    }
  }, [value, isEditing]);

  // Register ref for navigation
  useEffect(() => {
    registerRef?.(cellId, divRef.current);
    return () => registerRef?.(cellId, null);
  }, [cellId, registerRef]);

  // Restore focus after editing
  useEffect(() => {
    // CRITICAL: If we are editing, do NOT touch the focus.
    // The input's autoFocus attribute will handle it.
    if (isEditing) return;

    if (isActive) {
      divRef.current?.focus();
    }
  }, [isActive, isEditing]);

  const commit = () => {
    if (!isEditing) return;
    setIsEditing(false);

    let finalValue: CellValue = localValue;

    if (columnType === "number") {
      const num = Number(localValue);
      if (isNaN(num)) {
        // Reset to previous value if invalid
        setLocalValue(value as string);
        return;
      }
      finalValue = num;
    }

    if (finalValue !== value) onChange(finalValue);
  };

  const cancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  const moveActiveCell = useMoveActiveCell();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement | HTMLInputElement>) => {
    if (isEditing) {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        commit();
      } 
      else if (e.key === "Escape") {
        e.preventDefault();
        cancel(); 
      } 
      else if (e.key === "Tab") {
        e.preventDefault();
        commit();
        if (e.shiftKey) moveActiveCell("left");
        else moveActiveCell("right");
      }
    } else if (isActive) {
      // Prevent default scrolling for navigation keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case "Tab":
          //don't blur self here as this loses focus on table
          cancel();
          if (e.shiftKey) moveActiveCell("left");
          else moveActiveCell("right");
          break;
        case "Enter":
          setIsEditing(true);
          break;
        case "ArrowRight": moveActiveCell("right"); break;
        case "ArrowLeft":  moveActiveCell("left"); break;
        case "ArrowUp":    moveActiveCell("up"); break;
        case "ArrowDown":  moveActiveCell("down"); break;
      }
    }
  };

  // -----------------------------
  // Editing state
  // -----------------------------
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="w-full h-full px-2 py-1 border border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.5)] z-10 relative"
        style={{ minWidth: 0 }}
        value={localValue}
        onChange={e => {
          const val = e.target.value;
          if (columnType === "number") {
            // Only allow digits, optional decimal point, optional negative sign
            if (/^-?\d*\.?\d*$/.test(val)) {
              setLocalValue(val);
            }
          } else {
            setLocalValue(val);
          }
        }}
        // onBlur={commit}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // CRITICAL: Stop the event from reaching BaseTable's handleClickOutside
    e.stopPropagation(); 

    if (!isActive) {
      onClick();
    } else {
      // If already active, the second click enters edit mode immediately
      setTimeout(() => {
        setIsEditing(true);
      }, 0);
    }
  };

  // -----------------------------
  // Display state
  // -----------------------------
  return (
    <div
      ref={divRef}
      tabIndex={0}
      className={`
        w-full h-full px-2 py-1 flex items-start
        cursor-text truncate transition-colors
        hover:bg-gray-100
        ${isActive
          ? "border border-blue-500 shadow-[0_0_0_2px_rgba(60,120,255,1)] z-10 relative rounded-[1px]"
          : "border border-transparent"}
      `}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      {/* Adding transparent span prevents cell from collapsing in size */}
      {value || (
        <span className="text-transparent select-none">.</span>
      )}
    </div>
  );
}
);
