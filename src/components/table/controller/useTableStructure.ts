import { useCallback, useRef } from "react";
import type { TableRow, Column, ColumnType } from "./tableTypes";
import { api as trpc } from "~/trpc/react";

export function useTableStructure(
  tableId: string,
  setRows: React.Dispatch<React.SetStateAction<TableRow[]>>,
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>,
  columnsRef: React.RefObject<Column[]>,
  isViewDirty: boolean,
  onStructureCommitted: () => void,
) {
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

  const addRowMutation = trpc.row.addRow.useMutation({
    onMutate: () => beginStructureMutation(),
    onSuccess: ({ row, optimisticId }) => {
      setRows((prev) =>
        prev.map((r) =>
          r.internalId === optimisticId || r.id === optimisticId
            ? { ...r, id: row.id, optimistic: false }
            : r
        )
      );
    },
    onError: (_, { optimisticId }) => {
      setRows((prev) => prev.filter((r) => r.id !== optimisticId));
    },
    onSettled: () => {
      endStructureMutation();
      onStructureCommitted();
    },
  });

  const addColumnMutation = trpc.column.addColumn.useMutation({
    onMutate: () => beginStructureMutation(),
    onSuccess: ({ column, optimisticId }) => {
      setColumns((prev) =>
        prev.map((c) =>
          c.id === optimisticId || c.internalId === optimisticId
            ? { ...c, id: column.id, optimistic: false, label: column.name, order: column.order }
            : c
        )
      );
    },
    onError: (_, { optimisticId }) => {
      setColumns(prev => prev.filter(c => c.id !== optimisticId && c.internalId !== optimisticId));
    },
    onSettled: () => {
      endStructureMutation();
      onStructureCommitted();
    },
  });

  const deleteRowMutation = trpc.row.deleteRow.useMutation({
    onSettled: () => {
      endStructureMutation();
      onStructureCommitted();
    }
  });
  const deleteColumnMutation = trpc.column.deleteColumn.useMutation({
    onSettled: () => {
      endStructureMutation();
      onStructureCommitted();
    }
  });
  const renameColumnMutation = trpc.column.renameColumn.useMutation({
    onSettled: () => {
      onStructureCommitted();
    }
  });

  const handleAddRow = useCallback(
    (orderNum: number) => {
      if(columnsRef.current.length === 0) return;
      if(isViewDirty){
        alert("The current view must be saved before adding any rows");
        return;
      }
      else{
        const response = confirm("Do you want to add a row? \n\nStructural changes are applied immediately and automatically saved to this view.");
        if(!response) return;
      }
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
      addRowMutation.mutate({ tableId, orderNum, optimisticId });
    },
    [addRowMutation, tableId, setRows, columnsRef]
  );

  const handleAddColumn = useCallback(
    (orderNum: number, label: string, type: ColumnType) => {
      if(isViewDirty){
        alert("The current view must be saved before adding any columns");
        return;
      }
      else{
        const response = confirm("Do you want to add a column? \n\nStructural changes are applied immediately and automatically saved to this view.");
        if(!response) return;
      }
      const optimisticId = `optimistic-col-${crypto.randomUUID()}`;
      setColumns((prev) => [
        ...prev,
        {
          id: optimisticId,
          internalId: optimisticId,
          label,
          order: orderNum,
          columnType: type,
          optimistic: true,
        },
      ]);
      addColumnMutation.mutate({ tableId, label, orderNum, type, optimisticId });
    },
    [addColumnMutation, tableId, setColumns]
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if(isViewDirty){
        alert("The current view must be saved before deleting any rows");
        return;
      }
      else{
        const response = confirm("Do you want to delete a row? \n\nStructural changes are applied immediately and automatically saved to this view.");
        if(!response) return;
      }
      beginStructureMutation();
      setRows((prev) => prev.filter((r) => r.id !== rowId && r.internalId !== rowId));
      deleteRowMutation.mutate({ tableId, rowId });
    },
    [deleteRowMutation, tableId, setRows]
  );

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      if(isViewDirty){
        alert("The current view must be saved before deleting any columns");
        return;
      }
      else{
        const response = confirm("Do you want to delete a column? \n\nStructural changes are applied immediately and automatically saved to this view.");
        if(!response) return;
      }
      beginStructureMutation();
      setColumns((prev) => prev.filter((c) => c.id !== columnId && c.internalId !== columnId));
      deleteColumnMutation.mutate({ tableId, columnId });
    },
    [deleteColumnMutation, tableId, setColumns]
  );

  const handleRenameColumn = useCallback(
    (columnId: string, newLabel: string) => {
      if(isViewDirty){
        alert("The current view must be saved before renaming any columns");
        return;
      }
      else{
        const response = confirm("Do you want to rename a column? \n\nStructural changes are applied immediately and automatically saved to this view.");
        if(!response) return;
      }
      setColumns((prev) =>
        prev.map((c) =>
          c.id === columnId || c.internalId === columnId ? { ...c, label: newLabel } : c
        )
      );
      renameColumnMutation.mutate({ tableId, columnId, newLabel });
    },
    [renameColumnMutation, tableId, setColumns]
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
