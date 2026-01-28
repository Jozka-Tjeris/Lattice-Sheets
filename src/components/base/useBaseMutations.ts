"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { api as trpc } from "~/trpc/react";

export function useBaseMutations() {
  const utils = trpc.useUtils();
  const router = useRouter();

  // ----------------------
  // Create Base
  // ----------------------
  const createBaseMutation = trpc.base.createBase.useMutation({
    onSuccess: async (newBase) => {
      await utils.base.listBases.invalidate(); // Refresh the base list
      router.push(`/base/${newBase.id}`); // Redirect to the new base
    },
    onError: (err, _vars) => {
      console.error("Failed to create base:", err);
      alert("Failed to create base");
    },
  });

  /**
   * Rename base (optimistic, shared across dashboard + base page)
   */
  const renameBaseMutation = trpc.base.renameBase.useMutation({
    onMutate: async ({ baseId, name }) => {
      // Cancel outgoing fetches
      await Promise.all([
        utils.base.listBases.cancel(),
        utils.base.getBaseById.cancel({ baseId }),
      ]);

      // Snapshot previous state
      const previousBases = utils.base.listBases.getData() ?? [];
      const previousBase = utils.base.getBaseById.getData({ baseId });

      // Optimistically update dashboard list
      utils.base.listBases.setData(
        undefined,
        (old) => old?.map((b) => (b.id === baseId ? { ...b, name } : b)) ?? [],
      );

      // Optimistically update base page
      if (previousBase) {
        utils.base.getBaseById.setData({ baseId }, { ...previousBase, name });
      }

      return { previousBases, previousBase };
    },

    onError: (_err, vars, ctx) => {
      if (!ctx) return;

      utils.base.listBases.setData(undefined, ctx.previousBases);

      if (ctx.previousBase) {
        utils.base.getBaseById.setData(
          { baseId: vars.baseId },
          ctx.previousBase,
        );
      }
    },

    onSettled: async (_data, _error, vars) => {
      await Promise.all([
        utils.base.listBases.invalidate(),
        utils.base.getBaseById.invalidate({ baseId: vars.baseId }),
      ]);
    },
  });

  /**
   * Delete base (optimistic, handles redirect)
   */
  const deleteBaseMutation = trpc.base.deleteBase.useMutation({
    onMutate: async ({ baseId }) => {
      await utils.base.listBases.cancel();

      const previousBases = utils.base.listBases.getData() ?? [];

      // Optimistically remove from dashboard
      utils.base.listBases.setData(
        undefined,
        (old) => old?.filter((b) => b.id !== baseId) ?? [],
      );

      return { previousBases };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousBases) {
        utils.base.listBases.setData(undefined, ctx.previousBases);
      }
      alert("Failed to delete base");
    },

    onSettled: async () => {
      await utils.base.listBases.invalidate();
    },
  });

  const handleCreateBase = useCallback(
    (name: string) => {
      return createBaseMutation.mutateAsync({ name });
    },
    [createBaseMutation],
  );

  const handleRenameBase = useCallback(
    (baseId: string, oldName: string) => {
      const newName = prompt("Set new name for base:", oldName);
      if (!newName?.trim()) {
        alert("Base name cannot be empty");
        return;
      }
      return renameBaseMutation.mutate({ baseId, name: newName });
    },
    [renameBaseMutation],
  );

  const handleDeleteBase = useCallback(
    (baseId: string, name: string) => {
      if (!window.confirm(`Delete base "${name}"?`)) return;
      return deleteBaseMutation.mutate({ baseId });
    },
    [deleteBaseMutation],
  );

  return {
    handleCreateBase,
    handleRenameBase,
    handleDeleteBase,
  };
}
