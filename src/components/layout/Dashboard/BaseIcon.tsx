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

  // Calculate the difference in days
  const diffInDays = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine the display message
  const timeMessage = diffInDays === 0 
    ? "Created today" 
    : `Created ${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;

  function capitalizeFirstLetter(label: string) {
    if (label.length === 0) {
      return "Un";
    }
    return label.charAt(0).toUpperCase() + label.charAt(1).toLowerCase();
  }

  return (
    <div
      className="group relative flex h-24 items-center rounded-md border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg"
      tabIndex={tabIndex}
    >
      {/* Icon Square */}
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[#006d77] text-xl font-medium text-white">
        <span>{capitalizeFirstLetter(name)}</span>
      </div>

      {/* Content Area - Now using flex-1 for better grid scaling */}
      <div className="ml-3 flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between">
          <a className="truncate pr-2" href={`/base/${baseId}`}>
            <h3 className="truncate font-medium text-gray-900" title={name}>
              {name}
            </h3>
          </a>
          
          {/* Actions Container */}
          <div className="flex shrink-0 items-center space-x-1 opacity-100 transition-opacity">
            <button
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
              onClick={() => handleRenameBase(baseId, name)}
              title="Rename"
            >
              ✏️
            </button>
            <button
              className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
              onClick={() => handleDeleteBase(baseId, name)}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          <span>{timeMessage}</span>
        </div>
      </div>
    </div>
  );
}
