/**
 * Migration script: HR SQLite → PostgreSQL
 *
 * Reads data from the HR system's SQLite database and inserts it into the
 * unified PostgreSQL database with Hr-prefixed models.
 *
 * Usage:
 *   npx tsx scripts/migrate-hr-sqlite-to-pg.ts
 *
 * Prerequisites:
 *   - HR SQLite database file path set via HR_SQLITE_PATH env var
 *   - PostgreSQL DATABASE_URL configured in .env
 *   - Prisma migrations already applied to PostgreSQL
 */

import { PrismaClient as PgClient } from "../src/generated/prisma";
import Database from "better-sqlite3";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HR_SQLITE_PATH =
  process.env.HR_SQLITE_PATH ||
  "../B-group System/frontend/prisma/dev.db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cuid(): string {
  // Simple cuid-like ID for migration purposes
  return randomUUID().replace(/-/g, "").slice(0, 25);
}

/** Map old integer IDs → new cuid string IDs */
type IdMap = Map<number, string>;

function buildIdMap(rows: { id: number }[]): IdMap {
  const map: IdMap = new Map();
  for (const row of rows) {
    map.set(row.id, cuid());
  }
  return map;
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

function safeBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  return Boolean(val);
}

function safeDate(val: unknown): Date {
  if (val instanceof Date) return val;
  if (typeof val === "string" && val) return new Date(val);
  return new Date();
}

function safeDateOrNull(val: unknown): Date | null {
  if (val === null || val === undefined || val === "") return null;
  return safeDate(val);
}

