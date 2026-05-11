import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const u = await db.user.findUnique({
  where: { email: "admin@bgroup.com" },
  include: { hrProfile: true },
});

if (!u) {
  console.log("ADMIN NOT FOUND IN DB");
  process.exit(1);
}

console.log("ID:", u.id);
console.log("email:", u.email);
console.log("name:", u.name);
console.log("hrAccess:", u.hrAccess);
console.log("hrProfile.isActive:", u.hrProfile?.isActive);
console.log("password format:", u.password?.slice(0, 10));
console.log("password length:", u.password?.length);

const tryThese = ["Admin@123456", "admin@123456", "ChangeMe!123", "password"];
for (const p of tryThese) {
  if (u.password?.startsWith("$2")) {
    const ok = await bcrypt.compare(p, u.password);
    console.log(`  bcrypt('${p}') →`, ok);
  }
}

await db.$disconnect();
