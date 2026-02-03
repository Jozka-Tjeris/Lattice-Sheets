"use client";

import { signIn, useSession } from "next-auth/react";
import type { Dispatch, SetStateAction } from "react";
import { MoreInfoIcon } from "~/components/ui/MoreInfoIcon";
import { ThemeSelectorButton } from "~/components/ui/ThemeSelectorButton";
import { UserAccountNav } from "~/components/ui/UserAccountNav";
import { WebsiteIcon } from "~/components/ui/WebsiteIcon";

interface TopBarProps{
  themeGroup: number;
  setThemeGroup: Dispatch<SetStateAction<0 | 1>>;
  setTheme: Dispatch<SetStateAction<0 | 1 | 2 | 3 | 4 | 5>>;
}

export function TopBar({ themeGroup, setTheme, setThemeGroup }: TopBarProps) {
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
        <div className="flex w-full max-w-[300px] cursor-text justify-center items-center rounded bg-gray-100 px-[8px] py-[4px] shadow">
          <ThemeSelectorButton size={24} fillValue="bg-stormy-teal" onPress={() => setTheme(0)}/>
          <ThemeSelectorButton size={24} fillValue="bg-pearl-aqua" onPress={() => setTheme(1)}/>
          <ThemeSelectorButton size={24} fillValue="bg-alice-blue" onPress={() => setTheme(2)}/>
          <ThemeSelectorButton size={24} fillValue="bg-floral-white" onPress={() => setTheme(3)}/>
          <ThemeSelectorButton size={24} fillValue="bg-almond-silk" onPress={() => setTheme(4)}/>
          <ThemeSelectorButton size={24} fillValue="bg-tangerine-dream" onPress={() => setTheme(5)}/>
          <ThemeSelectorButton size={24} fillValue="bg-gray-500" onPress={() => setThemeGroup(prev => prev === 0 ? 1 : 0)}>
            <span className={`${themeGroup === 0 ? "text-white" : "text-black"} font-semibold`}>T</span>
          </ThemeSelectorButton>
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
