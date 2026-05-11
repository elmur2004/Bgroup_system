-- Trigram indexes for fast ILIKE / "contains" search across the columns the
-- /api/global-search route hits. Prisma uses camelCase column names in this
-- schema (only tables are snake_case via @@map), so identifiers are quoted.
--
-- Apply with:   npx prisma db execute --file prisma/sql/add-search-indexes.sql
-- Idempotent (uses IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── CRM ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_companies_nameen_trgm
  ON crm_companies USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_fullname_trgm
  ON crm_contacts USING gin ("fullName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email_trgm
  ON crm_contacts USING gin ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_code_trgm
  ON crm_opportunities USING gin ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_title_trgm
  ON crm_opportunities USING gin ("title" gin_trgm_ops);

-- ─── HR ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hr_employees_fullnameen_trgm
  ON hr_employees USING gin ("fullNameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hr_employees_employeeid_trgm
  ON hr_employees USING gin ("employeeId" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hr_employees_personalemail_trgm
  ON hr_employees USING gin ("personalEmail" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hr_companies_nameen_trgm
  ON hr_companies USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hr_departments_nameen_trgm
  ON hr_departments USING gin ("nameEn" gin_trgm_ops);

-- ─── Partners ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_partner_leads_name_trgm
  ON partner_leads USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_partner_leads_email_trgm
  ON partner_leads USING gin ("email" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_partner_leads_company_trgm
  ON partner_leads USING gin ("company" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_partner_clients_name_trgm
  ON partner_clients USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_partner_clients_company_trgm
  ON partner_clients USING gin ("company" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_companyname_trgm
  ON partner_profiles USING gin ("companyName" gin_trgm_ops);
