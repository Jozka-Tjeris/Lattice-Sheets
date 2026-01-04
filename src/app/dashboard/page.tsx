import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  
  return <DashboardShell />;
}