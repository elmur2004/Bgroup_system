import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const month = 5, year = 2026;
const startDate = new Date(year, month - 1, 1);
const endDate = new Date(year, month, 0, 23, 59, 59);

const t0 = Date.now();
const companies = await db.hrCompany.findMany({ where: { isActive: true }, select: { id: true, nameEn: true } });
console.log(`hrCompany.findMany active: ${companies.length} companies in ${Date.now() - t0}ms`);

const t1 = Date.now();
const empCount = await db.hrEmployee.count();
console.log(`hrEmployee.count total: ${empCount} in ${Date.now() - t1}ms`);

const t2 = Date.now();
const salaryCount = await db.hrMonthlySalary.count({ where: { month, year } });
console.log(`hrMonthlySalary.count for ${month}/${year}: ${salaryCount} in ${Date.now() - t2}ms`);

// Now reproduce the full parallel block for ONE company
if (companies.length > 0) {
  const company = companies[0];
  const t3 = Date.now();
  await Promise.all([
    db.hrMonthlySalary.aggregate({
      where: { employee: { companyId: company.id }, month, year },
      _count: { _all: true },
      _sum: { baseSalary: true, overtimeAmount: true, totalBonuses: true, totalDeductions: true, netSalary: true },
    }),
    db.hrPayrollPeriod.findFirst({ where: { companyId: company.id, month, year }, select: { id: true, status: true } }),
    db.hrEmployee.aggregate({ where: { companyId: company.id, status: { in: ["active", "probation"] } }, _count: { _all: true }, _sum: { baseSalary: true } }),
    db.hrIncident.aggregate({ where: { employee: { companyId: company.id }, incidentDate: { gte: startDate, lte: endDate }, status: "applied" }, _sum: { deductionAmount: true } }),
    db.hrBonus.aggregate({ where: { employee: { companyId: company.id }, bonusDate: { gte: startDate, lte: endDate }, status: "applied" }, _sum: { bonusAmount: true } }),
  ]);
  console.log(`5 parallel aggregates for ONE company: ${Date.now() - t3}ms`);
}

// Full endpoint flow
const t4 = Date.now();
await Promise.all(companies.map(async (company) => {
  await Promise.all([
    db.hrMonthlySalary.aggregate({ where: { employee: { companyId: company.id }, month, year }, _count: { _all: true }, _sum: { baseSalary: true, overtimeAmount: true, totalBonuses: true, totalDeductions: true, netSalary: true } }),
    db.hrPayrollPeriod.findFirst({ where: { companyId: company.id, month, year }, select: { id: true, status: true } }),
    db.hrEmployee.aggregate({ where: { companyId: company.id, status: { in: ["active", "probation"] } }, _count: { _all: true }, _sum: { baseSalary: true } }),
    db.hrIncident.aggregate({ where: { employee: { companyId: company.id }, incidentDate: { gte: startDate, lte: endDate }, status: "applied" }, _sum: { deductionAmount: true } }),
    db.hrBonus.aggregate({ where: { employee: { companyId: company.id }, bonusDate: { gte: startDate, lte: endDate }, status: "applied" }, _sum: { bonusAmount: true } }),
  ]);
}));
console.log(`Full endpoint flow (${companies.length} cos × 5 parallel each): ${Date.now() - t4}ms`);

await db.$disconnect();
