"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { useBaseMutations } from "~/components/base/useBaseMutations";
import { useTableIOController } from "~/components/table/controller/TableProvider";
import { api as trpc } from "~/trpc/react";

interface TopBarProps {
  tableId: string;
  baseId: string;
  allowAction: boolean;
}

export function TopBar({ tableId, baseId, allowAction }: TopBarProps) {
  const { handleRenameBase } = useBaseMutations();
  const { exportJson, importJson, isExporting, isImporting } = useTableIOController();
  const baseNameQuery = trpc.base.getBaseById.useQuery({ baseId });
  const [fileInput, setFileInput] = useState<File | null>(null);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
    // The selected files are in event.target.files, which is a FileList object.
    const files = event.target.files;
    setFileInput((files && files.length > 0) ? files[0]! : null);
  }, [setFileInput]);

  return (
    <div className="border-gray-750 flex h-14 shrink-0 flex-row border-b bg-gray-50">
      <div className="flex h-full w-[40%] flex-row items-center">
        <div
          data-testid="universal-top-nav-icon-background"
          className="mx-2 h-8 w-8 rounded-sm bg-blue-600"
        >
          <div className="relative mx-1 my-[6px]">
            <svg
              width="24"
              height="20.4"
              viewBox="0 0 200 170"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                <path
                  fill="hsla(0, 0%, 100%, 0.95)"
                  d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675"
                ></path>
                <path
                  fill="hsla(0, 0%, 100%, 0.95)"
                  d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608"
                ></path>
                <path
                  fill="hsla(0, 0%, 100%, 0.95)"
                  d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"
                ></path>
              </g>
            </svg>
          </div>
        </div>
        <div className="flex h-full flex-1 items-center min-w-0"> {/* Parent handles alignment */}
          <span
            className="block truncate px-2 select-none" // Child handles truncation
            title={baseNameQuery.data?.name ?? ""}
          >
            {baseNameQuery.data?.name ?? ""}
          </span>
          <button
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
            onClick={() => handleRenameBase(baseId, baseNameQuery.data?.name ?? "")}
            title="Rename"
          >
            ✏️
          </button>
        </div>
      </div>
      <div className="flex flex-1">
        <div className="flex w-[10%] items-center justify-center gap-2">
          {(isExporting || isImporting) && (
            <span>Loading...</span>
          )}
        </div>
        <div className="flex w-[30%] items-center justify-center gap-2">
          <input
            id="json-upload"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <label
            htmlFor="json-upload"
            className="cursor-pointer bg-gray-200 px-3 py-1 rounded-sm hover:bg-gray-300"
          >
            {fileInput ? "Change file" : "Select JSON file"}
          </label>

          {fileInput && (
            <span className="text-sm text-gray-600 truncate max-w-[150px]">
              {fileInput.name}
            </span>
          )}
        </div>
        <div className="flex w-[30%] items-center justify-center">
          <button 
            className="bg-gray-200 px-2 py-1 rounded-sm"
            onClick={() => {
              if(!fileInput){
                alert("Pick a file first");
                return;
              }
              importJson(fileInput, { mode: "existing-base", baseId }, baseId)
            }}
            disabled={allowAction}
          >
            <span>
              Import table data
            </span>
          </button>
        </div>
        <div className="flex w-[30%] items-center justify-center">
          <button 
            className="bg-gray-200 px-2 py-1 rounded-sm"
            onClick={() => exportJson(tableId)} 
            disabled={allowAction}
          >
            <span>
              Export table data
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
