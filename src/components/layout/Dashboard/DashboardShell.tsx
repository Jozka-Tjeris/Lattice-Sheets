import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
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

/*
<div className="flex">
<div className="flex flex-col">
<div className="flex items-center">
<div className="flex justify-between">

flex	display: flex
flex-col	vertical layout
items-center	align-items
justify-between	space between

<div className="h-screen w-screen flex">
h-screen → full viewport height

w-screen → full viewport width
*/

/*
p-4   = padding: 1rem
px-4  = padding-left/right
py-2  = padding-top/bottom

p-2	tight spacing
p-4	standard
px-4	top bars
gap-2	space between flex items
*/

/*
border
border-b
border-r
border-dashed

Subtle borders (very Airtable)

border border-muted
border-b border-border

You’ll often combine:

<div className="border-b h-12 flex items-center px-4" />
*/

/*
text-sm
text-xs
font-medium
font-semibold

Typical dashboard text

<div className="text-sm font-medium">Table name</div>
<div className="text-xs text-muted-foreground">Grid view</div>
*/