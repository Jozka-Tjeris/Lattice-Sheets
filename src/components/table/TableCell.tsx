import { useEffect, useState, useRef, memo, useCallback } from "react";
import { type CellValue, type ColumnType } from "./controller/tableTypes";
import { useMoveActiveCell } from "./controller/tableNavigation";
import { useTableController } from "./controller/TableProvider";

type TableCellProps = {
  value: CellValue;
  onChange: (newValue: CellValue) => void;
  onClick: () => void;
  columnId: string;
  columnType: ColumnType;
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
  const [localValue, setLocalValue] = useState(value ?? "");
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- REFS FOR RELIABLE COMMITTING ---
  const localValueRef = useRef(localValue);
  const isEditingRef = useRef(isEditing);
  const isCommittingRef = useRef(false);
  const isCancellingRef = useRef(false);

  const isActive = activeCell?.rowId === rowId && activeCell?.columnId === columnId;

  // Keep refs in sync with state
  useEffect(() => { localValueRef.current = localValue; }, [localValue]);
  useEffect(() => { isEditingRef.current = isEditing; }, [isEditing]);

  // Sync prop value to local state ONLY when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value ?? "");
      localValueRef.current = value ?? "";
    }
  }, [value, isEditing]);

  // Register for navigation
  useEffect(() => {
    registerRef?.(cellId, containerRef.current);
    return () => registerRef?.(cellId, null);
  }, [cellId, registerRef]);

  // Focus management
  useEffect(() => {
    if (!isEditing && isActive) {
      requestAnimationFrame(() => {
        containerRef.current?.focus();
      });
    }
  }, [isActive, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [isEditing]);

  // --- STABLE COMMIT LOGIC ---
  const commit = useCallback(() => {
    // Use Ref to check editing state to avoid stale closure
    if (!isEditingRef.current || isCommittingRef.current || isCancellingRef.current) return;
    
    const valueToCommit = localValueRef.current;
    isCommittingRef.current = true;

    let finalValue: CellValue = valueToCommit;
    if (columnType === "number") {
      const num = Number(valueToCommit);
      if (isNaN(num)) {
        setLocalValue(value ?? ""); 
        setIsEditing(false);
        isCommittingRef.current = false;
        return;
      }
      finalValue = num;
    }

    if (finalValue !== value) {
      onChange(finalValue);
    }
    
    setIsEditing(false);
    isCommittingRef.current = false;
  }, [columnType, value, onChange]);

  const cancel = useCallback(() => {
    isCancellingRef.current = true; // Set the lock
    setLocalValue(value ?? "");
    setIsEditing(false);
    
    // Reset the lock after the current execution cycle
    setTimeout(() => {
      isCancellingRef.current = false;
    }, 0);
  }, [value]);

  // --- EVENT HANDLERS ---
  const moveActiveCell = useMoveActiveCell();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement | HTMLInputElement>) => {
    if (isEditing) {
      if (e.key === "Enter") {
        e.preventDefault();
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
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case "Tab":
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return; // Let input handle its own clicks
    if (!isActive) {
      onClick(); // Set active in Provider
    } else {
      setTimeout(() => setIsEditing(true), 0);
    }
  };

  // --- CLICK OUTSIDE & CLEANUP ---
  useEffect(() => {
    if (!isEditing) return;

    const handleGlobalClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commit();
      }
    };

    document.addEventListener("mousedown", handleGlobalClick);
    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
      
      // Check BOTH if we are editing AND that we aren't currently cancelling
      if (isEditingRef.current && !isCancellingRef.current) {
        commit();
      }
    };
  }, [isEditing, commit]);

  return (
    <div
      ref={containerRef}
      data-cell-id={cellId}
      tabIndex={0}
      className={`
        relative w-full h-full px-2 py-1 flex items-start
        cursor-text truncate transition-colors outline-none
        hover:bg-gray-100
        ${isActive
          ? "border border-blue-500 shadow-[0_0_0_2px_rgba(60,120,255,1)] z-10 rounded-[1px]"
          : "border border-transparent"}
      `}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      <span className={`truncate ${isEditing ? 'invisible w-0' : 'w-full'}`}>
        {value ?? ""}
        {(value === null || value === "") && !isEditing && (
          <span className="text-transparent select-none">.</span>
        )}
      </span>

      {isEditing && (
        <input
          ref={inputRef}
          value={localValue}
          onChange={e => {
            const val = e.target.value;
            if (columnType === "number") {
              if (/^-?\d*\.?\d*$/.test(val)) setLocalValue(val);
            } else setLocalValue(val);
          }}
          className="w-full outline-none bg-transparent"
        />
      )}
    </div>
  );
});