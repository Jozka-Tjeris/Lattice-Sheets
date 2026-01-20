import { useBaseMutations } from "~/components/base/useBaseMutations";

export function BaseIcon({
  baseId,
  name,
  updatedAt,
  tabIndex,
}: {
  baseId: string;
  name: string;
  updatedAt: Date;
  tabIndex: number;
}) {
  const { handleRenameBase, handleDeleteBase } = useBaseMutations();
  return (
    <div
      className="flex relative rounded-md bg-white p-4 border border-gray-200"
      tabIndex={tabIndex}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-[#0d7f78] text-white">
        <span>{name.slice(0, 2) ?? "U"}</span>
      </div>

      <div className="flex flex-col ml-2 justify-center w-[75%]">
        <div className="flex flex-row">
          <a className="flex flex-1" href={`/base/${baseId}`}>
            <h3 className="font-normal">{name}</h3>
          </a>
          <button className="px-4 w-6 cursor-pointer" 
            onClick={() => {
                const newName = prompt("Set new name for base:");
                if(newName === null) return;
                if(newName.trim() === ""){
                    alert("Base name cannot be empty");
                    return;
                }
                handleRenameBase(baseId, newName.trim());
            }}>
            ✏️
          </button>
          <button className="px-4 w-6 cursor-pointer"
            onClick={() => {
              if (window.confirm(`Delete base?`)) handleDeleteBase(baseId);
            }}>
            🗑️
          </button>
        </div>
        <div className="text-xs text-gray-500">
          <span>
            Opened {Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60))} hours ago
          </span>
        </div>
      </div>
    </div>
  );
}
