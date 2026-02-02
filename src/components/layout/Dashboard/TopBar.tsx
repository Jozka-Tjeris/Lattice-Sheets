"use client";

import { signIn, useSession } from "next-auth/react";
import { UserAccountNav } from "~/components/ui/UserAccountNav";

export function TopBar() {
  const { data: session } = useSession();

  return (
    <nav className="flex h-14 w-full flex-row items-center border-b p-4">
      {/* --- Left section --- */}
      <div className="flex flex-auto items-center">
        (Icon) (Name)
      </div>

      {/* --- Middle section --- */}
      <div className="flex flex-auto justify-center">
        <div className="flex w-full max-w-[400px] cursor-text items-center rounded bg-gray-100 px-[8px] py-[4px] shadow hover:shadow-md">
          <p className="ml-[4px] flex-auto truncate text-sm text-gray-500">Search...</p>
        </div>
      </div>

      {/* --- Right section --- */}
      <div className="flex flex-auto items-center justify-end space-x-[6px]">
        {/* Help & Notifications (Original Logic Kept) */}
        <div className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200">
            ?
        </div>

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
