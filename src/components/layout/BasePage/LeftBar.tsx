"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { MoreInfoIcon } from "~/components/ui/MoreInfoIcon";
import { UserAccountNav } from "~/components/ui/UserAccountNav";

export function LeftBar() {
  const { data: session } = useSession();

  return (
    <aside className="border-gray-200 w-14 flex-shrink-0 border-r bg-white h-screen print:hidden">
      <div className="flex h-full w-14 flex-col justify-between py-2 px-1">
        {/* Top Section */}
        <div className="flex flex-col items-center gap-2">
          {/* Home Button */}
          <Link
            href="/dashboard"
            className="relative flex h-10 w-10 items-center justify-center rounded-full cursor-pointer border border-transparent hover:bg-gray-100"
          >
            <svg width="28px" height="28px" viewBox="0 1 24 24" id="home" xmlns="http://www.w3.org/2000/svg" className="icon flat-color">
              <rect x="8" y="13" width="8" height="9" className="fill-white"></rect>
              <path d="M21.71,12.71a1,1,0,0,1-1.42,0L20,12.42V20.3A1.77,1.77,0,0,1,18.17,22H16a1,1,0,0,1-1-1V15.1a1,1,0,0,0-1-1H10a1,1,0,0,0-1,1V21a1,1,0,0,1-1,1H5.83A1.77,1.77,0,0,1,4,20.3V12.42l-.29.29a1,1,0,0,1-1.42,0,1,1,0,0,1,0-1.42l9-9a1,1,0,0,1,1.42,0l9,9A1,1,0,0,1,21.71,12.71Z" className="fill-black"></path>
            </svg>
          </Link>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-1.5">
          <MoreInfoIcon />

          {/* Account Dropdown */}
          {session ? (
            <UserAccountNav session={session} side="right" align="end" />
          ) : (
            <button onClick={() => signIn("google")}>Login</button>
          )}
        </div>
      </div>
    </aside>
  );
}
