import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const NEW_PASSWORD = "password123";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const hash = await bcrypt.hash(NEW_PASSWORD, 12);
const result = await db.user.updateMany({ data: { password: hash } });

console.log(`Reset password on ${result.count} user(s) to: ${NEW_PASSWORD}`);

const users = await db.user.findMany({ select: { email: true } });
for (const u of users) console.log(`  · ${u.email}`);

await db.$disconnect();
