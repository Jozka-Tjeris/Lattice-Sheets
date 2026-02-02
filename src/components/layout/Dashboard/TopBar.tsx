"use client";

import { signIn, useSession } from "next-auth/react";
import { MoreInfoIcon } from "~/components/ui/MoreInfoIcon";
import { UserAccountNav } from "~/components/ui/UserAccountNav";
import { WebsiteIcon } from "~/components/ui/WebsiteIcon";

export function TopBar() {
  const { data: session } = useSession();

  return (
    <nav className="flex h-14 w-full flex-row items-center border-b p-4 bg-white">
      {/* --- Left section --- */}
      <div className="flex flex-auto items-center">
        <WebsiteIcon height={40} />
        <span className="text-xl px-2"
        style={{
          fontFamily: '"American Typewriter", "Courier New", Courier, serif'
        }}
        >Lattice</span>
      </div>

      {/* --- Middle section --- */}
      <div className="flex flex-auto justify-center">
        <div className="flex w-full max-w-[400px] cursor-text items-center rounded bg-gray-100 px-[8px] py-[4px] shadow hover:shadow-md">
          <p className="ml-[4px] flex-auto truncate text-sm text-gray-500">Search...</p>
        </div>
      </div>

      {/* --- Right section --- */}
      <div className="flex flex-auto items-center justify-end space-x-[6px]">
        <MoreInfoIcon />

        {/* User account dropdown */}
        {session ? (
          <UserAccountNav session={session} side="bottom" align="end" />
        ) : (
          <button onClick={() => signIn("google")}>Sign In</button>
        )}
      </div>
    </nav>
  );
}
