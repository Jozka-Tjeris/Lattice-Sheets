import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { faker } from "@faker-js/faker";

const SEED_OWNER_ID = "";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("❌ Seed script must not run in production");
  }

  if (!SEED_OWNER_ID) {
    throw new Error("SEED_OWNER_ID is required for seeding");
  }

  // 1. Verify owner exists
  const owner = await prisma.user.findUnique({
    where: { id: SEED_OWNER_ID },
    select: { id: true },
  });
  if (!owner) throw new Error(`Seed owner not found. ID: ${SEED_OWNER_ID}`);

  // 2. Create base
  const base = await prisma.base.create({
    data: { name: "Virtualization testing Base", ownerId: SEED_OWNER_ID },
  });

  // 3. Create table
  const table = await prisma.table.create({
    data: { name: "Test table", baseId: base.id },
  });

  // 4. Create columns
  const [nameColumn, emailColumn, ageColumn] = await Promise.all([
    prisma.column.create({ data: { name: "Name", columnType: "text", order: 0, tableId: table.id } }),
    prisma.column.create({ data: { name: "Email", columnType: "text", order: 1, tableId: table.id } }),
    prisma.column.create({ data: { name: "Age", columnType: "number", order: 2, tableId: table.id } }),
  ]);

  // 5. Generate row data
  const ROW_COUNT = 5000;
  const ROW_CHUNK = 1000;
  let rowIds: string[] = [];

  for (let i = 0; i < ROW_COUNT; i += ROW_CHUNK) {
    const chunk = Array.from({ length: Math.min(ROW_CHUNK, ROW_COUNT - i) }, (_, j) => ({
      tableId: table.id,
      order: i + j + 1,
    }));

    // Prisma createMany does not return IDs, so we fetch inserted rows by table + order
    await prisma.row.createMany({ data: chunk });
    const inserted = await prisma.row.findMany({
      where: { tableId: table.id, order: { gte: i + 1, lte: i + chunk.length + i } },
      select: { id: true },
      orderBy: { order: "asc" },
    });
    rowIds.push(...inserted.map((r) => r.id));
  }

  // 6. Generate cell data in batches
  const CELL_CHUNK = 2000;
  const cellsData: { rowId: string; columnId: string; tableId: string; value: string }[] = [];

  for (const rowId of rowIds) {
    cellsData.push(
      { rowId, columnId: nameColumn.id, tableId: table.id, value: faker.person.fullName() },
      { rowId, columnId: emailColumn.id, tableId: table.id, value: faker.internet.email() },
      { rowId, columnId: ageColumn.id, tableId: table.id, value: faker.number.int({ min: 18, max: 80 }).toString() }
    );
  }

  for (let i = 0; i < cellsData.length; i += CELL_CHUNK) {
    const chunk = cellsData.slice(i, i + CELL_CHUNK);
    await prisma.cell.createMany({ data: chunk });
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
