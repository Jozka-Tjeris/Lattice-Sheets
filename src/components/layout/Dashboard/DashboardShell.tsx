import { TopBar } from "./TopBar";
import { Sidebar } from "./SideBar";
import { BaseList } from "./BaseList";


function MainDashboardContent(){
    return (
    <main className="flex-1 p-8 overflow-auto bg-[#f9fafb]">
      <h1 className="text-[27px] font-semibold mb-4">Home</h1>
      <h3 className="text-sm mb-4">Opened Anytime</h3>
      <div className="grid grid-cols-2 gap-4">
        <BaseList/>
      </div>
    </main>
  );
}

export function DashboardShell() {
  return <div className="flex flex-col h-screen">
    <TopBar />
    <div className="flex flex-row flex-1">
        <Sidebar />
        <MainDashboardContent />
    </div>
  </div>;
}
