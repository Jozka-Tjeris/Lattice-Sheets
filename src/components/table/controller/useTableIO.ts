import { useCallback, useState } from "react";
import type { ImportTarget, IOTablePayload } from "~/server/services/tableIOtypes";
import { api as trpc } from "~/trpc/react";

export function useTableIO() {
  const utils = trpc.useUtils();

  const importTable = trpc.table.importTable.useMutation();
  const [isExporting, setIsExporting] = useState(false);

  // ---------- Shared download logic ----------
  const downloadFile = useCallback((data: string, filename: string, type: string) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ---------- EXPORT JSON ----------
  const exportJson = useCallback(async (tableId: string) => {
    setIsExporting(true);
    try {
      const data = await utils.table.exportTable.fetch({ tableId });
      if (!data) throw new Error("Failed to export table");

      downloadFile(JSON.stringify(data, null, 2), `${data.name ?? "table"}.json`, "application/json");
    } finally {
      setIsExporting(false);
    }
  }, [utils, downloadFile]);

  // ---------- EXPORT CSV ----------
  const exportCsv = useCallback(async (tableId: string) => {
    setIsExporting(true);
    try {
      const data = await utils.table.exportTableCsv.fetch({ tableId });
      if (!data) throw new Error("Failed to export table");

      downloadFile(data.csv, `${data.name ?? "table"}.csv`, "text/csv");
    } finally {
      setIsExporting(false);
    }
  }, [utils, downloadFile]);

  // ---------- IMPORT JSON ----------
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
    exportCsv,
    importJson,
    isExporting,
    isImporting: importTable.isPending,
  };
}
