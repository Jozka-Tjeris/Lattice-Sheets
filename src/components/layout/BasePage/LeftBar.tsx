"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
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
            T
          </Link>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-1.5">
          {/* Help */}
          <button className="flex h-7 w-7 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100">
            ?
          </button>

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
