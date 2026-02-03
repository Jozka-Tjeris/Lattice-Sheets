"use client";

import { TopBar } from "./TopBar";
import { Sidebar } from "./SideBar";
import { BaseList } from "./BaseList";
import { MobileWarning } from "~/components/ui/MobileWarning";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

function MainDashboardContent({ isDarkTheme }: { isDarkTheme: boolean}) {
  return (
    <main className="flex flex-1 flex-col p-4 min-h-0">
      <div className={`flex flex-1 flex-col p-4 rounded-xl min-h-80 ${isDarkTheme ? "bg-gray-400/35" : "bg-black/15"}`}>
        <h1 className="mb-4 pl-2 text-[28px] shrink-0 bg-white/70 rounded-md"
        style={{
          fontFamily: '"American Typewriter", "Courier New", Courier, serif'
        }}
        >
          Home
        </h1>
        <div className="flex-1 overflow-auto min-h-0 overscroll-contain">
          <BaseList />
        </div>
      </div>
    </main>
  );
}

const backgroundDirs: string[] = [
  "/backgrounds/", 
  "/backgrounds-dark/"
];

const backgroundThemes: string[] = [
  "low-poly-grid-stormy-teal.svg",
  "low-poly-grid-pearl-aqua.svg",
  "low-poly-grid-alice-blue.svg",
  "low-poly-grid-floral-white.svg",
  "low-poly-grid-almond-silk.svg",
  "low-poly-grid-tangerine-dream.svg"
];

export function DashboardShell() {
  const { data: session } = useSession();
  const [themeDir, setThemeDir] = useState<0 | 1>(0);
  const [themeIdx, setThemeIdx] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [bgSource, setBgSource] = useState<string | null>(null);
  const [hasLoadedTheme, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoadedTheme || !session?.user.email) return;

    const nextBg = backgroundDirs[themeDir] + backgroundThemes[themeIdx]!;
    setBgSource(nextBg);
    localStorage.setItem(session.user.email, `${themeDir}_${themeIdx}`);
  }, [themeIdx, themeDir, session?.user.email, hasLoadedTheme]);

  useEffect(() => {
    if(hasLoadedTheme || !session?.user.email) return;

    const preloadedTheme = localStorage.getItem(session?.user.email);

    if(preloadedTheme){
      const loadedResult = preloadedTheme.split("_");
      try{
        setThemeDir(Number(loadedResult[0]) as typeof themeDir);
        setThemeIdx(Number(loadedResult[1]) as typeof themeIdx);
      } catch{};
    }
    else{
      setBgSource(backgroundDirs[0] + backgroundThemes[0]!);
    }
    setHasLoaded(true);
  }, [session?.user.email, hasLoadedTheme]);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="fixed inset-0 -z-10 pointer-events-none bg-neutral-200 dark:bg-neutral-900">
        {bgSource && (
          <Image
            src={bgSource}
            alt="low-poly-background-image"
            fill
            unoptimized={bgSource.endsWith('.svg')}
            className="object-cover transition-opacity duration-500"
            aria-hidden
          />
        )}
      </div>
      <div className="relative z-10 flex h-dvh flex-col min-h-0">
        <TopBar setTheme={setThemeIdx} setThemeGroup={setThemeDir} themeGroup={themeDir}/>
        <MobileWarning />
        <div className="flex flex-1 flex-row min-h-0">
          <Sidebar isDarkTheme={themeDir === 1} currentTheme={themeIdx}/>
          <MainDashboardContent isDarkTheme={themeDir === 1}/>
        </div>
      </div>
    </div>
  );
}
