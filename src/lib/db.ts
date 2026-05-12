import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Pool sized for the proxy's added auth() per request + the JWT callback's
  // refresh queries. Default of 10 was bottlenecking the e2e suite (admin
  // would 307 after ~7 concurrent in-flight requests because auth couldn't
  // get a connection in time and the session came back null → proxy redirect).
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 25,
    idleTimeoutMillis: 30_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
