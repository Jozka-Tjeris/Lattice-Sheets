"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { useBaseMutations } from "~/components/base/useBaseMutations";
import { useTableIO } from "~/components/table/controller/useTableIO";
import { WebsiteIcon } from "~/components/ui/WebsiteIcon";

interface TopBarProps {
  tableId: string;
  baseId: string;
  allowAction: boolean;
  baseQueryData?: {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
    iconColor: string;
  } | undefined;
}

export function TopBar({ tableId, baseId, allowAction, baseQueryData }: TopBarProps) {
  const { handleRenameBase } = useBaseMutations();
  const { exportJson, exportCsv, importJson, isExporting, isImporting } = useTableIO();
  const [fileInput, setFileInput] = useState<File | null>(null);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
    // The selected files are in event.target.files, which is a FileList object.
    const files = event.target.files;
    setFileInput((files && files.length > 0) ? files[0]! : null);
  }, [setFileInput]);

  return (
    <div className="border-gray-750 flex h-14 shrink-0 flex-row border-b bg-gray-50">
      <div className="flex h-full w-[30%] flex-row items-center">
        <div
          className="flex items-center justify-center mx-2 h-8 w-8 rounded-sm bg-gray-200"
          style={{ backgroundColor: baseQueryData?.iconColor }}
        >
          <WebsiteIcon height={25} fillColor="#ffffff"/>
        </div>
        <div className="flex h-full flex-1 items-center min-w-0"> {/* Parent handles alignment */}
          <span
            className="block truncate px-2 select-none" // Child handles truncation
            title={baseQueryData?.name ?? ""}
          >
            {baseQueryData?.name ?? ""}
          </span>
          {baseQueryData && (
            <button
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
              onClick={() => handleRenameBase(baseId, baseQueryData?.name ?? "")}
              title="Rename"
            >
              ✏️
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 justify-end">
        <div className={`flex items-center gap-2 pr-2`}>
          {(isExporting || isImporting) && (
            <span className="text-sm">Loading...</span>
          )}
          <input
            id="json-upload"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <label
            htmlFor="json-upload"
            className="cursor-pointer bg-gray-200 px-3 py-[6] rounded-sm hover:bg-gray-300 text-sm min-w-[12%]"
          >
            {fileInput ? "Change file" : "Select JSON file"}
          </label>

          {fileInput && (
            <span className="text-sm text-gray-600 truncate max-w-[88%]">
              {fileInput.name}
            </span>
          )}
        </div>
        <div className="flex items-center pr-1">
          <button 
            className="bg-gray-200 px-2 py-1 rounded-sm hover:bg-gray-300 cursor-pointer disabled:cursor-not-allowed"
            onClick={() => {
              if(!fileInput){
                alert("Pick a file first");
                return;
              }
              void importJson(fileInput, { mode: "existing-base", baseId }, baseId);
            }}
            disabled={allowAction}
          >
            <span className="text-sm truncate">
              Import JSON as table
            </span>
          </button>
        </div>
        <div className="flex items-center pr-1">
          <button 
            className="bg-gray-200 px-2 py-1 mx-1 rounded-sm hover:bg-gray-300 cursor-pointer disabled:cursor-not-allowed"
            onClick={() => exportJson(tableId)} 
            disabled={allowAction}
          >
            <span className="text-sm truncate">
              Export as JSON
            </span>
          </button>
          <button 
            className="bg-gray-200 px-2 mx-1 py-1 rounded-sm hover:bg-gray-300 cursor-pointer disabled:cursor-not-allowed"
            onClick={() => exportCsv(tableId)}
            disabled={allowAction}
          >
            <span className="text-sm truncate">
              Export as CSV
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
