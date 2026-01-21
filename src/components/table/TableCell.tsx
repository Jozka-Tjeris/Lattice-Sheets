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
  registerRef,
}: TableCellProps) {
  const { activeCell, isNumericalValue } =
    useTableController();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? "");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const localValueRef = useRef(localValue);
  const isEditingRef = useRef(isEditing);
  const isCommittingRef = useRef(false);
  const isCancellingRef = useRef(false);

  const isActive =
    activeCell?.rowId === rowId && activeCell?.columnId === columnId;

  // Keep refs in sync
  useEffect(() => {
    localValueRef.current = localValue;
  }, [localValue]);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

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
    if (
      !isEditingRef.current ||
      isCommittingRef.current ||
      isCancellingRef.current
    )
      return;

    const valueToCommit = localValueRef.current;
    isCommittingRef.current = true;

    let finalValue: CellValue = valueToCommit;
    if (columnType === "number") {
      if (valueToCommit === "") {
        finalValue = "";
      } else {
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

    if (finalValue !== value) {
      onChange(finalValue);
    }

    setIsEditing(false);
    isCommittingRef.current = false;
  }, [columnType, value, onChange]);

  const cancel = useCallback(() => {
    isCancellingRef.current = true;
    setLocalValue(value ?? "");
    setIsEditing(false);
    setTimeout(() => {
      isCancellingRef.current = false;
    }, 0);
  }, [value]);

  // Key handling
  const moveActiveCell = useMoveActiveCell();
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement | HTMLInputElement>,
  ) => {
    if (isEditing) {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          commit();
          break;
        case "Escape":
          e.preventDefault();
          cancel();
          break;
        case "Tab":
          e.preventDefault();
          commit();
          if (e.shiftKey) moveActiveCell("left");
          else moveActiveCell("right");
          break;
      }
    } else if (isActive) {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(
          e.key,
        )
      )
        e.preventDefault();
      switch (e.key) {
        case "Enter":
          setIsEditing(true);
          break;
        case "Tab":
          cancel();
          if (e.shiftKey) moveActiveCell("left");
          else moveActiveCell("right");
          break;
        case "ArrowRight":
          moveActiveCell("right");
          break;
        case "ArrowLeft":
          moveActiveCell("left");
          break;
        case "ArrowUp":
          moveActiveCell("up");
          break;
        case "ArrowDown":
          moveActiveCell("down");
          break;
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
    if (!isActive && isEditingRef.current) {
      commit();
    }
  }, [isActive, commit]);

  // Commit on outside click
  useEffect(() => {
    if (!isEditing) return;
    const handleGlobalClick = (e: MouseEvent) => {
      setTimeout(() => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          commit();
        }
      }, 0);
    };
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, [isEditing, commit]);

  // Input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (columnType === "number") {
      if (isNumericalValue(val)) setLocalValue(val);
    } else setLocalValue(val);
  };

  return (
    <div
      ref={containerRef}
      data-cell-id={cellId}
      tabIndex={0}
      className={`relative flex h-full w-full cursor-text items-center truncate px-2 py-1 transition-colors outline-none hover:bg-gray-100 ${
        isActive
          ? "z-10 rounded-[1px] border border-blue-500 shadow-[0_0_0_2px_rgba(60,120,255,1)]"
          : "border border-transparent"
      } `}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      {/* Display value when not editing */}
      {!isEditing && (
        <span className="pointer-events-none absolute inset-0 flex items-center truncate px-2 select-none">
          {value ?? ""}
        </span>
      )}

      {/* Input element (always present) */}
      <input
        ref={inputRef}
        value={localValue}
        disabled={!isEditing}
        onChange={handleInputChange}
        className={`absolute inset-0 h-full w-full bg-transparent px-2 outline-none ${!isEditing ? "pointer-events-none opacity-0" : ""} `}
      />
    </div>
  );
});
