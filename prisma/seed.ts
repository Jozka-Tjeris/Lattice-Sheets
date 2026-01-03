import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { faker } from '@faker-js/faker';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create a user (normally NextAuth would do this)
  const user = await prisma.user.create({
    data: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
    },
  });

  // 2. Create a base
  const base = await prisma.base.create({
    data: {
      name: 'Demo Base',
      ownerId: user.id,
    },
  });

  // 3. Create a table
  const table = await prisma.table.create({
    data: {
      name: 'People',
      baseId: base.id,
    },
  });

  // 4. Create columns
  const nameColumn = await prisma.column.create({
    data: { name: 'Name', type: 'text', order: 0, tableId: table.id },
  })

  const emailColumn = await prisma.column.create({
    data: { name: 'Email', type: 'text', order: 1, tableId: table.id },
  })

  const ageColumn = await prisma.column.create({
    data: { name: 'Age', type: 'number', order: 2, tableId: table.id },
  })

  // 5. Create rows + cells
  const ROW_COUNT = 100;

  for (let i = 0; i < ROW_COUNT; i++) {
    const row = await prisma.row.create({
      data: { tableId: table.id },
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

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally( async () => {
    await prisma.$disconnect()
    await pool.end()
  });

  // To run: npx tsx prisma/seed.ts