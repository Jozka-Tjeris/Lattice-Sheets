import type { CellMap, Column, TableRow } from "../controller/tableTypes";


export const columns: Column[] = [
  { id: "name",   label: "Name",   type: "text",   width: 200 },
  { id: "status", label: "Status", type: "text",   width: 150 },
  { id: "owner",  label: "Owner",  type: "text",   width: 150 },
];

export const rows: TableRow[] = Array.from({ length: 3 }, (_, i) => ({
  id: `row-${i}`,
  order: i
}));

export const cells: CellMap = Object.fromEntries(
  rows.flatMap((row, i) => [
    [`${row.id}:name`,   `Task ${i + 1}`],
    [`${row.id}:status`, (i%2 === 0) ? "In progress" : "Not in progress"],
    [`${row.id}:owner`,  "Alex"],
  ])
);
