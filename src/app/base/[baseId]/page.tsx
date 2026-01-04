import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { BaseTable } from "~/components/table/BaseTable";

export default async function BasePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col h-full">
      <BaseTable />
    </div>
  );
}