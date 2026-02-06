"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type ChangeEvent } from "react";
import { useBaseMutations } from "~/components/base/useBaseMutations";
import { useTableIO } from "~/components/table/controller/useTableIO";
import { iconColors } from "~/constants/table";

interface SidebarProps{
  isDarkTheme: boolean;
  currentTheme: number;
}

export function Sidebar({ isDarkTheme, currentTheme }: SidebarProps) {
  const [creating, setCreating] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const { handleCreateBase } = useBaseMutations();
  const { importJson, isImporting } = useTableIO();
  const router = useRouter();

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
    const files = event.target.files;
    setFileInput((files && files.length > 0) ? files[0]! : null);
  }, [setFileInput]);

  return (
    <aside className={`flex min-h-110 w-75 flex-col shrink-0 gap-2 p-4 ${isDarkTheme ? "bg-gray-400/50" : "bg-black/30"}`}>
      <div className="h-[45%] flex flex-col justify-end gap-2 py-2">
        <input
          id="json-upload"
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {fileInput && (
          <span className="text-sm text-gray-600 truncate max-w-full text-center">
            File Selected: 
            <br/>
            {fileInput.name}
          </span>
        )}

        <label
          htmlFor="json-upload"
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700`}
        >
          {fileInput ? "Change file" : "Select JSON file"}
        </label>

        <button
          onClick={async () => {
            if (!fileInput) {
              alert("Pick a file first");
              return;
            }

            try {
              const result = await importJson(fileInput, { mode: "new-base", baseName: "Imported Table" }, "");
              if(result) router.push(`base/${result.newBaseId}`);
            } catch (err) {
              alert("Failed to create base");
              console.error(err);
            }
          }}
          disabled={!fileInput || creating || isImporting}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 disabled:text-gray-100"
        >
          {isImporting ? "Importing..." : "Import Table from JSON as New Base"}
        </button>
      </div>

      <div className="flex my-1 p-1 border-t border-b items-center justify-center h-10 border-black bg-white/30">
        <span>OR</span>
      </div>

      <div className="flex flex-1 flex-col justify-start">
        <button
          onClick={async () => {
            setCreating(true);
            try {
              await handleCreateBase("Untitled Base", iconColors[Math.floor(currentTheme / 2)]!);
            } catch (err) {
              alert("Failed to create base");
              console.error(err);
            } finally {
              setCreating(false);
            }
          }}
          disabled={creating || isImporting}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {creating ? "Creating…" : "Create New Base"}
        </button>
      </div>
    </aside>
  );
}
