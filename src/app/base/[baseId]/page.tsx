import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { BasePageShell } from "~/components/layout/BasePage/BasePageShell";
import { type Metadata } from "next";
import { createTRPCContext } from "~/server/api/trpc";
import { createCaller } from "~/server/api/root";

interface BasePageProps {
  params: Promise<{ baseId: string }>;
}

export async function generateMetadata({ params }: BasePageProps): Promise<Metadata> {
  const ctx = await createTRPCContext({ headers: new Headers() });
  const caller = createCaller(ctx);

  const { baseId } = await params;
  const base = await caller.base.getBaseById({ baseId });

  return {
    title: base?.name ? `${base.name} - Not Airtable` : "Untitled Base - Not Airtable",
  };
}

export default async function BasePage({ params }: BasePageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { baseId } = await params;
  return <BasePageShell baseId={baseId} />;
}
