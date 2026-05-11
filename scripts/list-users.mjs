import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const users = await db.user.findMany({
  orderBy: { createdAt: "asc" },
  select: {
    id: true,
    email: true,
    name: true,
    hrAccess: true,
    crmAccess: true,
    partnersAccess: true,
    hrEmployee: {
      select: {
        employeeId: true,
        positionEn: true,
        status: true,
        directManager: { select: { fullNameEn: true } },
        subordinates: { select: { id: true } },
        company: { select: { nameEn: true } },
      },
    },
    hrProfile: {
      select: {
        isSuperuser: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    },
    crmProfile: { select: { fullName: true, role: true } },
    partnerProfile: { select: { companyName: true, isActive: true } },
  },
});

console.log(`Total users: ${users.length}\n`);
for (const u of users) {
  const modules = [];
  if (u.hrAccess) modules.push("HR");
  if (u.crmAccess) modules.push("CRM");
  if (u.partnersAccess) modules.push("Partners");
  const roles = u.hrProfile?.roles?.map((r) => r.role.name) ?? [];
  const subCount = u.hrEmployee?.subordinates?.length ?? 0;
  const derived = subCount > 0 && !roles.includes("team_lead");

  console.log(`— ${u.name ?? "(unnamed)"} <${u.email}>`);
  console.log(`   modules: ${modules.join(", ") || "none"}`);
  if (u.hrProfile?.isSuperuser) console.log(`   ★ HR superuser`);
  const rolesDisplay = [...roles];
  if (derived) rolesDisplay.push("team_lead (org-chart-derived)");
  if (rolesDisplay.length) console.log(`   HR roles: ${rolesDisplay.join(", ")}`);
  if (u.hrEmployee) {
    const mgr = u.hrEmployee.directManager?.fullNameEn ?? "(no manager)";
    console.log(`   HR employee: ${u.hrEmployee.employeeId} · ${u.hrEmployee.positionEn || "—"} · ${u.hrEmployee.company?.nameEn ?? "—"} · status=${u.hrEmployee.status}`);
    console.log(`   Reports to: ${mgr} · ${subCount} direct report${subCount !== 1 ? "s" : ""}`);
  }
  if (u.crmProfile) console.log(`   CRM: ${u.crmProfile.fullName} · role=${u.crmProfile.role}`);
  if (u.partnerProfile) console.log(`   Partner: ${u.partnerProfile.companyName} · active=${u.partnerProfile.isActive}`);
  console.log();
}

await db.$disconnect();
