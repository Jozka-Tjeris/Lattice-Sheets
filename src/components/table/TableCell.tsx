import { useEffect, useState, useRef, memo, useCallback } from "react";
import { type CellValue, type ColumnType } from "./controller/tableTypes";
import { useMoveActiveCell } from "./controller/tableNavigation";
import { useTableStructureController, INDEX_COL_ID } from "./controller/TableProvider";

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
  registerRef,
}: TableCellProps) {
  const { activeCell, isNumericalValue } = useTableStructureController();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Editable cell logic for normal cells ---
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? "");
  const localValueRef = useRef(localValue);
  const isEditingRef = useRef(isEditing);
  const isCommittingRef = useRef(false);
  const isCancellingRef = useRef(false);

  const isActive = activeCell?.rowId === rowId && activeCell?.columnId === columnId;

  const [flash, setFlash] = useState<"copy" | "cut" | "paste" | null>(null);

  const triggerFlash = (type: "copy" | "cut" | "paste") => {
    setFlash(type);
    setTimeout(() => setFlash(null), 120);
  };

  // Keep refs in sync
  useEffect(() => { localValueRef.current = localValue; }, [localValue]);
  useEffect(() => { isEditingRef.current = isEditing; }, [isEditing]);

  // Sync prop value when NOT editing
  useEffect(() => {
    if (!isEditingRef.current) {
      setLocalValue(value ?? "");
      localValueRef.current = value ?? "";
    }
  }, [value]);

  // Register for navigation
  useEffect(() => {
    registerRef?.(cellId, containerRef.current);
    return () => registerRef?.(cellId, null);
  }, [cellId, registerRef]);

  // Focus management
  useEffect(() => {
    if (isEditing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    } else if (!isEditing && isActive) {
      requestAnimationFrame(() => containerRef.current?.focus());
    }
  }, [isEditing, isActive]);

  // Commit logic
  const commit = useCallback(() => {
    if (!isEditingRef.current || isCommittingRef.current || isCancellingRef.current) return;

    const valueToCommit = localValueRef.current;
    isCommittingRef.current = true;

    let finalValue: CellValue = valueToCommit;
    if (columnType === "number") {
      if (valueToCommit === "") finalValue = "";
      else {
        const num = Number(valueToCommit);
        if (isNaN(num)) {
          setLocalValue(value ?? "");
          setIsEditing(false);
          isCommittingRef.current = false;
          return;
        }
        finalValue = num;
      }
    }

    if (finalValue !== value) onChange(finalValue);

    setIsEditing(false);
    isCommittingRef.current = false;
  }, [columnType, value, onChange]);

  const cancel = useCallback(() => {
    isCancellingRef.current = true;
    setLocalValue(value ?? "");
    setIsEditing(false);
    setTimeout(() => { isCancellingRef.current = false; }, 0);
  }, [value]);

  // Key handling
  const moveActiveCell = useMoveActiveCell();
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement | HTMLInputElement>
  ) => {
    if (isEditing) {
      switch (e.key) {
        case "Enter": e.preventDefault(); commit(); break;
        case "Escape": e.preventDefault(); cancel(); break;
        case "Tab":
          e.preventDefault();
          commit();
          if(e.shiftKey) moveActiveCell("left") 
          else moveActiveCell("right");
          break;
      }
    } else if (isActive) {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Tab"].includes(e.key)) e.preventDefault();

      // --- Clipboard shortcuts ---
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            e.preventDefault();
            navigator.clipboard.writeText(String(localValueRef.current ?? ""));
            triggerFlash("copy");
            break;

          case "x":
            e.preventDefault();
            navigator.clipboard.writeText(String(localValueRef.current ?? ""));
            onChange(columnType === "number" ? "" : "");
            triggerFlash("cut");
            break;

          case "v":
            e.preventDefault();
            (async () => {
              const text = await navigator.clipboard.readText();
              let newValue: CellValue = text;
              if (columnType === "number") {
                const num = Number(text);
                newValue = isNaN(num) ? "" : num;
              }
              onChange(newValue);
              triggerFlash("paste");
            })();
            break;
        }
      }

      // --- navigation + editing keys ---
      switch (e.key) {
        case "Enter": setIsEditing(true); break;
        case "Tab": cancel(); 
          if(e.shiftKey) moveActiveCell("left") 
          else moveActiveCell("right"); 
          break;
        case "ArrowRight": moveActiveCell("right"); break;
        case "ArrowLeft": moveActiveCell("left"); break;
        case "ArrowUp": moveActiveCell("up"); break;
        case "ArrowDown": moveActiveCell("down"); break;
      }
    }
  };

  // Mouse click
  const handleMouseDown = () => {
    if (isEditing) return;
    if (!isActive) onClick();
    else setTimeout(() => setIsEditing(true), 0);
  };

  useEffect(() => {
    if (!isActive && isEditingRef.current) commit();
  }, [isActive, commit]);

  // Commit on outside click
  useEffect(() => {
    if (!isEditing) return;
    const handleGlobalClick = (e: MouseEvent) => {
      setTimeout(() => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) commit();
      }, 0);
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, [isEditing, commit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (columnType === "number") {
      if (isNumericalValue(val)) setLocalValue(val);
    } else setLocalValue(val);
  };

  // --- Row index column detection ---
  const isRowIndexColumn = columnId === INDEX_COL_ID;

  // If this is the row index column return early (shouldn't return anything)
  if (isRowIndexColumn) {
    return;
  }

  return (
    <div
      ref={containerRef}
      data-cell-id={cellId}
      tabIndex={0}
      className={`relative flex h-full w-full cursor-text items-center truncate px-2 py-1
        transition-colors outline-none hover:bg-gray-100
        ${isActive ? "rounded-[1px] outline-3 outline-solid outline-blue-500" : "border border-transparent"}
        ${flash === "copy" ? "bg-blue-100" : ""}
        ${flash === "cut" ? "bg-red-100" : ""}
        ${flash === "paste" ? "bg-green-100" : ""}
      `}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      {!isEditing && (
        <span className="pointer-events-none absolute inset-0 flex items-center truncate px-2 select-none">
          {localValue ?? ""}
        </span>
      )}

      <input
        ref={inputRef}
        value={localValue}
        disabled={!isEditing}
        onChange={handleInputChange}
        className={`absolute inset-0 h-full w-full bg-transparent px-2 outline-none ${!isEditing ? "pointer-events-none opacity-0" : ""}`}
      />
    </div>
  );
});
