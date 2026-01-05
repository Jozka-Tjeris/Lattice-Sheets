import { TopBar } from "./TopBar";
import { Sidebar } from "./SideBar";
import { BaseIcon } from "./BaseIcon";


function MainContent(){
    return (
    <main className="flex-1 p-8 overflow-auto bg-[#f9fafb]">
      <h1 className="text-[27px] font-semibold mb-4">Home</h1>
      <h3 className="text-sm mb-4">Opened Anytime</h3>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <BaseIcon key={i} value={i}/>
        ))}
      </div>
    </main>
  );
}

export function DashboardShell() {
  return <div className="flex flex-col h-screen">
    <TopBar />
    <div className="flex flex-row flex-1">
        <Sidebar />
        <MainContent />
    </div>
  </div>;
}
