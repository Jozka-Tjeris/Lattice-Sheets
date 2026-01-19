import "dotenv/config";
import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { faker } from "@faker-js/faker";
import { SEED_OWNER_ID } from "./seed.config";

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

  // 1. Verify owner exists (fail fast)
  const owner = await prisma.user.findUnique({
    where: { id: SEED_OWNER_ID },
    select: { id: true },
  });

  if (!owner) {
    throw new Error(
      `Seed owner not found. Did you log in at least once?\nID: ${SEED_OWNER_ID}`
    );
  }

  // 2. Create base
  const base = await prisma.base.create({
    data: {
      name: "Demo Base",
      ownerId: SEED_OWNER_ID,
    },
  });

  // 3. Create table
  const table = await prisma.table.create({
    data: {
      name: "Test table",
      baseId: base.id,
    },
  });

  // 4. Create columns
  const [nameColumn, emailColumn, ageColumn] = await Promise.all([
    prisma.column.create({
      data: { name: "Name", columnType: "text", order: 0, tableId: table.id },
    }),
    prisma.column.create({
      data: { name: "Email", columnType: "text", order: 1, tableId: table.id },
    }),
    prisma.column.create({
      data: { name: "Age", columnType: "number", order: 2, tableId: table.id },
    }),
  ]);

  // 5. Create rows + cells
  const ROW_COUNT = 10;

  for (let i = 0; i < ROW_COUNT; i++) {
    const row = await prisma.row.create({
      data: { tableId: table.id, order: i + 1 },
    });

    await prisma.cell.createMany({
      data: [
        {
          rowId: row.id,
          columnId: nameColumn.id,
          value: faker.person.fullName(),
        },
        {
          rowId: row.id,
          columnId: emailColumn.id,
          value: faker.internet.email(),
        },
        {
          rowId: row.id,
          columnId: ageColumn.id,
          value: faker.number.int({ min: 18, max: 80 }).toString(),
        },
      ],
    });
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
