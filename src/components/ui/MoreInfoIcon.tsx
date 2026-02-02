import Link from "next/link";
import { useEffect, useState } from "react";

export function MoreInfoIcon(){
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: { key: string; }) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div>
      <div className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
        onClick={() => setIsOpen(true)}
        >
          ?
      </div>
      {isOpen && (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close" onClick={() => setIsOpen(false)}>
              &#xD7;
            </button>
            <h2>About This Project</h2>
            <br/>
            <p>A spreadsheet app aimed at simplicity and straightforward use</p>
            <br/>
            <p>Created by: Jozka N. T.</p>
            <br/>
            <p>
              View the project on{" "}
              <Link href="https://github.com/Jozka-Tjeris/Airtable-like-app" target="_blank" rel="noopener noreferrer">GitHub</Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}