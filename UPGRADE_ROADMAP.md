# BGroup Super App — Upgrade Roadmap
**Deep research on features and UX upgrades**
*Compiled 2026-04-25 from 30+ industry sources and a full audit of the current codebase.*

---

## TL;DR — what to build, in priority order

| Tier | Effort | Items |
|---|---|---|
| **🟢 Quick wins** (1–2 wks each) | ~6 wks total | Command palette (⌘K), global search, inline table editing, optimistic updates, calendar/today views, kanban deal pipeline, role-based onboarding, mobile responsive pass, dark-mode polish, empty-state illustrations, keyboard shortcuts, real-time toasts |
| **🟡 Medium-term** (1–2 mo each) | ~6 mo total | Email + calendar integration, automation/workflow engine, proposal/quote generation, performance reviews, recruitment ATS, partner tiers + deal registration, MDF, AI assist (next-action suggestions, summarization), notification fan-out (email + push), audit trail UI, advanced reporting |
| **🔴 Strategic** (3–6 mo each) | ~12 mo total | Agentic AI co-pilot per module, predictive analytics (turnover, deal-risk, churn), partner co-sell network (Crossbeam-style account mapping), document collaboration, mobile native app, public API + marketplace, white-label partner portal, multi-tenant architecture |

---

## 1. Where we are vs the market

