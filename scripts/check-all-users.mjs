import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const KNOWN = {
  "admin@bgroup.com": ["Admin@123456"],
  "emp@bgroup.com": ["EmpPass@123", "Emp@123456", "emp@123"],
  "partner1@bgroup.com": ["Partner@123456", "Partner@123"],
  "partner2@bgroup.com": ["Partner@123456", "Partner@123"],
  "partner@byteforce.com": ["Partner@123", "Partner@123456"],
};

const users = await db.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    password: true,
    hrAccess: true,
    crmAccess: true,
    partnersAccess: true,
    hrProfile: { select: { isActive: true } },
    partnerProfile: { select: { isActive: true } },
  },
});

for (const u of users) {
  console.log(`\n${u.email}`);
  console.log(`  hrAccess=${u.hrAccess}  crm=${u.crmAccess}  partners=${u.partnersAccess}`);
  console.log(`  hrProfile.isActive=${u.hrProfile?.isActive ?? "(no profile)"}`);
  console.log(`  partnerProfile.isActive=${u.partnerProfile?.isActive ?? "(no profile)"}`);
  console.log(`  password starts: ${u.password?.slice(0, 7) ?? "(none)"}`);
  const candidates = KNOWN[u.email] ?? [];
  if (candidates.length === 0) {
    console.log(`  (no candidate passwords to test)`);
    continue;
  }
  for (const p of candidates) {
    if (!u.password) {
      console.log(`  → no password set`);
      break;
    }
    const ok = u.password.startsWith("$2") ? await bcrypt.compare(p, u.password) : false;
    console.log(`  → bcrypt('${p}') = ${ok ? "MATCH" : "no"}`);
  }
}

await db.$disconnect();
