"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })} // async call inside click handler
      className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700"
    >
      Log out
    </button>
  );
}
