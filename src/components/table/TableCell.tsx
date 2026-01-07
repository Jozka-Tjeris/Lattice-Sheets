import { useEffect, useState, useRef, memo } from "react";
import { type CellValue } from "./mockTableData";

type TableCellProps = {
  value: CellValue;
  onChange: (newValue: CellValue) => void;
  onClick: () => void; // notify parent that this cell is active
  isActive?: boolean;
  onMoveNext?: () => void; // Tab / ArrowRight
  onMovePrev?: () => void; // Shift+Tab / ArrowLeft
  onMoveUp?: () => void;   // ArrowUp
  onMoveDown?: () => void; // ArrowDown
  cellId: string;
  registerRef?: (id: string, el: HTMLDivElement | null) => void;
};

export const TableCell = memo(function TableCell({
  value,
  onChange,
  onClick,
  isActive = false,
  onMoveNext,
  onMovePrev,
  onMoveUp,
  onMoveDown,
  cellId,
  registerRef
}: TableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  // Sync local state if external value changes (e.g., undo/redo or formulas)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Register ref for navigation
  useEffect(() => {
    registerRef?.(cellId, divRef.current);
    return () => registerRef?.(cellId, null);
  }, [cellId, registerRef]);

  // Restore focus after editing
  useEffect(() => {
    // If we just stopped editing and this cell is the active one,
    // return focus to the div so keyboard navigation continues working.
    if (!isEditing && isActive) {
      divRef.current?.focus();
    }
  }, [isEditing, isActive]);

  const commit = () => {
    if (!isEditing) return;
    setIsEditing(false);
    if (localValue !== value) onChange(localValue);
  };

  const cancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

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
        if (e.shiftKey) onMovePrev?.();
        else onMoveNext?.();
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
          if (e.shiftKey) onMovePrev?.();
          else onMoveNext?.();
          break;
        case "Enter":
          setIsEditing(true);
          break;
        case "ArrowRight": onMoveNext?.(); break;
        case "ArrowLeft":  onMovePrev?.(); break;
        case "ArrowUp":    onMoveUp?.();   break;
        case "ArrowDown":  onMoveDown?.(); break;
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
        onChange={e => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    );
  }

  const handleClick = () => {
    if (!isActive) onClick(); // select if not active
    else setIsEditing(true);   // enter edit if already active
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
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Adding transparent span prevents cell from collapsing in size */}
      {value || (
        <span className="text-transparent select-none">.</span>
      )}
    </div>
  );
}, (prev, next) =>
  //Only re-render if these specific things change
  prev.value === next.value &&
  prev.isActive === next.isActive &&
  prev.cellId === next.cellId
);
