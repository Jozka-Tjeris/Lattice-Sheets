import Link from "next/link";
import { useEffect, useState } from "react";

export function MoreInfoIcon(){
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div>
      <div
        className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full bg-gray-100 text-sm font-medium hover:bg-gray-200"
        onClick={() => setIsOpen(true)}
        aria-label="More information about this project"
        title="About this project"
      >
        ?
      </div>
      {isOpen && (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setIsOpen(false)}>
              &#xD7;
            </button>

            <h2 className="text-lg font-semibold">About this project</h2>

            <p className="mt-3 text-sm text-gray-700">
              Lattice Sheets is an Airtable-inspired spreadsheet application
              focused on UX-driven architecture, optimistic updates, and
              resilient state management.
            </p>

            <div className="mt-4 text-sm text-gray-700">
              <p className="font-medium">What it focuses on:</p>
              <ul className="mt-1 list-disc pl-5">
                <li>Spreadsheet-like interactions (keyboard-first editing)</li>
                <li>Optimistic UI updates with batched persistence</li>
                <li>Clear separation of table structure, views, and UI state</li>
              </ul>
            </div>

            <p className="mt-4 text-sm text-gray-700">
              Built using the T3 stack (Next.js, tRPC, Prisma, PostgreSQL,
              Tailwind).
            </p>

            <div className="mt-5 text-sm text-gray-700">
              <p>Created by <span className="font-medium">Jozka N. T.</span></p>
              <p className="mt-1">
                View the project on{" "}
                <Link
                  href="https://github.com/Jozka-Tjeris/Airtable-like-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
