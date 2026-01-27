"use client";

import { api as trpc } from "~/trpc/react";
import { BaseIcon } from "./BaseIcon";

export function BaseList() {
  const { data: bases, isLoading } = trpc.base.listBases.useQuery();

  if (isLoading) return <div>Loading bases…</div>;
  if (!bases || bases.length === 0) return <div>No bases yet</div>;

  return (
    /* Changed 'space-y-2' to a responsive grid:
       - grid: enables CSS Grid
       - grid-cols-1: default 1 column (mobile)
       - md:grid-cols-2: 2 columns on medium screens
       - lg:grid-cols-3: 3 columns on large screens
       - gap-4: spacing between the cards
    */
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {bases.map((base, idx) => (
        <BaseIcon
          key={base.id}
          baseId={base.id}
          name={base.name}
          updatedAt={base.updatedAt}
          tabIndex={idx}
        />
      ))}
    </div>
  );
}
