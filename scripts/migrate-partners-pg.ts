/**
 * Migration script: Partners Portal PostgreSQL → Unified PostgreSQL
 *
 * Reads data from the Partners Portal's PostgreSQL database and inserts it
 * into the unified PostgreSQL database with Partner-prefixed models.
 *
 * Usage:
 *   npx tsx scripts/migrate-partners-pg.ts
 *
 * Prerequisites:
 *   - PARTNERS_DATABASE_URL env var pointing to the Partners Portal DB
 *   - DATABASE_URL configured in .env (unified DB)
 *   - Prisma migrations already applied to the unified DB
 */

import { PrismaClient as UnifiedClient } from "../src/generated/prisma";
import pg from "pg";
import { randomUUID } from "crypto";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PARTNERS_DB_URL =
  process.env.PARTNERS_DATABASE_URL ||
  "postgresql://localhost:5432/partners_portal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cuid(): string {
  return randomUUID().replace(/-/g, "").slice(0, 25);
}

type IdMap = Map<string, string>;

function buildIdMap(rows: { id: string }[]): IdMap {
  const map: IdMap = new Map();
  for (const row of rows) {
    map.set(row.id, cuid());
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Partners Portal PostgreSQL → Unified PostgreSQL ===\n");

  const source = new Pool({ connectionString: PARTNERS_DB_URL });
  const unified = new UnifiedClient();

  try {
    await unified.$connect();

    // -----------------------------------------------------------------------
    // 1. Read all source data
    // -----------------------------------------------------------------------
    console.log("Reading Partners Portal data...");

    const { rows: srcUsers } = await source.query("SELECT * FROM users");
    const { rows: srcPartners } = await source.query("SELECT * FROM partners");
    const { rows: srcLeads } = await source.query("SELECT * FROM leads");
    const { rows: srcClients } = await source.query("SELECT * FROM clients");
    const { rows: srcServices } = await source.query("SELECT * FROM services");
    const { rows: srcDeals } = await source.query("SELECT * FROM deals");
    const { rows: srcContracts } = await source.query(
      "SELECT * FROM contracts"
    );
    const { rows: srcInvoices } = await source.query("SELECT * FROM invoices");
    const { rows: srcCommissions } = await source.query(
      "SELECT * FROM commissions"
    );
    const { rows: srcNotifications } = await source.query(
      "SELECT * FROM notifications"
    );
    const { rows: srcAuditLogs } = await source.query(
      "SELECT * FROM audit_logs"
    );

    console.log(`  Users: ${srcUsers.length}`);
    console.log(`  Partners: ${srcPartners.length}`);
    console.log(`  Leads: ${srcLeads.length}`);
    console.log(`  Clients: ${srcClients.length}`);
    console.log(`  Services: ${srcServices.length}`);
    console.log(`  Deals: ${srcDeals.length}`);
    console.log(`  Contracts: ${srcContracts.length}`);
    console.log(`  Invoices: ${srcInvoices.length}`);
    console.log(`  Commissions: ${srcCommissions.length}`);
    console.log(`  Notifications: ${srcNotifications.length}`);
    console.log(`  Audit logs: ${srcAuditLogs.length}`);

    // -----------------------------------------------------------------------
    // 2. Build ID maps (old uuid → new cuid)
    // -----------------------------------------------------------------------
    console.log("\nBuilding ID maps...");

    const userIdMap = buildIdMap(srcUsers); // old User.id → new unified User.id
    const partnerIdMap = buildIdMap(srcPartners); // old Partner.id → new PartnerProfile.id
    const leadIdMap = buildIdMap(srcLeads);
    const clientIdMap = buildIdMap(srcClients);
    const serviceIdMap = buildIdMap(srcServices);
    const dealIdMap = buildIdMap(srcDeals);

    // Map old userId → new PartnerProfile.id (for partner users)
    const userToProfileMap = new Map<string, string>();
    for (const p of srcPartners) {
      const newProfileId = partnerIdMap.get(p.id)!;
      userToProfileMap.set(p.userId, newProfileId);
    }

    // -----------------------------------------------------------------------
    // 3. Insert into unified DB
    // -----------------------------------------------------------------------

    // --- 3a. Unified Users + PartnerProfiles ---
    console.log("\nMigrating users & partner profiles...");
    for (const u of srcUsers) {
      const newUserId = userIdMap.get(u.id)!;

      // Create unified User
      await unified.user.create({
        data: {
          id: newUserId,
          email: u.email,
          name: u.name,
          password: u.password,
          hrAccess: false,
          crmAccess: false,
          partnersAccess: true,
        },
      });
    }
    console.log(`  ✓ ${srcUsers.length} users migrated`);

    // --- 3b. Partner Profiles ---
    console.log("Migrating partner profiles...");
    for (const p of srcPartners) {
      const newProfileId = partnerIdMap.get(p.id)!;
      const newUserId = userIdMap.get(p.userId)!;

      await unified.partnerProfile.create({
        data: {
          id: newProfileId,
          userId: newUserId,
          companyName: p.companyName,
          contactPhone: p.contactPhone || null,
          commissionRate: p.commissionRate,
          isActive: p.isActive,
          createdAt: p.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcPartners.length} partner profiles migrated`);

    // --- 3c. Services ---
    console.log("Migrating services...");
    for (const s of srcServices) {
      await unified.partnerService.create({
        data: {
          id: serviceIdMap.get(s.id)!,
          name: s.name,
          description: s.description || null,
          basePrice: s.basePrice,
          isActive: s.isActive,
          createdAt: s.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcServices.length} services migrated`);

    // --- 3d. Clients ---
    console.log("Migrating clients...");
    for (const c of srcClients) {
      const newProfileId = userToProfileMap.get(
        srcPartners.find((p: any) => p.id === c.partnerId)?.userId || ""
      );
      // Alternatively, look up partnerId directly
      const partnerNewId = partnerIdMap.get(c.partnerId);
      if (!partnerNewId) {
        console.warn(`  ⚠ Skipping client ${c.id} — partner not found`);
        continue;
      }

      await unified.partnerClient.create({
        data: {
          id: clientIdMap.get(c.id)!,
          partnerId: partnerNewId,
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          company: c.company || null,
          createdAt: c.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcClients.length} clients migrated`);

    // --- 3e. Leads ---
    console.log("Migrating leads...");
    for (const l of srcLeads) {
      const partnerNewId = partnerIdMap.get(l.partnerId);
      if (!partnerNewId) {
        console.warn(`  ⚠ Skipping lead ${l.id} — partner not found`);
        continue;
      }

      await unified.partnerLead.create({
        data: {
          id: leadIdMap.get(l.id)!,
          partnerId: partnerNewId,
          name: l.name,
          email: l.email || null,
          phone: l.phone || null,
          company: l.company || null,
          status: l.status as any,
          notes: l.notes || null,
          convertedToClientId: l.convertedToClientId
            ? clientIdMap.get(l.convertedToClientId)
            : null,
          createdAt: l.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcLeads.length} leads migrated`);

    // --- 3f. Deals ---
    console.log("Migrating deals...");
    for (const d of srcDeals) {
      const partnerNewId = partnerIdMap.get(d.partnerId);
      const clientNewId = clientIdMap.get(d.clientId);
      const serviceNewId = serviceIdMap.get(d.serviceId);

      if (!partnerNewId || !clientNewId || !serviceNewId) {
        console.warn(
          `  ⚠ Skipping deal ${d.id} — missing FK reference`
        );
        continue;
      }

      await unified.partnerDeal.create({
        data: {
          id: dealIdMap.get(d.id)!,
          partnerId: partnerNewId,
          clientId: clientNewId,
          serviceId: serviceNewId,
          value: d.value,
          status: d.status as any,
          notes: d.notes || null,
          wonAt: d.wonAt || null,
          createdAt: d.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcDeals.length} deals migrated`);

    // --- 3g. Contracts ---
    console.log("Migrating contracts...");
    for (const c of srcContracts) {
      const partnerNewId = partnerIdMap.get(c.partnerId);
      const dealNewId = dealIdMap.get(c.dealId);
      if (!partnerNewId || !dealNewId) continue;

      await unified.partnerContract.create({
        data: {
          id: cuid(),
          partnerId: partnerNewId,
          dealId: dealNewId,
          status: c.status as any,
          rejectionReason: c.rejectionReason || null,
          pdfUrl: c.pdfUrl || null,
          requestedAt: c.requestedAt,
          reviewedAt: c.reviewedAt || null,
          reviewedBy: c.reviewedBy || null,
          createdAt: c.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcContracts.length} contracts migrated`);

    // --- 3h. Invoices ---
    console.log("Migrating invoices...");
    for (const inv of srcInvoices) {
      const partnerNewId = partnerIdMap.get(inv.partnerId);
      const dealNewId = dealIdMap.get(inv.dealId);
      if (!partnerNewId || !dealNewId) continue;

      await unified.partnerInvoice.create({
        data: {
          id: cuid(),
          partnerId: partnerNewId,
          dealId: dealNewId,
          status: inv.status as any,
          amount: inv.amount,
          rejectionReason: inv.rejectionReason || null,
          pdfUrl: inv.pdfUrl || null,
          requestedAt: inv.requestedAt,
          reviewedAt: inv.reviewedAt || null,
          reviewedBy: inv.reviewedBy || null,
          createdAt: inv.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcInvoices.length} invoices migrated`);

    // --- 3i. Commissions ---
    console.log("Migrating commissions...");
    for (const cm of srcCommissions) {
      const partnerNewId = partnerIdMap.get(cm.partnerId);
      const dealNewId = dealIdMap.get(cm.dealId);
      if (!partnerNewId || !dealNewId) continue;

      await unified.partnerCommission.create({
        data: {
          id: cuid(),
          partnerId: partnerNewId,
          dealId: dealNewId,
          amount: cm.amount,
          rate: cm.rate,
          status: cm.status as any,
          approvedAt: cm.approvedAt || null,
          paidAt: cm.paidAt || null,
          createdAt: cm.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcCommissions.length} commissions migrated`);

    // --- 3j. Notifications ---
    console.log("Migrating notifications...");
    for (const n of srcNotifications) {
      const newUserId = userIdMap.get(n.userId);
      if (!newUserId) continue;

      await unified.partnerNotification.create({
        data: {
          id: cuid(),
          userId: newUserId,
          type: n.type as any,
          title: n.title,
          message: n.message,
          isRead: n.isRead,
          metadata: n.metadata || undefined,
          createdAt: n.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcNotifications.length} notifications migrated`);

    // --- 3k. Audit Logs ---
    console.log("Migrating audit logs...");
    for (const al of srcAuditLogs) {
      const newUserId = userIdMap.get(al.userId);
      if (!newUserId) continue;

      await unified.partnerAuditLog.create({
        data: {
          id: cuid(),
          userId: newUserId,
          action: al.action,
          entity: al.entity,
          entityId: al.entityId,
          oldData: al.oldData || undefined,
          newData: al.newData || undefined,
          ipAddress: al.ipAddress || null,
          createdAt: al.createdAt,
        },
      });
    }
    console.log(`  ✓ ${srcAuditLogs.length} audit logs migrated`);

    // -----------------------------------------------------------------------
    // 4. Verification
    // -----------------------------------------------------------------------
    console.log("\n=== Verification ===");

    const counts = {
      users: await unified.user.count({ where: { partnersAccess: true } }),
      partnerProfiles: await unified.partnerProfile.count(),
      leads: await unified.partnerLead.count(),
      clients: await unified.partnerClient.count(),
      services: await unified.partnerService.count(),
      deals: await unified.partnerDeal.count(),
      contracts: await unified.partnerContract.count(),
      invoices: await unified.partnerInvoice.count(),
      commissions: await unified.partnerCommission.count(),
      notifications: await unified.partnerNotification.count(),
      auditLogs: await unified.partnerAuditLog.count(),
    };

    console.log("Unified DB row counts:");
    for (const [table, count] of Object.entries(counts)) {
      console.log(`  ${table}: ${count}`);
    }

    console.log("\n=== Migration Complete ===");
  } finally {
    await source.end();
    await unified.$disconnect();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
