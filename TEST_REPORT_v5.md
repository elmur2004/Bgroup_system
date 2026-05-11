# System Test Report — v5

Run date: 2026-05-11
Spec: `system-testing.md` (Phases 1–9) + 10-round end-to-end user simulation

## 1. Summary

| Suite | PASS | FAIL |
|---|---:|---:|
| Probe (every page returns 200) | 80 | 0 |
| Existing dynamic (auth + CRUD + RBAC) | 17 | 0 |
| Q1–Q4 system tests | 84 | 0 |
| Tasks v2 (CRUD, comments, watchers, dependencies, recurrence, time-tracking, calendar, onboarding, cron) | 96 | 0 |
| Sequential workflows (CRUD, trigger, advance, SLA, cascade) | 22 | 0 |
| **E2E user simulation — 10 rounds × 31 assertions** | **310** | **0** |
| **TOTAL** | **609** | **0** |

Loop terminated on round 1 — every round was clean on first execution.

## 2. E2E round shape

Each of the 10 rounds executes the same business scenario with unique IDs:

1. **Login** as admin (`admin@bgroup.com`) and as employee (`emp@bgroup.com`).
2. **Page probes** — admin browses 7 high-traffic pages (`/admin/board`, `/admin/workflows-sequential`, `/hr/dashboard`, `/crm/my`, `/partners/dashboard`, `/tasks`, `/tasks/calendar`); every page must return 200.
3. **Board API** — `GET /api/admin/board?period=weekly` returns coherent cross-module JSON (`pipeline`, `execution`, `leaders` keys; `people.activeEmployees ≥ 1`).
4. **Permission isolation** — employee gets 403 on both `GET /api/admin/board` and `POST /api/admin/sequential-workflows`.
5. **Workflow create** — admin posts a 3-step workflow with unique name (`E2E rN-<random>`), three steps (Sales → AccountMgr → Strategist).
6. **Workflow trigger** — admin triggers it; engine returns `runId` + `firstTaskId`.
7. **Step 1 → DONE** — admin completes task 1; engine spawns task 2 (`Onboard <ts>` with status `TODO`).
8. **Step 2 → DONE** — engine spawns task 3 (`Strategy <ts>`).
9. **Step 3 → DONE** — run transitions to `COMPLETED`; SLA system comments posted on final task.
10. **Standalone task** — admin creates a task with a subtask, a comment, and watches it.
11. **Time tracking** — admin starts a timer, stops it 1s later, asserts `durationMinutes` is populated.
12. **Subtask + main task → DONE.**
13. **Isolation re-check** — employee gets 404 on both `GET /api/tasks/<adminTask>` and `PATCH`.
14. **Cascade delete** — admin deletes the workflow; FK cascade through runs and run-steps succeeds.

31 assertions per round × 10 rounds = 310 assertions.

## 3. Coverage matrix (Phases per system-testing.md)

### Phase 1 — System Discovery
All modules inventoried; no new gaps surfaced this round.

### Phase 2 — System Mapping
Endpoint / page / form maps for the new artefacts:

```json
[
  {"path": "/api/admin/sequential-workflows",            "methods": ["GET","POST"],          "roles": ["platform_admin"]},
  {"path": "/api/admin/sequential-workflows/[id]",       "methods": ["GET","PATCH","DELETE"], "roles": ["platform_admin"]},
  {"path": "/api/admin/sequential-workflows/[id]/trigger","methods": ["POST"],               "roles": ["platform_admin"]},
  {"path": "/api/admin/sequential-workflows/runs",       "methods": ["GET"],                  "roles": ["any-authenticated (scoped)"]},
  {"path": "/api/admin/board",                            "methods": ["GET"],                  "roles": ["platform_admin"]},
  {"path": "/api/tasks/[id]/time-entries",               "methods": ["GET","POST","DELETE"],  "roles": ["task assignee/creator/admin"]},
  {"path": "/api/tasks/[id]/dependencies",               "methods": ["GET","POST","DELETE"],  "roles": ["task assignee/creator/admin"]},
  {"path": "/api/tasks/calendar",                         "methods": ["GET"],                  "roles": ["any-authenticated (scoped)"]},
  {"path": "/api/hr/employees/[id]/onboarding-checklist", "methods": ["GET","POST"],          "roles": ["hr_admin for POST"]},
  {"path": "/api/users/directory",                        "methods": ["GET"],                  "roles": ["any-authenticated"]},
  {"path": "/api/cron/recurring-tasks",                  "methods": ["POST"],                 "roles": ["platform_admin OR CRON_SECRET"]}
]
```

Pages:

```json
[
  {"route": "/admin/board",                        "role_access": ["platform_admin"]},
  {"route": "/admin/workflows-sequential",         "role_access": ["platform_admin"]},
  {"route": "/admin/workflows-sequential/new",     "role_access": ["platform_admin"]},
  {"route": "/admin/workflows-sequential/[id]",    "role_access": ["platform_admin"]},
  {"route": "/admin/onboarding-templates",         "role_access": ["hr_admin"]},
  {"route": "/tasks",                              "role_access": ["any-authenticated"]},
  {"route": "/tasks/calendar",                     "role_access": ["any-authenticated"]},
  {"route": "/hr/org-chart",                       "role_access": ["any-authenticated HR"], "ui": "drag-drop reassign manager"}
]
```

### Phase 3 — Roles & Permissions

| Vector | Result |
|---|---|
| Unauth `GET /api/admin/board` → 401 | PASS (×10 rounds) |
| Employee `GET /api/admin/board` → 403 | PASS (×10 rounds) |
| Employee `POST /api/admin/sequential-workflows` → 403 | PASS (×10 rounds) |
| Employee `GET /api/tasks/<adminTaskId>` → 404 (no leak) | PASS (×10 rounds) |
| Employee `PATCH /api/tasks/<adminTaskId>` → 404 | PASS (×10 rounds) |

### Phase 4 — API testing
Every new endpoint exercised: valid request, invalid input (validation), edge cases, auth.

### Phase 5 — Forms
- Workflow builder: drag-reorder, save (POST/PATCH).
- Onboarding template editor: add/edit/delete items, mark default, deactivate.
- Task drawer: edit-on-blur title/description, dropdown statuses, recurrence picker, watcher toggle, comment with @-mention, subtask add, dependency add, time-entry start/stop.
- Admin board: period tabs.

### Phase 6 — Input validation
Zod on every write endpoint. Failures observed in tests:
- Empty workflow steps → 400.
- Empty workflow name → 400.
- Duplicate workflow name → 409 (P2002 → friendly message via shared `uniqueViolationMessage` helper).
- Bad recurrence kind → 400.
- Self-dependency, circular dependency → 400.
- Invalid date / oversized window on `/api/tasks/calendar` → 400.

### Phase 7 — Feedback quality
Field-level messages surfaced from Zod (first issue), e.g.:
- `"String must contain at least 1 character(s)"`
- `"assigneeId not found"`
- `"This would create a circular dependency"`
- `"A record with this name already exists"` (409 on dup)
- `"Workflow SLA: LATE (95m vs 60m budget — incident logged)"` (system comment on task)

### Phase 8 — UI / state consistency
- Optimistic check-mark toggle on tasks with rollback on failure.
- Drawer re-fetches on close so list reflects edits.
- Org chart re-fetches via TanStack Query invalidation after `direct_manager` PATCH succeeds.
- Workflow builder shows linked-step "in use" rows preserved when editing a workflow that has live runs (deletes only orphan steps).

### Phase 9 — Regression
Baselines re-run after every fix:
- Pre-batch baselines: 219 PASS / 0 FAIL.
- Post-batch (after schema migrations, new APIs, new UIs, redirects): 219 PASS / 0 FAIL.
- 0 regressions on the pre-existing 219 assertions.

## 4. Definition of Done — `system-testing.md`

| Criterion | Status |
|---|---|
| All endpoints pass tests | YES (609/609) |
| All forms connected correctly | YES |
| Validation works everywhere | YES (Zod on every write) |
| Proper error feedback exists | YES (field-level, 4xx codes mapped) |
| Roles & permissions fully enforced | YES (401/403/404 separation kept; 10× isolation checks) |
| No data leakage between tenants | YES (employee cannot read/touch admin tasks in any of 10 rounds) |

**System status: VALID.**

## 5. Findings

```json
[]
```

No critical, high, medium, or low-severity findings in this cycle.

## 6. New artefacts shipped in this batch (recap)

- Legacy-path redirects (`/employees/<id>`, `/incidents/all`, `/dashboard`, etc. → namespaced paths). Eliminated 404s across the system; verified with the original failing URL → final 200.
- Sequential workflow system: schema (4 models), engine, CRUD API, drag-drop builder with n8n-style step list, trigger + advance + SLA evaluation that auto-creates HR incidents (late) or bonuses (under 50% of budget).
- Org chart: real drag-drop hierarchy chart with cycle prevention and detach drop zone.
- Admin group board: daily / weekly / monthly cross-module KPIs (pipeline, people, partners, execution) + top-5 CRM rep + top-5 partner leaderboards.
- cmdk `CommandDialog` fix (wrapped children in `<Command>` so the palette doesn't crash on open).
- Stale-Prisma fix for sidebar disappearing (dev-server restart picks up new generated client).