| Capability | BGroup today | Market leaders 2026 |
|---|---|---|
| **AI assistance** | None | Smart Deal Progression, Agentic AI agents act on data autonomously [HubSpot Spring '26](https://www.hubspot.com/spotlight), [Salesforce Agentforce](https://vantagepoint.io/blog/sf/salesforce-vs-hubspot-2026-comparison) |
| **Deal pipeline UX** | List view only | Drag-drop kanban with stage health, [forecasting AI](https://forecastio.ai/blog/sales-pipeline-management-2026) |
| **Search** | Per-page filters + 1 CRM endpoint | Global ⌘K palette ([Superhuman pattern](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)) |
| **Email/Calendar** | None | Auto-logging of emails, calls, meetings to CRM keeps data current without rep effort [Outreach](https://www.outreach.ai/resources/blog/sales-pipeline-management-best-practices) |
| **Inline editing** | Modal-only | Direct cell editing in tables [Pencil&Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables) |
| **Optimistic UI** | Page-level loading | Instant updates, rollback on error [TKDodo on React Query](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) |
| **Real-time** | Polling | Websockets/SSE for collaboration |
| **HR AI** | None | Turnover prediction, candidate screening, JD generation, compliance flags [Techno-pulse](https://www.techno-pulse.com/2026/04/best-ai-hr-tools-in-2026-workday-ai-vs.html) |
| **Performance mgmt** | None | Goals, OKRs, 360° reviews, continuous feedback (Lattice, Leapsome) |
| **Recruitment/ATS** | None | Job posts → candidate pipeline → interview scheduling → offer |
| **Partner tiers** | Flat commission | Tier-based incentives that activate as partners hit milestones [PartnerStack](https://partnerstack.com/articles/everything-you-need-to-know-about-partner-relationship-management-software) |
| **Co-sell** | None | Crossbeam-style account mapping with overlap detection [Crossbeam](https://insider.crossbeam.com/entry/whats-a-prm-and-do-i-need-one) |
| **Mobile** | Desktop-first only | Mobile-optimized with native feel |
| **Object model** | Fixed entities | Custom objects with relational links (Attio's differentiator) [Attio](https://www.authencio.com/blog/attio-crm-review-features-pricing-customization-alternatives) |

---

## 2. Quick wins — start here (6 weeks total)

These deliver outsized perceived UX gains for tiny effort. Do them first.

### 2.1 Command Palette (⌘K)
**Problem:** Users navigate through nested sidebars; new users get lost.
**Solution:** A single ⌘K palette that searches every entity (employees, leads, deals, opportunities, companies, contracts) AND every action ("Create employee", "Approve commission", "Lock payroll for April").
- Library: [`cmdk`](https://github.com/pacocoursey/cmdk) (already shadcn-compatible)
- Index: hit `/api/global-search` which fans out across modules with the user's RBAC scope
- Wins: power users navigate 3–5× faster, discoverability solved without bigger sidebars

### 2.2 Global search backend
- Single endpoint `/api/global-search?q=...&types=employee,lead,deal`
- Use Postgres `pg_trgm` + `tsvector` indexes on the searchable columns
- Returns `[{type, id, label, sublabel, href, score}]` with role-scoped filters baked in

### 2.3 Inline table editing
**Where it matters most:**
- HR: employee status, job title, salary (admin only)
- CRM: opportunity stage, priority, next action, value
- Partners: deal value, status, notes
- Use TanStack Table v8 + a "Save on blur, undo on Esc" pattern.
- Fall back to optimistic updates so it feels instant.

### 2.4 Optimistic updates everywhere
- Wrap every `useMutation` with `onMutate` → cache update + rollback on `onError`
- `useOptimistic` is the [recommended React 19 hook](https://www.freecodecamp.org/news/how-to-use-the-optimistic-ui-pattern-with-the-useoptimistic-hook-in-react/)
- Drag-drop kanban stage changes feel native instead of "spinner → page reload"

### 2.5 Kanban deal pipeline (CRM)
- Replace `/crm/opportunities` list with a kanban view (list view stays as a tab)
- Library: [`@dnd-kit`](https://dndkit.com/) — modern, accessible, performant
- Stage column = drop zone, dragging changes stage with optimistic update
- This is the [Pipedrive-style "what to do next" UX](https://www.pipedrive.com/en/crm-comparison/attio-vs-pipedrive) sales reps love

### 2.6 Implement the deferred `/crm/my/{pipeline,today,target}` views
- We removed these from the sidebar earlier — add them back as real pages
- **Pipeline**: rep's personal kanban board
- **Today**: today's calls/meetings/follow-ups list
- **Target**: progress bar to monthly target + leaderboard rank

### 2.7 Calendar/today widget
- New `/today` page (or sidebar pinned widget) shows the user's day:
  - Pending overtime/leave/incident approvals
  - Today's calls and meetings
  - Deals closing this week
  - Upcoming birthdays/anniversaries
- Single source of truth for what each user should do *now*

### 2.8 Mobile responsive pass
- Audit on iPad / iPhone widths
- Sidebar → bottom-nav on mobile (5 most-used items + "More" sheet)
- Tables → card layout on small screens
- This is where we are losing the most usability today

### 2.9 Dark-mode finish
- Currently force-light because HR uses hardcoded `text-slate-*`
- Replace with theme tokens (`text-foreground`, `bg-card`, etc.) via codemod
- Re-enable system theme preference

### 2.10 Empty states + onboarding
- Empty tables today are blank. Replace with illustrated empty states + a CTA ("Add your first employee").
- Add a 3-step onboarding wizard for new admins: create company → invite first employee → set first payroll period
- Modern SaaS UX shows information gradually – starting with high-level summaries and revealing details only when users request them [F1Studioz](https://f1studioz.com/blog/smart-saas-dashboard-design/)

### 2.11 Keyboard shortcuts everywhere
- `j/k` to navigate rows, `e` to edit, `n` to create, `g h` to "go home", etc.
- Cheat sheet via `?` (Linear-style)

### 2.12 Real-time toasts via Server-Sent Events
- Already have `sonner` toaster mounted globally
- Add a tiny SSE endpoint `/api/events` that pushes notifications as they're created
- Replace the polling `unread-count` calls — saves DB hits and feels live

---

## 3. HR module — feature gaps to close

### 3.1 Performance management
**Why:** Lattice, Leapsome, BambooHR all ship this. It's now table-stakes for any HCM. [Leapsome](https://site.leapsome.com/blog/9-best-hrms-software-platforms-for-2026)

**Build:**
- **Goals/OKRs** — quarterly goals per employee with progress %
- **1-on-1 templates** — manager + employee shared agenda
- **Reviews** — quarterly self + manager + 360° peer review
- **Continuous feedback** — kudos and constructive feedback flow
- **Surveys** — pulse surveys with anonymized aggregation

### 3.2 Recruitment / ATS
- **Job posts** with public URL + apply form
- **Candidate pipeline** (kanban: Applied → Screen → Interview → Offer → Hired)
- **Interview scheduler** (integrates with Google/Microsoft calendar)
- **Scorecards** per interviewer, weighted decision matrix
- **Hire → onboarding** auto-creates employee record + tasks

### 3.3 Onboarding & Offboarding workflows
- **Templates** per role: tasks for IT (laptop), HR (forms), Manager (intro meetings)
- **Day-1 dashboard** for new hires
- **Offboarding checklist** with asset return + access revocation triggers

### 3.4 Org chart
- Visual hierarchy (D3 / [react-organizational-chart](https://www.npmjs.com/package/react-organizational-chart))
- Click a node → employee profile
- Useful for new hires to learn the company; managers to plan reorgs

### 3.5 Time-off calendar
- Team view: who's out this week
- Conflict detection ("3 people in Sales already off Friday")
- Public holiday calendars per country

### 3.6 Expenses & reimbursements
- Submit receipt photo → OCR → category
- Approval chain → reimbursement on next payroll
- Mobile-first feature (most expense apps live on phones)

### 3.7 Document management
- Templates (employment contract, NDA, offer letter)
- E-signature integration (DocuSign/Dropbox Sign)
- Auto-fill from employee record
- Document expiry tracking (visa, passport, certifications)

### 3.8 HR AI features
*40% of enterprise apps will have task-specific AI agents by end of 2026* [Microsoft](https://cloudwars.com/ai/microsoft-unveils-agentic-ai-push-across-d365-power-platform-and-m365-copilot-in-2026-release-wave-1/)

- **Turnover risk score** — model on attendance patterns, comp ratio, performance, tenure
- **JD generator** — paste role title + responsibilities → generated job description
- **Resume parser** — drop CV, auto-fill candidate fields
- **Policy chatbot** — "How many days of leave do I have left?" answered from data + policy docs
- **Compliance flags** — surface contracts/probations expiring, unusual overtime patterns
- **Anomaly detection** — late-clocking spikes, unusual bonus approvals

### 3.9 Payroll exports & accounting integrations
- Export to QuickBooks Online, Xero, Zoho Books
- Configurable mapping of cost centers per company

---

## 4. CRM module — feature gaps to close

### 4.1 Email integration (highest leverage)
*Auto-logging keeps opportunity data current without rep effort and gives leaders real-time pipeline visibility without chasing updates.* [Outreach](https://www.outreach.ai/resources/blog/sales-pipeline-management-best-practices)

- **Inbox sync** — Gmail + Microsoft Graph; auto-log emails to the matching contact/opportunity
- **Send from CRM** with templates and merge tags
- **Open/click tracking** with privacy-respectful pixel
- **Unified thread view** on opportunity page

### 4.2 Calendar integration
- Two-way sync with Google/Outlook
- Meeting scheduler (Calendly-style) with public booking page per rep
- Calendar widget on opportunity = next meeting, last meeting

### 4.3 Sales sequences/cadences
- Multi-step touch sequences (Day 1 email, Day 3 LinkedIn, Day 5 call)
- Auto-pause when prospect replies
- Sequence performance metrics

### 4.4 Quotes & proposals
- Quote builder (line items from product catalog, discounts, tax)
- Proposal template engine with variables
- E-signature on accept → auto-update opportunity to WON

### 4.5 Workflow automation engine
- Trigger types: opportunity stage change, time-based, field-update
- Actions: create task, send email, update field, post to Slack, webhook
- Visual builder (low-code)
- Many March 2026 changes addressed limitations teams previously worked around [HubSpot updates](https://harro.com/2026/04/24/15-hubspot-updates-from-march-2026-managers-and-admins-need-to-know/) — invest here

### 4.6 Smart Deal Progression / pipeline health
*Teams are shifting from how big the pipeline looks to how healthy it actually is — engagement, stage duration, slippage matter more than raw pipeline value.* [Forecastio](https://forecastio.ai/blog/sales-pipeline-management-2026)

- **Deal-health score** per opportunity (engagement freshness, stage duration vs avg, multi-stakeholder coverage)
- **Risk flags** in the pipeline view (no activity > N days, proposal stuck, closing date slipped)
- **Next-best-action** suggestions per deal (AI generates "schedule a check-in", "send case study X")

### 4.7 Custom objects (Attio-style)
*Attio's relational, object-based data model lets you create custom objects (e.g., 'Investors,' 'Fundraising Rounds,' 'Product Feedback') and define how they link to each other.* [Attio review](https://www.authencio.com/blog/attio-crm-review-features-pricing-customization-alternatives)

- Schema-flex layer on top of Postgres (Prisma)
- Lets BGroup model their actual sales process (e.g., "Site Visit", "Engineering Estimate") without forking the codebase

### 4.8 AI agents in CRM
- **Meeting prep agent** — given an opportunity, generate a brief: company background, last touchpoints, open issues, recommended talking points
- **Email drafter** — "Draft a follow-up after our call" → context-aware draft
- **Pipeline review agent** — weekly auto-summary of pipeline movement, biggest risks, deals at risk of slipping
- **Forecasting agent** — predicted revenue with confidence interval, considering historical close rates per rep, per stage, per source

---

## 5. Partners module — feature gaps to close

### 5.1 Tiered partner program
*Tier-based incentives activate as partners hit milestones.* [PartnerStack](https://partnerstack.com/articles/everything-you-need-to-know-about-partner-relationship-management-software)

- Tiers: Bronze / Silver / Gold / Platinum
- Auto-promote based on rolling 90-day commission volume
- Tier-specific commission rates (Bronze 10%, Platinum 18%)
- Tier-specific perks: priority support, MDF eligibility, co-marketing slots

### 5.2 Deal registration with conflict detection
- Partner registers a deal **before** approaching the prospect
- System checks: is this prospect already an active customer? Another partner's registered deal?
- Approved registration locks the partner-deal mapping for N days
- Critical to prevent partner-vs-direct or partner-vs-partner conflict

### 5.3 MDF (Market Development Funds)
- Partners request funds for marketing campaigns
- Approval workflow + budget cap per tier
- Required ROI report after campaign

### 5.4 Co-sell / account mapping
*Crossbeam lets you and your partners securely share account data to find overlapping customers and prospects for co-selling opportunities.* [Crossbeam 101](https://insider.crossbeam.com/entry/whats-a-prm-and-do-i-need-one)

- Partner uploads their account list (privacy-respecting)
- System finds overlap with our prospects/customers
- Surface "Partner X has a relationship with Acme Corp" on the opportunity page
- Trigger collaborative motions (joint outreach, demo, etc.)

### 5.5 Training & certifications
- Course catalog (videos, PDFs, quizzes)
- Cert exam → digital badge
- Certified partners unlock higher commissions / preferred status

### 5.6 Partner marketing assets library
- Logos, slide decks, case studies, email templates
- Co-brandable PDFs (drop in partner logo)
- Usage tracking (which assets work)

### 5.7 White-labeling
- Per-partner subdomain (`acme.partners.bgroup.com`)
- Custom logo + accent color in the portal
- Critical for resellers who want to own the customer experience

### 5.8 Automated payouts
*PartnerStack automates partner pay with a single monthly invoice.*

- Stripe Connect / Wise integration
- Schedule monthly auto-payout in partner's currency
- 1099-NEC / W-8BEN tax form collection

### 5.9 Fraud detection
- Outlier detection on conversion rate, commission velocity, refund rate
- Flag suspicious partners for manual review

---

## 6. Cross-cutting upgrades

### 6.1 AI Co-pilot (single ⌘J pane)
- Always-available AI side panel
- Context-aware: knows the page you're on
- Capabilities:
  - **Q&A** over your data ("Who's our top performer this quarter?")
  - **Action suggestions** ("Approve all 3 pending overtime requests for Engineering")
  - **Drafting** (emails, JDs, contract clauses)
  - **Bulk operations** ("Move all opps with no activity > 14 days to STALLED")
- Tech: Claude Sonnet 4.6 + tool-use, with a strict allowlist of tools the agent can call. Server-side audit log of every agent action.

### 6.2 Notification fan-out
- Today: in-app only, polled
- Add channels: email digest (daily/weekly), web push, optional WhatsApp/SMS for urgent
- User preferences page per channel/event-type

### 6.3 Audit trail UI
- We have audit logs in DB but no UI
- Build `/audit` page (admin) with filters by user/entity/date
- Per-record "Activity" tab on entity pages
- Compliance asset for SOC 2 / ISO 27001 readiness

### 6.4 Reports & analytics
- Replace per-page chart code with a unified analytics layer (Tinybird / Cube / our own SQL view library)
- Saved-report builder (admin can save filtered views)
- Scheduled email digests
- Cohort analysis (employee tenure × turnover, partner tier × revenue)

### 6.5 Webhooks & public API
- Outbound webhooks per event type (deal.won, employee.hired, commission.paid)
- Public REST + GraphQL API with API keys
- Enables integrations + customer extensions
- API key with scope limits (read-only, per-module)

### 6.6 Performance
- Index audit (Prisma + EXPLAIN ANALYZE on the slowest queries)
- Move from page-level loading to React Suspense boundaries
- Edge-render the dashboards (Vercel edge)
- Bundle splitting per module (lazy-load CRM if user is HR-only)

### 6.7 Accessibility (WCAG 2.2 AA)
- Audit with axe-core CI step
- Focus management for modals/drawers
- Keyboard-navigable kanban
- Screen-reader-friendly charts

### 6.8 Observability
- Sentry for errors
- PostHog or Mixpanel for product analytics ("which feature do super_admins never use?")
- OpenTelemetry traces (Next.js + Prisma)
- Health/uptime page

### 6.9 Security upgrades
- 2FA (TOTP + WebAuthn) on top of NextAuth
- SAML/SSO for enterprise customers (Workday-style large clients)
- Row-level security in Postgres for the admin module switch
- Rate limiting upgrade (we have basic on login; extend to all writes)
- Pen-test + SOC 2 Type 1 prep

### 6.10 Multi-tenant architecture
- Today: implicitly single-tenant. If BGroup wants to sell this externally, need:
- Schema-per-tenant or row-level tenant_id everywhere
- Per-tenant configuration (currency, locale, terminology)
- Per-tenant feature flags (some tenants get AI, some don't)

### 6.11 Native mobile apps (last)
- Once web is mobile-responsive, ship React Native (Expo)
- Push notifications (the killer mobile feature for approvals)
- Camera-based receipt capture for expenses
- Offline mode for clock-in/out attendance

---

## 7. UX patterns to apply throughout

These are not features — they're principles to fold into every page.

### 7.1 Progressive disclosure
*Show only what users need to complete current tasks; hide advanced options until users are ready.* [Onething Design](https://www.onething.design/post/b2b-saas-ux-design)
- Default forms show 5–7 fields. "Show advanced" reveals the rest.

### 7.2 Role-based interfaces
*Permission-aware experiences hide irrelevant complexity; clear separation between operational and administrative tasks.* [Equal](https://www.equal.design/blog/saas-ux-best-practices-b2b-us)
- We do role gating on routes; extend it to component-level. Don't render a "Delete Employee" button that a manager will only get rejected for.

### 7.3 Bulk actions
- Multi-select rows + a context bar at the top: "3 selected: [Approve] [Reject] [Export]"
- Apply to: overtime requests, leave requests, bonuses, commission payouts, partner deals

### 7.4 Skeleton loaders, not spinners
- Already partially in place. Audit every page.

### 7.5 Last-action quick links
- "Recently viewed" + "Pinned" lists in the sidebar
- Reduces clicks for repeat tasks

### 7.6 Saved views / filters
- Every list table should let users save a filter set as a named view
- Set defaults per role (HR Manager defaults to "Pending approvals")

### 7.7 Help & guidance
- In-app help (Intercom / Plain / our own)
- Contextual hints (first-time tooltip on a feature)
- Changelog in-app for new releases
- Video walkthroughs for complex flows (payroll lock, contract review)

### 7.8 Error messages with action
- Bad: "Permission denied"
- Good: "Only super admins can lock payroll. Ask Sara (HR Director) to lock, or check your role here."

### 7.9 Confirmation patterns
- Destructive actions need typed confirmation ("Type DELETE to confirm")
- Never confirm twice ("Are you sure? Are you REALLY sure?")

### 7.10 Loading state choreography
- Mutations: optimistic update → show success toast → auto-dismiss
- Avoid full-page loading states except on first navigation

---

## 8. Suggested phasing — 12-month plan

### Q1 (months 1–3) — UX foundation
- Quick wins block (§2): command palette, global search, kanban, optimistic updates, mobile pass, dark-mode polish
- Set up Sentry, PostHog, OpenTelemetry
- Empty states + onboarding wizard

### Q2 (months 4–6) — Productivity & integrations
- Email + calendar sync (CRM)
- Workflow automation engine
- Time-off calendar + Org chart (HR)
- Audit-trail UI + reports/analytics layer
- 2FA + WebAuthn

### Q3 (months 7–9) — Intelligence
- AI Co-pilot (cross-module)
- Smart Deal Progression in CRM
- Turnover risk + JD generator in HR
- Partner deal-health metrics
- Notification fan-out (email, push)

### Q4 (months 10–12) — Strategic depth
- Performance reviews + recruitment ATS (HR)
- Quotes/proposals + sequences (CRM)
- Partner tiers + deal registration + co-sell + automated payouts
- Webhooks + public API
- Security: SAML/SSO, SOC 2 prep

After Q4: native mobile apps and multi-tenant if BGroup wants to sell externally.

---

## 9. Effort × impact matrix (selected items)

```
                     │
       HIGH          │   ⭐ Email/cal sync   ⭐ AI Co-pilot
                     │   ⭐ Kanban deals
                     │   ⭐ Optimistic UI    ⭐ Performance reviews
                     │   ⭐ Mobile pass      ⭐ Partner tiers
       Impact        │
                     │   • Dark-mode poli    • Recruitment ATS
                     │   • Empty states      • Workflow automation
                     │   • Org chart         • SAML SSO
       LOW           │   • Help tooltips     • Multi-tenant
                     ┼─────────────────────────────────────
                          LOW      Effort      HIGH
```

---

## 10. Specific shadcn / library suggestions

| Need | Library |
|---|---|
| Command palette | [`cmdk`](https://github.com/pacocoursey/cmdk) |
| Kanban / drag-drop | [`@dnd-kit/core`](https://dndkit.com/) |
| Charts (richer) | [`tremor`](https://tremor.so) on top of Recharts |
| Tables (powerful) | TanStack Table v8 + shadcn data-table |
| Date picker (Arabic-aware) | [`react-day-picker`](https://daypicker.dev/) (already in shadcn) |
| Form schemas | Keep Zod v4 — already standard |
| Animation | [`framer-motion`](https://www.framer.com/motion/) |
| AI streaming | [`@ai-sdk/react`](https://sdk.vercel.ai/) (Vercel AI SDK 5) |
| WebSocket / SSE | [`partykit`](https://www.partykit.io/) or just native EventSource |
| E-signature | DocuSign or Dropbox Sign API |
| Email/Calendar | [`googleapis`](https://github.com/googleapis/google-api-nodejs-client) + `@microsoft/microsoft-graph-client` |
| OCR (expenses) | [`tesseract.js`](https://tesseract.projectnaptha.com/) or AWS Textract for accuracy |

---

## 11. What I'd build first if I had 2 weeks

If forced to pick three things:

1. **Command palette + global search** — single biggest UX delta for power users
2. **Kanban deal pipeline + optimistic updates** — turns CRM from "data entry" into "sales tool"
3. **Mobile responsive pass** — unlocks 100% of users on the device they use most

Two weeks. Three things. Massive perceived improvement.

---

## Sources

- [HubSpot Spring 2026 Spotlight: AI Agents, AEO & CRM Shift](https://www.fastslowmotion.com/hubspot-spring-2026-spotlight/)
- [Spring 2026 Spotlight — HubSpot](https://www.hubspot.com/spotlight)
- [15 HubSpot updates from March 2026 managers and admins need to know](https://harro.com/2026/04/24/15-hubspot-updates-from-march-2026-managers-and-admins-need-to-know/)
- [Salesforce vs. HubSpot in 2026: The Definitive CRM Comparison](https://vantagepoint.io/blog/sf/salesforce-vs-hubspot-2026-comparison)
- [Sales pipeline management best practices (2026 Guide) — Outreach](https://www.outreach.ai/resources/blog/sales-pipeline-management-best-practices)
- [Sales Pipeline Management in 2026 — Forecastio](https://forecastio.ai/blog/sales-pipeline-management-2026)
- [What Is a Sales Pipeline? Stages, Metrics, Best Practices (2026) — Apollo](https://www.apollo.io/insights/what-is-a-sales-pipeline)
- [Attio CRM Review 2026: Features, Pricing, Customization, Alternatives](https://www.authencio.com/blog/attio-crm-review-features-pricing-customization-alternatives)
- [Pipedrive vs. Attio | Alternative to Attio](https://www.pipedrive.com/en/crm-comparison/attio-vs-pipedrive)
- [Best AI HR Tools in 2026: Workday AI vs BambooHR vs Rippling vs Lattice](https://www.techno-pulse.com/2026/04/best-ai-hr-tools-in-2026-workday-ai-vs.html)
- [Best HR Software in 2026: Top 10 HR Systems Ranked](https://harmonyhr.org/blog/top-10-hr-systems-ranked.html)
- [13 Leading Workday Competitors Transforming HR in 2026](https://www.thrivesparrow.com/blog/workday-competitors)
- [Best HRMS Software Competitors to Watch in 2026 — Leapsome](https://site.leapsome.com/blog/9-best-hrms-software-platforms-for-2026)
- [Top 8 Partner Ecosystem Platforms for Co-Selling in 2026](https://scopicstudios.com/blog/top-partner-ecosystem-platforms/)
- [Channel 101: What Is a PRM and Should I Use One? — Crossbeam](https://insider.crossbeam.com/entry/whats-a-prm-and-do-i-need-one)
- [Everything You Need to Know About PRM Software in 2026 — PartnerStack](https://partnerstack.com/articles/everything-you-need-to-know-about-partner-relationship-management-software)
- [PRM software comparison: top 10 partner management platforms for 2026 — Monday](https://monday.com/blog/crm-and-sales/prm-software/)
- [B2B SaaS UX Design in 2026: Challenges & Patterns — Onething Design](https://www.onething.design/post/b2b-saas-ux-design)
- [Smart SaaS Dashboard Design Guide (2026) — F1Studioz](https://f1studioz.com/blog/smart-saas-dashboard-design/)
- [US SaaS UX Best Practices for B2B Platforms — Equal Design](https://www.equal.design/blog/saas-ux-best-practices-b2b-us)
- [7 SaaS UX Design Best Practices for 2026 — Mouseflow](https://mouseflow.com/blog/saas-ux-design-best-practices/)
- [How to build a remarkable command palette — Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)
- [Command Palette UI Design — Mobbin](https://mobbin.com/glossary/command-palette)
- [The UX of Keyboard Shortcuts — Bootcamp](https://medium.com/design-bootcamp/the-art-of-keyboard-shortcuts-designing-for-speed-and-efficiency-9afd717fc7ed)
- [Inline Editing Implementation — Apiko](https://apiko.com/blog/inline-editing/)
- [Bulk action UX: 8 design guidelines — Eleken](https://www.eleken.co/blog-posts/bulk-actions-ux)
- [Data Table Design UX Patterns — Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Optimistic UI with React 19 useOptimistic — freeCodeCamp](https://www.freecodecamp.org/news/how-to-use-the-optimistic-ui-pattern-with-the-useoptimistic-hook-in-react/)
- [Concurrent Optimistic Updates in React Query — TKDodo](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
- [Microsoft Unveils Agentic AI Push in 2026 Release Wave 1 — Cloud Wars](https://cloudwars.com/ai/microsoft-unveils-agentic-ai-push-across-d365-power-platform-and-m365-copilot-in-2026-release-wave-1/)
- [Dynamics 365 Copilot in 2026 — App Verticals](https://www.appverticals.com/blog/dynamics-365-copilot/)
- [10 Best AI CRM Platforms 2026 — Email Vendor Selection](https://www.emailvendorselection.com/best-ai-crm/)
