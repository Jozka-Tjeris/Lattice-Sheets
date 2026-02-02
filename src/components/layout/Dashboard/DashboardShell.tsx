import { TopBar } from "./TopBar";
import { Sidebar } from "./SideBar";
import { BaseList } from "./BaseList";
import { MobileWarning } from "~/components/ui/MobileWarning";

function MainDashboardContent() {
  return (
    <main className="flex flex-1 flex-col bg-white/20 p-4 min-h-0">
      <div className="flex flex-1 flex-col bg-white/50 p-4 rounded-xl min-h-0">
        <h1 className="mb-4 text-[28px] font-semibold shrink-0">
          Home
        </h1>
        <div className="flex-1 overflow-auto min-h-0 overscroll-contain pr-1">
          <BaseList />
        </div>
      </div>
    </main>
  );
}

export function DashboardShell() {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <img
        src="/backgrounds/low-poly-grid-stormy-teal.svg"
        className="absolute inset-0 h-full w-full object-cover opacity-100"
        aria-hidden
      />
      <div className="relative z-10 flex h-full flex-col min-h-0">
        <TopBar />
        <MobileWarning />
        <div className="flex flex-1 flex-row min-h-0">
          <Sidebar />
          <MainDashboardContent />
        </div>
      </div>
    </div>
  );
}
