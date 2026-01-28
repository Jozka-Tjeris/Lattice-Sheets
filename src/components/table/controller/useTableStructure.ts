import { useCallback, useRef } from "react";
import type { TableRow, Column, ColumnType } from "./tableTypes";
import { useSession } from "next-auth/react";
import { api as trpc } from "~/trpc/react";

export function useTableStructure(
  tableId: string,
  rows: TableRow[],
  columns: Column[],
  setRows: React.Dispatch<React.SetStateAction<TableRow[]>>,
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>,
  columnsRef: React.RefObject<Column[]>,
  isViewDirty: boolean,
  onStructureCommitted: () => void,
) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const structureMutationInFlightRef = useRef(0);

  const beginStructureMutation = () => {
    structureMutationInFlightRef.current += 1;
  };

  const endStructureMutation = () => {
    structureMutationInFlightRef.current -= 1;
  };

  const getIsStructureStable = useCallback(
    () => structureMutationInFlightRef.current === 0,
    []
  );

  // IDs are guaranteed to be correct because it only commits after in-flight count hits zero
  const maybeCommitStructure = useCallback(() => {
    if (structureMutationInFlightRef.current === 0) {
      onStructureCommitted();
    }
  }, [onStructureCommitted]);

  const confirmStructuralChange = useCallback((action: string) => {
    return confirm(
      `${action}\n\nStructural changes are applied immediately and automatically saved to this view.`
    );
  }, []);

  const addRowMutation = trpc.row.addRow.useMutation();
  const deleteRowMutation = trpc.row.deleteRow.useMutation();
  const addColumnMutation = trpc.column.addColumn.useMutation();
  const deleteColumnMutation = trpc.column.deleteColumn.useMutation();
  const renameColumnMutation = trpc.column.renameColumn.useMutation();

  // --------------------
  // Handlers
  // --------------------
  const handleAddRow = useCallback(
    async (orderNum: number) => {
      if (!userId) return; // not logged in 
      if(columnsRef.current.length === 0) return;
      if(isViewDirty){
        alert("The current view must be saved before adding any rows");
        return;
      }
      if(!confirmStructuralChange("Do you want to add a row?")) return;
      const optimisticId = `optimistic-row-${crypto.randomUUID()}`;
      setRows((prev) => [
        ...prev,
        {
          id: optimisticId,
          internalId: optimisticId,
          order: orderNum,
          optimistic: true,
        },
      ]);

      beginStructureMutation();
      try {
        const { result } = await addRowMutation.mutateAsync({
          tableId,
          orderNum,
          optimisticId,
        });

        // Swap optimistic ID with real ID
        setRows((prev) =>
          prev.map((r) =>
            r.id === optimisticId
              ? { ...r, id: result.id, optimistic: false }
              : r
          )
        );
      } catch {
        // Filter out row with optimistic id
        setRows((prev) => prev.filter((r) => r.id !== optimisticId));
      } finally {
        endStructureMutation();
        maybeCommitStructure();
      }
    },
    [tableId, setRows, columnsRef, isViewDirty, confirmStructuralChange, maybeCommitStructure, userId, addRowMutation]
  );

  const handleAddColumn = useCallback(
    async (orderNum: number) => {
      if (!userId) return; // not logged in
      if(isViewDirty){
        alert("The current view must be saved before adding any columns");
        return;
      }
      if(!confirmStructuralChange("Do you want to add a column?")) return;
      const colLabel = prompt("Enter column name:", `Column ${orderNum + 1}`);
      if (!colLabel?.trim()){
        alert("New column name cannot be empty");
        return;
      }
      const typeInput = prompt(
        "Enter column type (text, number) [default is text]:",
        "text",
      );
      if (typeInput === null) return;
      const type: ColumnType = typeInput.toLowerCase().trim() === "number" ? "number" : "text";

      const optimisticId = `optimistic-col-${crypto.randomUUID()}`;
      setColumns((prev) => [
        ...prev,
        {
          id: optimisticId,
          internalId: optimisticId,
          label: colLabel,
          order: orderNum,
          columnType: type,
          optimistic: true,
        },
      ]);

      beginStructureMutation();
      try {
        const { result } = await addColumnMutation.mutateAsync({
          tableId,
          label: colLabel,
          orderNum,
          type,
          optimisticId,
        });

        setColumns((prev) =>
          prev.map((c) =>
            c.id === optimisticId
              ? { ...c, id: result.id, optimistic: false }
              : c
          )
        );
      } catch {
        // Filter out column with optimistic id
        setColumns(prev => prev.filter(c => c.id !== optimisticId));
      } finally {
        endStructureMutation();
        maybeCommitStructure();
      }
    },
    [tableId, setColumns, isViewDirty, confirmStructuralChange, maybeCommitStructure, userId, addColumnMutation]
  );

  const handleDeleteRow = useCallback(
    async (rowId: string, rowPosition: number) => {
      if (!userId) return; // not logged in
      if(isViewDirty){
        alert("The current view must be saved before deleting any rows");
        return;
      }
      if(!confirmStructuralChange(`Delete row "${rowPosition}"?\n\nThis will remove all its cell values.`)) return;
      // Optimistic removal
      const prevRows = [...rows ?? []]; // capture current state for rollback
      setRows((prev) => prev.filter((r) => r.id !== rowId && r.internalId !== rowId));

      beginStructureMutation();
      try {
        await deleteRowMutation.mutateAsync({
          tableId,
          rowId,
        });
      } catch {
        // Revert on failure
        setRows(prevRows);
      } finally {
        endStructureMutation();
        maybeCommitStructure();
      }
    },
    [tableId, setRows, isViewDirty, confirmStructuralChange, maybeCommitStructure, rows, userId, deleteRowMutation]
  );

  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      if (!userId) return; // not logged in
      if(isViewDirty){
        alert("The current view must be saved before deleting any columns");
        return;
      }
      if(!confirmStructuralChange("Do you want to delete this column?")) return;
      // Optimistic removal
      const prevColumns = [...columns ?? []];
      setColumns((prev) => prev.filter((c) => c.id !== columnId && c.internalId !== columnId));

      beginStructureMutation();
      try {
        await deleteColumnMutation.mutateAsync({
          tableId,
          columnId,
        });
      } catch {
        // Revert on failure
        setColumns(prevColumns);
      } finally {
        endStructureMutation();
        maybeCommitStructure();
      }
    },
    [tableId, setColumns, isViewDirty, confirmStructuralChange, maybeCommitStructure, columns, userId, deleteColumnMutation]
  );

  const handleRenameColumn = useCallback(
    async (columnId: string) => {
      if (!userId) return; // not logged in
      if(isViewDirty){
        alert("The current view must be saved before renaming any columns");
        return;
      }
      if(!confirmStructuralChange("Do you want to rename this column?")) return;
      const newLabel = prompt("Enter new column name:");
      if(!newLabel || newLabel.trim() === ""){
        alert("Column name is invalid.");
        return;
      }
      // Optimistic update
      const prevColumns = [...columns ?? []];
      setColumns((prev) =>
        prev.map((c) =>
          c.id === columnId || c.internalId === columnId ? { ...c, label: newLabel } : c
        )
      );

      beginStructureMutation();
      try {
        await renameColumnMutation.mutateAsync({
          tableId,
          columnId,
          newLabel,
        });
      } catch {
        // Revert on failure
        setColumns(prevColumns);
      } finally {
        endStructureMutation();
        maybeCommitStructure();
      }
    },
    [tableId, setColumns, isViewDirty, confirmStructuralChange, maybeCommitStructure, columns, userId, renameColumnMutation]
  );

  return {
    handleAddRow,
    handleAddColumn,
    handleDeleteRow,
    handleDeleteColumn,
    handleRenameColumn,
    getIsStructureStable,
    structureMutationInFlightRef,
  };
}
