import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "dotenv";
config();

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const empty = await db.hrCompany.findMany({
    where: { nameEn: "" },
    include: { _count: { select: { employees: true, departments: true } } },
  });

  console.log("Empty-name companies found:", empty.length);
  for (const c of empty) {
    console.log(`  ${c.id} — employees=${c._count.employees} departments=${c._count.departments}`);
    if (c._count.employees === 0 && c._count.departments === 0) {
      await db.hrCompany.delete({ where: { id: c.id } });
      console.log(`  ✓ deleted ${c.id}`);
    } else {
      console.log(`  ⚠ kept ${c.id} (has children)`);
    }
  }
  await db.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