function safeDecimal(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  return 0;
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== HR SQLite → PostgreSQL Migration ===\n");

  const sqlite = new Database(HR_SQLITE_PATH, { readonly: true });
  const pg = new PgClient();

  try {
    await pg.$connect();

    // -----------------------------------------------------------------------
    // 1. Read all SQLite data
    // -----------------------------------------------------------------------
    console.log("Reading SQLite data...");

    const hrUsers = sqlite
      .prepare("SELECT * FROM accounts_customuser")
      .all() as any[];
    const hrRoles = sqlite
      .prepare("SELECT * FROM accounts_role")
      .all() as any[];
    const hrUserRoles = sqlite
      .prepare("SELECT * FROM accounts_customuser_roles")
      .all() as any[];
    const hrUserCompanies = sqlite
      .prepare("SELECT * FROM accounts_customuser_companies")
      .all() as any[];
    const companies = sqlite
      .prepare("SELECT * FROM companies_company")
      .all() as any[];
    const departments = sqlite
      .prepare("SELECT * FROM companies_department")
      .all() as any[];
    const employees = sqlite
      .prepare("SELECT * FROM employees_employee")
      .all() as any[];
    const employeeDocuments = sqlite
      .prepare("SELECT * FROM employees_employeedocument")
      .all() as any[];
    const shifts = sqlite
      .prepare("SELECT * FROM attendance_shift")
      .all() as any[];
    const attendanceLogs = sqlite
      .prepare("SELECT * FROM attendance_attendancelog")
      .all() as any[];
    const leaveTypes = sqlite
      .prepare("SELECT * FROM attendance_leavetype")
      .all() as any[];
    const leaveRequests = sqlite
      .prepare("SELECT * FROM attendance_leaverequest")
      .all() as any[];
    const autoRules = sqlite
      .prepare("SELECT * FROM attendance_attendanceautorule")
      .all() as any[];
    const overtimePolicies = sqlite
      .prepare("SELECT * FROM overtime_overtimepolicy")
      .all() as any[];
    const overtimeRequests = sqlite
      .prepare("SELECT * FROM overtime_overtimerequest")
      .all() as any[];
    const violationCategories = sqlite
      .prepare("SELECT * FROM incidents_violationcategory")
      .all() as any[];
    const violationRules = sqlite
      .prepare("SELECT * FROM incidents_violationrule")
      .all() as any[];
    const incidents = sqlite
      .prepare("SELECT * FROM incidents_incident")
      .all() as any[];
    const bonusCategories = sqlite
      .prepare("SELECT * FROM bonuses_bonuscategory")
      .all() as any[];
    const bonusRules = sqlite
      .prepare("SELECT * FROM bonuses_bonusrule")
      .all() as any[];
    const bonuses = sqlite
      .prepare("SELECT * FROM bonuses_bonus")
      .all() as any[];
    const payrollPeriods = sqlite
      .prepare("SELECT * FROM payroll_payrollperiod")
      .all() as any[];
    const monthlySalaries = sqlite
      .prepare("SELECT * FROM payroll_monthlysalary")
      .all() as any[];
    const notifications = sqlite
      .prepare("SELECT * FROM notifications_notification")
      .all() as any[];
    const appSettings = sqlite
      .prepare("SELECT * FROM core_appsetting")
      .all() as any[];
    const auditLogs = sqlite
      .prepare("SELECT * FROM core_auditlog")
      .all() as any[];

    console.log(`  Users: ${hrUsers.length}`);
    console.log(`  Roles: ${hrRoles.length}`);
    console.log(`  Companies: ${companies.length}`);
    console.log(`  Departments: ${departments.length}`);
    console.log(`  Employees: ${employees.length}`);
    console.log(`  Shifts: ${shifts.length}`);
    console.log(`  Attendance logs: ${attendanceLogs.length}`);
    console.log(`  Leave types: ${leaveTypes.length}`);
    console.log(`  Leave requests: ${leaveRequests.length}`);
    console.log(`  Overtime policies: ${overtimePolicies.length}`);
    console.log(`  Overtime requests: ${overtimeRequests.length}`);
    console.log(`  Violation categories: ${violationCategories.length}`);
    console.log(`  Violation rules: ${violationRules.length}`);
    console.log(`  Incidents: ${incidents.length}`);
    console.log(`  Bonus categories: ${bonusCategories.length}`);
    console.log(`  Bonus rules: ${bonusRules.length}`);
    console.log(`  Bonuses: ${bonuses.length}`);
    console.log(`  Payroll periods: ${payrollPeriods.length}`);
    console.log(`  Monthly salaries: ${monthlySalaries.length}`);
    console.log(`  Notifications: ${notifications.length}`);
    console.log(`  App settings: ${appSettings.length}`);
    console.log(`  Audit logs: ${auditLogs.length}`);

    // -----------------------------------------------------------------------
    // 2. Build ID maps (old Int → new String)
    // -----------------------------------------------------------------------
    console.log("\nBuilding ID maps...");

    const userIdMap = buildIdMap(hrUsers); // old User.id → new HrUserProfile.id
    const unifiedUserIdMap = new Map<number, string>(); // old User.id → new User.id (unified)
    const roleIdMap = buildIdMap(hrRoles);
    const companyIdMap = buildIdMap(companies);
    const departmentIdMap = buildIdMap(departments);
    const employeeIdMap = buildIdMap(employees);
    const shiftIdMap = buildIdMap(shifts);
    const leaveTypeIdMap = buildIdMap(leaveTypes);
    const overtimePolicyIdMap = buildIdMap(overtimePolicies);
    const violationCategoryIdMap = buildIdMap(violationCategories);
    const violationRuleIdMap = buildIdMap(violationRules);
    const bonusCategoryIdMap = buildIdMap(bonusCategories);
    const bonusRuleIdMap = buildIdMap(bonusRules);

    // -----------------------------------------------------------------------
    // 3. Insert into PostgreSQL (in dependency order)
    // -----------------------------------------------------------------------

    // --- 3a. Unified Users + HrUserProfiles ---
    console.log("\nMigrating users...");
    for (const u of hrUsers) {
      const unifiedId = cuid();
      const profileId = userIdMap.get(u.id)!;
      unifiedUserIdMap.set(u.id, unifiedId);

      // Create unified User
      await pg.user.create({
        data: {
          id: unifiedId,
          email: u.email,
          name: `${safeStr(u.first_name)} ${safeStr(u.last_name)}`.trim() || u.username,
          password: u.password, // Keep existing hash (bcrypt or Django pbkdf2)
          hrAccess: true,
          crmAccess: false,
          partnersAccess: false,
        },
      });

      // Create HrUserProfile
      await pg.hrUserProfile.create({
        data: {
          id: profileId,
          userId: unifiedId,
          isSuperuser: safeBool(u.is_superuser),
          firstName: safeStr(u.first_name),
          lastName: safeStr(u.last_name),
          isStaff: safeBool(u.is_staff),
          dateJoined: safeDate(u.date_joined),
          username: u.username,
          phone: safeStr(u.phone),
          avatar: u.avatar || null,
          isActive: safeBool(u.is_active),
        },
      });
    }
    console.log(`  ✓ ${hrUsers.length} users migrated`);

    // --- 3b. HR Roles ---
    console.log("Migrating roles...");
    for (const r of hrRoles) {
      await pg.hrRole.create({
        data: {
          id: roleIdMap.get(r.id)!,
          name: r.name,
        },
      });
    }
    console.log(`  ✓ ${hrRoles.length} roles migrated`);

    // --- 3c. HR User Roles ---
    console.log("Migrating user roles...");
    for (const ur of hrUserRoles) {
      const profileId = userIdMap.get(ur.customuser_id);
      const roleId = roleIdMap.get(ur.role_id);
      if (!profileId || !roleId) continue;

      await pg.hrUserRole.create({
        data: {
          id: cuid(),
          userId: profileId,
          roleId: roleId,
        },
      });
    }
    console.log(`  ✓ ${hrUserRoles.length} user roles migrated`);

    // --- 3d. Companies ---
    console.log("Migrating companies...");
    for (const c of companies) {
      await pg.hrCompany.create({
        data: {
          id: companyIdMap.get(c.id)!,
          nameEn: c.name_en,
          nameAr: c.name_ar,
          logo: c.logo || null,
          industry: safeStr(c.industry),
          address: safeStr(c.address),
          phone: safeStr(c.phone),
          email: safeStr(c.email),
          taxId: safeStr(c.tax_id),
          isActive: safeBool(c.is_active),
          createdAt: safeDate(c.created_at),
        },
      });
    }
    console.log(`  ✓ ${companies.length} companies migrated`);

    // --- 3e. User-Company assignments ---
    console.log("Migrating user-company assignments...");
    for (const uc of hrUserCompanies) {
      const profileId = userIdMap.get(uc.customuser_id);
      const compId = companyIdMap.get(uc.company_id);
      if (!profileId || !compId) continue;

      await pg.hrUserCompany.create({
        data: {
          id: cuid(),
          userId: profileId,
          companyId: compId,
        },
      });
    }
    console.log(`  ✓ ${hrUserCompanies.length} user-company links migrated`);

    // --- 3f. Shifts ---
    console.log("Migrating shifts...");
    for (const s of shifts) {
      await pg.hrShift.create({
        data: {
          id: shiftIdMap.get(s.id)!,
          name: s.name,
          startTime: s.start_time,
          endTime: s.end_time,
          gracePeriodMinutes: s.grace_period_minutes,
          dailyWorkHours: safeDecimal(s.daily_work_hours),
          weeklyOffDay: s.weekly_off_day,
          isDefault: safeBool(s.is_default),
          createdAt: safeDate(s.created_at),
        },
      });
    }
    console.log(`  ✓ ${shifts.length} shifts migrated`);

    // --- 3g. Departments (without headOfDept first) ---
    console.log("Migrating departments...");
    for (const d of departments) {
      await pg.hrDepartment.create({
        data: {
          id: departmentIdMap.get(d.id)!,
          nameEn: d.name_en,
          nameAr: d.name_ar,
          isActive: safeBool(d.is_active),
          createdAt: safeDate(d.created_at),
          companyId: companyIdMap.get(d.company_id)!,
          // headOfDeptId set after employees are inserted
        },
      });
    }
    console.log(`  ✓ ${departments.length} departments migrated`);

    // --- 3h. Employees (without directManager first) ---
    console.log("Migrating employees...");
    for (const e of employees) {
      const profileId = e.user_id ? userIdMap.get(e.user_id) : null;

      await pg.hrEmployee.create({
        data: {
          id: employeeIdMap.get(e.id)!,
          employeeId: e.employee_id,
          fullNameEn: e.full_name_en,
          fullNameAr: e.full_name_ar,
          nationalId: e.national_id,
          dateOfBirth: safeDateOrNull(e.date_of_birth),
          gender: safeStr(e.gender),
          personalEmail: safeStr(e.personal_email),
          phone: safeStr(e.phone),
          address: safeStr(e.address),
          emergencyContactName: safeStr(e.emergency_contact_name),
          emergencyContactPhone: safeStr(e.emergency_contact_phone),
          photo: e.photo || null,
          positionEn: safeStr(e.position_en),
          positionAr: safeStr(e.position_ar),
          level: safeStr(e.level),
          employmentType: safeStr(e.employment_type),
          workModel: safeStr(e.work_model),
          contractStart: safeDateOrNull(e.contract_start),
          contractEnd: safeDateOrNull(e.contract_end),
          probationEnd: safeDateOrNull(e.probation_end),
          status: safeStr(e.status),
          baseSalary: safeDecimal(e.base_salary),
          currency: safeStr(e.currency),
          bankName: safeStr(e.bank_name),
          bankAccount: safeStr(e.bank_account),
          iban: safeStr(e.iban),
          createdAt: safeDate(e.created_at),
          companyId: companyIdMap.get(e.company_id)!,
          departmentId: e.department_id
            ? departmentIdMap.get(e.department_id)
            : null,
          shiftId: e.shift_id ? shiftIdMap.get(e.shift_id) : null,
          userId: profileId || null,
          // directManagerId set in update pass below
        },
      });
    }
    console.log(`  ✓ ${employees.length} employees migrated`);

    // --- 3h-ii. Update employee directManager references ---
    console.log("Linking employee managers...");
    let managerLinks = 0;
    for (const e of employees) {
      if (e.direct_manager_id) {
        const empId = employeeIdMap.get(e.id)!;
        const managerId = employeeIdMap.get(e.direct_manager_id);
        if (managerId) {
          await pg.hrEmployee.update({
            where: { id: empId },
            data: { directManagerId: managerId },
          });
          managerLinks++;
        }
      }
    }
    console.log(`  ✓ ${managerLinks} manager links set`);

    // --- 3h-iii. Update department headOfDept references ---
    console.log("Linking department heads...");
    let deptHeadLinks = 0;
    for (const d of departments) {
      if (d.head_of_dept_id) {
        const deptId = departmentIdMap.get(d.id)!;
        const headId = employeeIdMap.get(d.head_of_dept_id);
        if (headId) {
          await pg.hrDepartment.update({
            where: { id: deptId },
            data: { headOfDeptId: headId },
          });
          deptHeadLinks++;
        }
      }
    }
    console.log(`  ✓ ${deptHeadLinks} department head links set`);

    // --- 3i. Employee Documents ---
    console.log("Migrating employee documents...");
    for (const doc of employeeDocuments) {
      await pg.hrEmployeeDocument.create({
        data: {
          id: cuid(),
          documentType: safeStr(doc.document_type),
          file: safeStr(doc.file),
          filename: safeStr(doc.filename),
          fileSize: doc.file_size || 0,
          uploadedByEmployee: safeBool(doc.uploaded_by_employee),
          uploadDate: safeDate(doc.upload_date),
          createdAt: safeDate(doc.created_at),
          employeeId: employeeIdMap.get(doc.employee_id)!,
          uploadedById: doc.uploaded_by_id
            ? userIdMap.get(doc.uploaded_by_id)
            : null,
        },
      });
    }
    console.log(`  ✓ ${employeeDocuments.length} documents migrated`);

    // --- 3j. Attendance Logs ---
    console.log("Migrating attendance logs...");
    for (const a of attendanceLogs) {
      await pg.hrAttendanceLog.create({
        data: {
          id: cuid(),
          date: safeDate(a.date),
          checkIn: a.check_in || null,
          checkOut: a.check_out || null,
          status: safeStr(a.status),
          hoursWorked: safeDecimal(a.hours_worked),
          overtimeHours: safeDecimal(a.overtime_hours),
          isManual: safeBool(a.is_manual),
          manualReason: safeStr(a.manual_reason),
          createdAt: safeDate(a.created_at),
          createdById: a.created_by_id
            ? userIdMap.get(a.created_by_id)
            : null,
          employeeId: employeeIdMap.get(a.employee_id)!,
        },
      });
    }
    console.log(`  ✓ ${attendanceLogs.length} attendance logs migrated`);

    // --- 3k. Leave Types ---
    console.log("Migrating leave types...");
    for (const lt of leaveTypes) {
      await pg.hrLeaveType.create({
        data: {
          id: leaveTypeIdMap.get(lt.id)!,
          nameEn: lt.name_en,
          nameAr: lt.name_ar,
          annualDays: lt.annual_days,
          isPaid: safeBool(lt.is_paid),
          carryOverAllowed: safeBool(lt.carry_over_allowed),
          maxCarryOverDays: lt.max_carry_over_days,
          createdAt: safeDate(lt.created_at),
        },
      });
    }
    console.log(`  ✓ ${leaveTypes.length} leave types migrated`);

    // --- 3l. Leave Requests ---
    console.log("Migrating leave requests...");
    for (const lr of leaveRequests) {
      await pg.hrLeaveRequest.create({
        data: {
          id: cuid(),
          startDate: safeDate(lr.start_date),
          endDate: safeDate(lr.end_date),
          daysCount: lr.days_count,
          reason: safeStr(lr.reason),
          status: safeStr(lr.status),
          approvedAt: safeDateOrNull(lr.approved_at),
          createdAt: safeDate(lr.created_at),
          approvedById: lr.approved_by_id
            ? userIdMap.get(lr.approved_by_id)
            : null,
          employeeId: employeeIdMap.get(lr.employee_id)!,
          leaveTypeId: leaveTypeIdMap.get(lr.leave_type_id)!,
        },
      });
    }
    console.log(`  ✓ ${leaveRequests.length} leave requests migrated`);

    // --- 3m. Attendance Auto Rules ---
    console.log("Migrating attendance auto rules...");
    for (const ar of autoRules) {
      await pg.hrAttendanceAutoRule.create({
        data: {
          id: cuid(),
          code: ar.code,
          name: ar.name,
          conditionDescription: safeStr(ar.condition_description),
          thresholdValue: ar.threshold_value,
          timeWindowMonths: ar.time_window_months,
          action: safeStr(ar.action),
          isActive: safeBool(ar.is_active),
          createdAt: safeDate(ar.created_at),
        },
      });
    }
    console.log(`  ✓ ${autoRules.length} auto rules migrated`);

    // --- 3n. Overtime Policies ---
    console.log("Migrating overtime policies...");
    for (const op of overtimePolicies) {
      await pg.hrOvertimePolicy.create({
        data: {
          id: overtimePolicyIdMap.get(op.id)!,
          typeCode: op.type_code,
          nameEn: op.name_en,
          nameAr: op.name_ar,
          rateMultiplier: safeDecimal(op.rate_multiplier),
          minHours: safeDecimal(op.min_hours),
          maxHoursPerDay: safeDecimal(op.max_hours_per_day),
          maxHoursPerMonth: safeDecimal(op.max_hours_per_month),
          requiresPreApproval: safeBool(op.requires_pre_approval),
          approvalAuthority: safeStr(op.approval_authority),
          createdAt: safeDate(op.created_at),
        },
      });
    }
    console.log(`  ✓ ${overtimePolicies.length} overtime policies migrated`);

    // --- 3o. Overtime Requests ---
    console.log("Migrating overtime requests...");
    for (const or_ of overtimeRequests) {
      await pg.hrOvertimeRequest.create({
        data: {
          id: cuid(),
          date: safeDate(or_.date),
          hoursRequested: safeDecimal(or_.hours_requested),
          reason: safeStr(or_.reason),
          evidence: or_.evidence || null,
          status: safeStr(or_.status),
          approvedAt: safeDateOrNull(or_.approved_at),
          denialReason: safeStr(or_.denial_reason),
          calculatedAmount: safeDecimal(or_.calculated_amount),
          createdAt: safeDate(or_.created_at),
          approvedById: or_.approved_by_id
            ? userIdMap.get(or_.approved_by_id)
            : null,
          employeeId: employeeIdMap.get(or_.employee_id)!,
          overtimeTypeId: overtimePolicyIdMap.get(or_.overtime_type_id)!,
        },
      });
    }
    console.log(`  ✓ ${overtimeRequests.length} overtime requests migrated`);

    // --- 3p. Violation Categories ---
    console.log("Migrating violation categories...");
    for (const vc of violationCategories) {
      await pg.hrViolationCategory.create({
        data: {
          id: violationCategoryIdMap.get(vc.id)!,
          code: vc.code,
          nameEn: vc.name_en,
          nameAr: vc.name_ar,
          resetPeriodMonths: vc.reset_period_months,
          createdAt: safeDate(vc.created_at),
        },
      });
    }
    console.log(
      `  ✓ ${violationCategories.length} violation categories migrated`
    );

    // --- 3q. Violation Rules ---
    console.log("Migrating violation rules...");
    for (const vr of violationRules) {
      await pg.hrViolationRule.create({
        data: {
          id: violationRuleIdMap.get(vr.id)!,
          code: vr.code,
          nameEn: vr.name_en,
          nameAr: vr.name_ar,
          offense1Action: safeStr(vr.offense_1_action),
          offense1DeductionPct: safeDecimal(vr.offense_1_deduction_pct),
          offense2Action: safeStr(vr.offense_2_action),
          offense2DeductionPct: safeDecimal(vr.offense_2_deduction_pct),
          offense3Action: safeStr(vr.offense_3_action),
          offense3DeductionPct: safeDecimal(vr.offense_3_deduction_pct),
          offense4Action: safeStr(vr.offense_4_action),
          offense4DeductionPct: safeDecimal(vr.offense_4_deduction_pct),
          offense5Action: safeStr(vr.offense_5_action),
          offense5DeductionPct: safeDecimal(vr.offense_5_deduction_pct),
          createdAt: safeDate(vr.created_at),
          categoryId: violationCategoryIdMap.get(vr.category_id)!,
        },
      });
    }
    console.log(`  ✓ ${violationRules.length} violation rules migrated`);

    // --- 3r. Incidents ---
    console.log("Migrating incidents...");
    for (const inc of incidents) {
      await pg.hrIncident.create({
        data: {
          id: cuid(),
          incidentDate: safeDate(inc.incident_date),
          offenseNumber: inc.offense_number,
          actionTaken: safeStr(inc.action_taken),
          deductionPct: safeDecimal(inc.deduction_pct),
          deductionAmount: safeDecimal(inc.deduction_amount),
          status: safeStr(inc.status),
          comments: safeStr(inc.comments),
          evidence: inc.evidence || null,
          dismissedReason: safeStr(inc.dismissed_reason),
          createdAt: safeDate(inc.created_at),
          approvedById: inc.approved_by_id
            ? userIdMap.get(inc.approved_by_id)
            : null,
          employeeId: employeeIdMap.get(inc.employee_id)!,
          submittedById: userIdMap.get(inc.submitted_by_id)!,
          violationRuleId: violationRuleIdMap.get(inc.violation_rule_id)!,
        },
      });
    }
    console.log(`  ✓ ${incidents.length} incidents migrated`);

    // --- 3s. Bonus Categories ---
    console.log("Migrating bonus categories...");
    for (const bc of bonusCategories) {
      await pg.hrBonusCategory.create({
        data: {
          id: bonusCategoryIdMap.get(bc.id)!,
          code: bc.code,
          nameEn: bc.name_en,
          nameAr: bc.name_ar,
          createdAt: safeDate(bc.created_at),
        },
      });
    }
    console.log(`  ✓ ${bonusCategories.length} bonus categories migrated`);

    // --- 3t. Bonus Rules ---
    console.log("Migrating bonus rules...");
    for (const br of bonusRules) {
      await pg.hrBonusRule.create({
        data: {
          id: bonusRuleIdMap.get(br.id)!,
          code: br.code,
          nameEn: br.name_en,
          nameAr: br.name_ar,
          valueType: safeStr(br.value_type),
          value: safeDecimal(br.value),
          frequency: safeStr(br.frequency),
          maxPerMonth: br.max_per_month,
          approvalAuthority: safeStr(br.approval_authority),
          triggerCondition: safeStr(br.trigger_condition),
          createdAt: safeDate(br.created_at),
          categoryId: bonusCategoryIdMap.get(br.category_id)!,
        },
      });
    }
    console.log(`  ✓ ${bonusRules.length} bonus rules migrated`);

    // --- 3u. Bonuses ---
    console.log("Migrating bonuses...");
    for (const b of bonuses) {
      await pg.hrBonus.create({
        data: {
          id: cuid(),
          bonusDate: safeDate(b.bonus_date),
          bonusAmount: safeDecimal(b.bonus_amount),
          comments: safeStr(b.comments),
          evidence: b.evidence || null,
          status: safeStr(b.status),
          createdAt: safeDate(b.created_at),
          approvedById: b.approved_by_id
            ? userIdMap.get(b.approved_by_id)
            : null,
          employeeId: employeeIdMap.get(b.employee_id)!,
          submittedById: userIdMap.get(b.submitted_by_id)!,
          bonusRuleId: bonusRuleIdMap.get(b.bonus_rule_id)!,
        },
      });
    }
    console.log(`  ✓ ${bonuses.length} bonuses migrated`);

    // --- 3v. Payroll Periods ---
    console.log("Migrating payroll periods...");
    for (const pp of payrollPeriods) {
      await pg.hrPayrollPeriod.create({
        data: {
          id: cuid(),
          month: pp.month,
          year: pp.year,
          status: safeStr(pp.status),
          lockedAt: safeDateOrNull(pp.locked_at),
          finalizedAt: safeDateOrNull(pp.finalized_at),
          createdAt: safeDate(pp.created_at),
          companyId: companyIdMap.get(pp.company_id)!,
          lockedById: pp.locked_by_id
            ? userIdMap.get(pp.locked_by_id)
            : null,
          paidAt: safeDateOrNull(pp.paid_at),
          paidById: pp.paid_by_id ? userIdMap.get(pp.paid_by_id) : null,
        },
      });
    }
    console.log(`  ✓ ${payrollPeriods.length} payroll periods migrated`);

    // --- 3w. Monthly Salaries ---
    console.log("Migrating monthly salaries...");
    for (const ms of monthlySalaries) {
      await pg.hrMonthlySalary.create({
        data: {
          id: cuid(),
          month: ms.month,
          year: ms.year,
          baseSalary: safeDecimal(ms.base_salary),
          overtimeAmount: safeDecimal(ms.overtime_amount),
          totalBonuses: safeDecimal(ms.total_bonuses),
          totalDeductions: safeDecimal(ms.total_deductions),
          netSalary: safeDecimal(ms.net_salary),
          workDays: ms.work_days,
          absentDays: ms.absent_days,
          lateCount: ms.late_count,
          overtimeHours: safeDecimal(ms.overtime_hours),
          notes: safeStr(ms.notes),
          status: safeStr(ms.status),
          lockedAt: safeDateOrNull(ms.locked_at),
          finalizedAt: safeDateOrNull(ms.finalized_at),
          createdAt: safeDate(ms.created_at),
          employeeId: employeeIdMap.get(ms.employee_id)!,
          lockedById: ms.locked_by_id
            ? userIdMap.get(ms.locked_by_id)
            : null,
        },
      });
    }
    console.log(`  ✓ ${monthlySalaries.length} monthly salaries migrated`);

    // --- 3x. Notifications ---
    console.log("Migrating notifications...");
    for (const n of notifications) {
      const profileId = userIdMap.get(n.user_id);
      if (!profileId) continue;

      await pg.hrNotification.create({
        data: {
          id: cuid(),
          notificationType: safeStr(n.notification_type),
          title: safeStr(n.title),
          message: safeStr(n.message),
          isRead: safeBool(n.is_read),
          relatedObjectType: safeStr(n.related_object_type),
          relatedObjectId: n.related_object_id
            ? String(n.related_object_id)
            : null,
          createdAt: safeDate(n.created_at),
          userId: profileId,
        },
      });
    }
    console.log(`  ✓ ${notifications.length} notifications migrated`);

    // --- 3y. App Settings ---
    console.log("Migrating app settings...");
    for (const s of appSettings) {
      await pg.hrAppSetting.create({
        data: {
          id: cuid(),
          key: s.key,
          value: safeStr(s.value),
          description: safeStr(s.description),
          category: safeStr(s.category),
          createdAt: safeDate(s.created_at),
        },
      });
    }
    console.log(`  ✓ ${appSettings.length} app settings migrated`);

    // --- 3z. Audit Logs ---
    console.log("Migrating audit logs...");
    for (const al of auditLogs) {
      await pg.hrAuditLog.create({
        data: {
          id: cuid(),
          action: safeStr(al.action),
          entityType: safeStr(al.entity_type),
          entityId: safeStr(al.entity_id),
          fieldName: safeStr(al.field_name),
          oldValue: safeStr(al.old_value),
          newValue: safeStr(al.new_value),
          timestamp: safeDate(al.timestamp),
          ipAddress: al.ip_address || null,
          userId: al.user_id ? userIdMap.get(al.user_id) : null,
        },
      });
    }
    console.log(`  ✓ ${auditLogs.length} audit logs migrated`);

    // -----------------------------------------------------------------------
    // 4. Verification
    // -----------------------------------------------------------------------
    console.log("\n=== Verification ===");

    const counts = {
      users: await pg.user.count({ where: { hrAccess: true } }),
      hrProfiles: await pg.hrUserProfile.count(),
      roles: await pg.hrRole.count(),
      companies: await pg.hrCompany.count(),
      departments: await pg.hrDepartment.count(),
      employees: await pg.hrEmployee.count(),
      shifts: await pg.hrShift.count(),
      attendanceLogs: await pg.hrAttendanceLog.count(),
      leaveTypes: await pg.hrLeaveType.count(),
      leaveRequests: await pg.hrLeaveRequest.count(),
      autoRules: await pg.hrAttendanceAutoRule.count(),
      overtimePolicies: await pg.hrOvertimePolicy.count(),
      overtimeRequests: await pg.hrOvertimeRequest.count(),
      violationCategories: await pg.hrViolationCategory.count(),
      violationRules: await pg.hrViolationRule.count(),
      incidents: await pg.hrIncident.count(),
      bonusCategories: await pg.hrBonusCategory.count(),
      bonusRules: await pg.hrBonusRule.count(),
      bonuses: await pg.hrBonus.count(),
      payrollPeriods: await pg.hrPayrollPeriod.count(),
      monthlySalaries: await pg.hrMonthlySalary.count(),
      notifications: await pg.hrNotification.count(),
      appSettings: await pg.hrAppSetting.count(),
      auditLogs: await pg.hrAuditLog.count(),
    };

    console.log("PostgreSQL row counts:");
    for (const [table, count] of Object.entries(counts)) {
      console.log(`  ${table}: ${count}`);
    }

    console.log("\n=== Migration Complete ===");
  } finally {
    sqlite.close();
    await pg.$disconnect();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
