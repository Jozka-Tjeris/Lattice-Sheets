import { redirect } from "next/navigation";
import { useCallback, useState } from "react";
import type { ImportTarget, IOTablePayload } from "~/server/services/tableIOtypes";
import { api as trpc } from "~/trpc/react";

export function useTableJsonIO() {
  const utils = trpc.useUtils();

  const importTable = trpc.table.importTable.useMutation();

  // ---------- EXPORT ----------
  const [isExporting, setIsExporting] = useState(false);

  const exportJson = useCallback(async (tableId: string) => {
    setIsExporting(true);
    try {
      const data = await utils.table.exportTable.fetch({ tableId });
      if (!data) throw new Error("Failed to export table");

      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name ?? "table"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [utils]);

  // ---------- IMPORT ----------
  const importJson = useCallback(
    async (
      file: File,
      target: ImportTarget,
      baseId: string,
    ) => {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File too large");
      }
      const text = await file.text();
      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON file");
      }

      // Let the server schema be the source of truth
      const { baseId: newBaseId } = await importTable.mutateAsync({
        payload: parsed as IOTablePayload,
        target,
      });

      // Refetch table query based on baseId if applicable, otherwise redirect to new base
      if(target.mode === "existing-base"){
        await utils.table.listTablesByBaseId.invalidate({ baseId });
      } else{
        return { newBaseId };
      }
    },
    [importTable, utils.table.listTablesByBaseId],
  );

  return {
    exportJson,
    importJson,
    isExporting,
    isImporting: importTable.isPending,
  };
}
