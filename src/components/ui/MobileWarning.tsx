"use client";

import { useEffect, useState } from "react";

function useLikelyMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile =
        window.matchMedia("(pointer: coarse)").matches &&
        window.innerWidth <= 1024;

      setIsMobile(mobile);
    };

    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

export function MobileWarning() {
  const isMobile = useLikelyMobile();
  const [dismissed, setDismissed] = useState(
    typeof window !== "undefined" &&
      localStorage.getItem("mobile-warning-dismissed") === "true"
  );

  if (!isMobile || dismissed) return null;

  return (
    <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-3 text-sm text-yellow-900 flex items-center justify-between">
      <span>
        Heads up: This app isn't fully supported on mobile or touch-only
        devices. Some features may not work as intended.
      </span>
      <button
        className="ml-4 font-semibold underline"
        onClick={() => {
          localStorage.setItem("mobile-warning-dismissed", "true");
          setDismissed(true);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
