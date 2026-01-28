"use client";

import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import type { Session } from "next-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserAccountNavProps {
  session: Session;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function UserAccountNav({ session, side = "right", align = "end" }: UserAccountNavProps) {
  const initials = session.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-7 w-7 items-center justify-center rounded-full border border-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden bg-blue-600 cursor-pointer">
          <span className="text-[10px] font-semibold text-white">{initials}</span>
          {session.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? ""}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-64 ml-2">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center space-x-3 py-1">
            <div className="relative h-9 w-9 flex-none overflow-hidden rounded-full bg-blue-600">
              {session.user?.image ? (
                <Image src={session.user.image} alt="" fill referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[11px] text-white font-bold">
                  {initials}
                </span>
              )}
            </div>
            <div className="flex flex-col space-y-0.5 overflow-hidden text-black">
              <p className="text-sm font-medium leading-none truncate">{session.user?.name}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {session.user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          Account Settings
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => signIn("google", { prompt: "select_account" })}
        >
          Switch Account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
