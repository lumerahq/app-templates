# Lumera App Templates

> A product-led approach to finance automation — from weeks to days.

## Overview

Lumera is a platform for building AI-powered finance automation apps. The **Template Platform** transforms Lumera from a custom-build model into a scalable, product-led growth engine by providing pre-built, forkable templates that customers can deploy and customize rapidly.

### The Challenge

| Current State | Impact |
|---------------|--------|
| Every deal requires custom app builds | Long sales cycles |
| Prospects wait weeks/months for value | Slow time-to-live |
| High per-customer delivery cost | Scaling limitations |
| Founder-led implementation required | Growth bottleneck |

### The Solution

A library of **pre-built finance automation templates** that:
- Demonstrate value immediately (live demos with sample data)
- Fork and customize for specific business logic
- Go live in days instead of weeks
- Enable self-serve adoption with implementation upsell

---

## Platform Architecture

Every Lumera app is built on **five reusable primitives**. Templates are simply configurations of these building blocks.

```
┌─────────────────────────────────────────────────────────────┐
│                    LUMERA APP TEMPLATE                      │
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   │
│  │   INGEST    │──▶│   CONTEXT   │──▶│    DECISION     │   │
│  │ CONNECTORS  │   │    STORE    │   │     ENGINE      │   │
│  └─────────────┘   └─────────────┘   └────────┬────────┘   │
│                                               │             │
│                                               ▼             │
│                    ┌──────────────────────────────┐        │
│                    │        ACTION LAYER          │        │
│                    │   (ERP, Email, Slack, etc)   │        │
│                    └──────────────┬───────────────┘        │
│                                   │                         │
│                                   ▼                         │
│                    ┌──────────────────────────────┐        │
│                    │   OBSERVABILITY & AUDIT      │        │
│                    └──────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Primitive 1: Ingest Connectors

Standardized adapters that pull data from upstream systems.

| Type | Description | Examples |
|------|-------------|----------|
| **API Pull** | Scheduled/webhook-triggered reads from SaaS | Salesforce, NetSuite, QBO, Workday, Gusto |
| **Document Ingest** | Emails, PDFs, spreadsheets via forwarding/SFTP/upload | Invoice PDFs, contracts, payroll reports |
| **Event Stream** | Real-time webhook listeners | "Deal closed", "Invoice received" |

```yaml
# Example: Billing template ingest config
ingest:
  - type: api_pull
    source: salesforce
    object: Opportunity
    trigger: on_close_won
    fields: [amount, close_date, contract_term, products]
  - type: document_ingest
    source: email_forward
    parser: contract_extraction
    fields: [payment_terms, milestones, variable_consideration]
```

### Primitive 2: Context Store

The knowledge base storing business rules, reference data, and historical patterns that enable intelligent decisions.

| Context Type | Description |
|--------------|-------------|
| **Business Rules** | Chart of accounts mappings, approval thresholds, compliance policies, rev rec rules |
| **Reference Data** | Vendor/customer master, employee roster, cost center hierarchy, GL taxonomy |
| **Historical Patterns** | How vendors are typically coded, contract structures, approved exceptions |

> **Key Insight**: The Context Store is where 80% of customization happens. This is what makes each deployment unique to the customer's business logic.

### Primitive 3: Decision Engine

AI-powered core that applies business context to incoming data.

| Pattern | Use Case |
|---------|----------|
| **Classify & Route** | Code invoices to GL accounts, identify performance obligations |
| **Validate & Flag** | Check POs against budget, flag unusual contract terms |
| **Calculate & Generate** | Generate rev rec schedules, build flux analysis narratives |
| **Match & Reconcile** | Match payments to invoices, reconcile bank to GL |

### Primitive 4: Action Layer

Output adapters that execute downstream actions.

- **ERP Write** — Post JEs, create invoices, update records (NetSuite/QBO/Sage)
- **Communication** — Send emails, post to Slack, create tasks
- **Document Generation** — Produce invoices, reports, board packages
- **Approval Workflow** — Route for human review, collect approvals, handle escalation
- **Data Export** — Push to spreadsheets, BI tools, data warehouses

### Primitive 5: Observability & Audit Trail

Finance-grade logging and monitoring.

- **Decision Log** — Every AI decision with inputs, context, reasoning, and output
- **Action Log** — Every downstream action (JE posted, email sent, etc.)
- **Exception Queue** — Items needing human review with full context
- **Metrics & Dashboards** — Processing volumes, error rates, time savings

---

## Template Library

### Record-to-Report (Accounting & Close)

| Template | Description | Buyer |
|----------|-------------|-------|
| **Month-End Close Checklist Agent** | Orchestrates close tasks, auto-generates flux narratives, tracks completion, flags blockers | Controller / Accounting Manager |
| **Intercompany Reconciliation** | Matches transactions across entities, flags mismatches, generates elimination entries | Controller |
| **Journal Entry Automation** | Reads accrual/amortization schedules → generates JEs → posts to ERP with approval | Staff Accountant / Controller |
| **Flux Analysis & Variance Reporter** | Pulls actuals vs. budget, generates plain-English variance explanations | FP&A / Controller |
| **Fixed Asset Tracker** | Ingests capitalized invoices, calculates depreciation, tracks disposals | Accounting Manager |
| **Lease Accounting (ASC 842)** | Extracts lease terms, builds amortization schedules, generates ROU asset/liability JEs | Controller / Technical Accounting |

### Order-to-Cash (Revenue & Billing)

| Template | Description | Buyer |
|----------|-------------|-------|
| **Billing & Revenue Recognition** | Ingests contracts, generates invoices, calculates ASC 606 rev rec schedules | Revenue Accountant / Controller |
| **Collections Agent** | Monitors AR aging, sends graduated reminders, escalates to Slack, logs touchpoints | AR Manager |
| **Cash Application** | Matches payments to invoices using remittance + AI fuzzy matching | AR Manager |
| **Contract Review & Revenue Impact** | Extracts key terms, flags rev rec implications | Revenue Accountant |
| **Deferred Revenue Waterfall** | Maintains deferred revenue schedules, generates roll-forwards, produces ARR/MRR reports | FP&A / Revenue Accountant |

### Procure-to-Pay (AP & Procurement)

| Template | Description | Buyer |
|----------|-------------|-------|
| **Invoice Processing & Coding** | Ingests invoices, extracts line items, auto-codes to GL, routes for approval | AP Manager |
| **Procurement Compliance Agent** | Reviews POs against policy, flags violations, routes exceptions | Procurement / Controller |
| **Vendor Onboarding & Risk** | Collects W-9s/W-8s, validates TINs, screens sanctions lists | AP Manager |
| **Three-Way Match** | Matches POs → receipts → invoices, flags discrepancies, auto-approves within tolerance | AP Manager |
| **Spend Analytics** | Aggregates AP data, flags anomalies (duplicates, unusual vendors, budget overruns) | CFO / FP&A |

### Treasury & Cash Management

| Template | Description | Buyer |
|----------|-------------|-------|
| **Cash Flow Forecasting** | Pulls AR/AP aging, payroll, debt service → generates 13-week forecast | Treasury / CFO |
| **Bank Reconciliation** | Ingests bank feeds, matches to GL, flags unreconciled items | Accounting Manager |
| **Intercompany Cash Management** | Tracks intercompany loans, calculates interest, generates settlements | Treasury |

### People & Payroll

| Template | Description | Buyer |
|----------|-------------|-------|
| **Payroll Journal Entry Generator** | Maps payroll register to GL accounts, generates JEs, handles mid-period accruals | Controller / Payroll Manager |
| **Stock-Based Comp Expense Allocator** | Calculates periodic expense by vesting schedule, allocates across departments | Controller / Equity Admin |
| **Commission Calculator** | Ingests CRM deal data + comp plans, calculates commissions, generates accruals | Sales Ops / Controller |

### Tax & Compliance

| Template | Description | Buyer |
|----------|-------------|-------|
| **Sales Tax Compliance** | Monitors nexus thresholds, calculates obligations by jurisdiction | Tax Manager |
| **1099 / Withholding Tracker** | Tracks vendor payments against thresholds, validates W-9 data, generates filings | Tax / AP Manager |
| **Transfer Pricing Documentation** | Aggregates intercompany data, applies pricing policies, generates documentation | Tax Manager |

### FP&A & Strategic Finance

| Template | Description | Buyer |
|----------|-------------|-------|
| **Budget vs. Actual Reporting** | Compares actuals to budget/forecast, generates variance reports with commentary | FP&A |
| **Board Reporting Package** | Assembles KPIs, financial summaries, variance analysis into formatted deck | CFO / FP&A |
| **Scenario Modeling Agent** | Takes base model + assumptions, runs scenarios, generates comparisons | FP&A / CFO |
| **Headcount Planning** | Syncs with HRIS, tracks open roles, models fully-loaded cost by department | FP&A / HR Finance |

---

## Forking & Customization

Lumera templates support **two modes of customization** — designed for different user needs and complexity levels.

### Two-Track Customization Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TEMPLATE CUSTOMIZATION                           │
│                                                                     │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │     SETTINGS & MAPPINGS     │  │      CODING AGENT           │  │
│  │        (Config UI)          │  │    (LLM-Powered)            │  │
│  ├─────────────────────────────┤  ├─────────────────────────────┤  │
│  │ • Chart of accounts         │  │ • Custom pages & views      │  │
│  │ • Approval thresholds       │  │ • New workflow steps        │  │
│  │ • Field mappings            │  │ • UI components             │  │
│  │ • Integration credentials   │  │ • Business logic branches   │  │
│  │ • Notification preferences  │  │ • Custom automations        │  │
│  │ • User roles & permissions  │  │ • Report templates          │  │
│  ├─────────────────────────────┤  ├─────────────────────────────┤  │
│  │ WHO: Finance users          │  │ WHO: Power users, admins    │  │
│  │ HOW: Forms & dropdowns      │  │ HOW: Natural language       │  │
│  └─────────────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Track 1: Settings & Mappings (Config UI)

For business configuration that doesn't require code changes. Users interact through guided forms.

| Setting Type | Examples |
|--------------|----------|
| **Reference Data** | Upload chart of accounts, vendor master, customer list |
| **Business Rules** | Approval thresholds, coding rules, escalation policies |
| **Integrations** | OAuth connections, field mappings, sync frequency |
| **Preferences** | Notification channels, dashboard widgets, report schedules |

### Track 2: Coding Agent (LLM-Powered Customization)

For structural changes to pages, flows, and app behavior. Users describe what they want in natural language; the platform's built-in Coding Agent writes the code.

**What users can customize via Coding Agent:**

| Area | Examples |
|------|----------|
| **Pages & Views** | New dashboards, detail views, list pages, approval queues |
| **Workflows** | Additional steps, conditional branches, parallel paths |
| **UI Components** | Custom cards, charts, filters, bulk actions |
| **Automations** | New triggers, decision logic, action sequences |
| **Reports** | Custom report templates, export formats, scheduled deliveries |

**Example prompts:**

```
"Add a page that shows all invoices pending approval
 grouped by department, with a bulk approve button"

"Create a vendor scorecard page that shows payment history,
 average processing time, and exception rate"

"When an invoice is over $50k, require VP approval and add
 a comment field explaining the purchase"

"Add a Slack notification when the weekly cash forecast
 drops below our runway threshold"
```

### Customization by Layer

| Layer | Settings UI | Coding Agent |
|-------|-------------|--------------|
| **Ingest Connectors** | OAuth, field mappings | Custom parsers, new sources |
| **Context Store** | Upload reference data, set thresholds | Custom rule logic |
| **Decision Engine** | Confidence thresholds | New decision patterns |
| **Action Layer** | Notification prefs, approval routing | Custom actions, integrations |
| **UI & Pages** | Widget preferences | **Full page/flow customization** |
| **Observability** | Alert thresholds | Custom dashboards, reports |

> **Key Insight**: Settings UI handles the "what" (data, thresholds, mappings). The platform's **Coding Agent** handles the "how" (pages, flows, logic). Users never need to write code directly, but they get code-level flexibility through natural language.

---

## Building with Lumera CLI

Templates are built using the Lumera CLI workflow:

### Project Setup
```bash
lumera init my-template          # Scaffold new project
lumera app dev                   # Start dev server
lumera app deploy                # Build and deploy frontend
```

### Platform Resources
```bash
lumera platform plan             # Preview changes (dry run)
lumera platform apply            # Apply collections, automations, hooks
lumera platform pull             # Pull remote state to local
lumera platform destroy          # Delete all resources
```

### Running Scripts
```bash
lumera run scripts/seed-demo.py  # Run local scripts with uv
```

### Resource Types
- **Collections** — Data schemas and storage
- **Automations** — Triggered workflows and decision logic
- **Hooks** — Event handlers and integrations

---

## Implementation Priorities

### Scoring Criteria

| Criterion | Description |
|-----------|-------------|
| **Universality** | Does every company need this? |
| **Pain Intensity** | How much does the current process hurt? |
| **Demo-ability** | Can you show value in 15 minutes? |
| **Expansion Potential** | Does it lead to adjacent upsells? |
| **Competitive Differentiation** | Does it showcase Lumera's AI advantage? |

### Wave 1 (Launch Templates)

1. **Invoice Processing & GL Coding** — Universal pain, great demo, expands to procurement
2. **Billing & Revenue Recognition** — High SaaS pain, competitive against Tabs
3. **Month-End Close + Flux Analysis** — Every company closes books; AI narratives are killer demo
4. **Payroll Journal Entry Generator** — Universal need, quick win, touches every department
5. **Collections Agent** — Visible ROI, easy demo, high engagement

### Wave 2 (Expansion)

6. Commission Calculator
7. Procurement Compliance Agent
8. Cash Flow Forecasting
9. Bank Reconciliation
10. Board Reporting Package

---

## Go-to-Market Model

### Before (Custom Build)
```
Discovery → Scoping → SOW → Build → Test → Go-live → Expand
Timeline: 4-12 weeks
```

### After (Template + Fork + Coding Agent)
```
Browse → Live Demo → Fork → Configure Settings → Connect Systems → Go-live
                                      ↓
                            Prompt Coding Agent → Preview → Ship
                                      ↓
                              Iterate as needed
```

**The unlock**: Customers can continuously customize their app post-launch through natural language, without waiting for Lumera professional services.

### Pricing Tiers

| Tier | Description |
|------|-------------|
| **Free** | Explore templates with sample data |
| **Self-Serve** | Fork + configure + connect ($X/month SaaS) |
| **Guided Setup** | Lumera team configures context store ($Y one-time + SaaS) |
| **Enterprise** | Custom templates, dedicated support, complex integrations |

---

## Execution Plan: Ship Templates Fast

### Core Insight

If every template is just a **configuration** of the same 5 primitives, then shipping 20+ templates in 2 weeks is about:
1. Building reusable components once
2. Parallelizing template assembly
3. Using our own Coding Agent to accelerate

### What a "Template" Actually Is

```
Template = Connector configs + Context schema + Decision prompts + UI pages + Sample data
```

Most of this is **declarative config**, not custom code.

### Week 1: Build the Shared Layer

| Day | Focus | Output |
|-----|-------|--------|
| 1-2 | **Connector library** | Verified adapters for top systems (NetSuite, QBO, Salesforce, email ingest) |
| 1-2 | **Template schema** | Standard YAML/JSON structure all templates follow |
| 2-3 | **Decision pattern library** | 4 reusable patterns as prompt templates (classify, validate, calculate, match) |
| 3-4 | **Action components** | ERP write, Slack notify, email send, approval routing |
| 4-5 | **Template scaffold CLI** | `lumera init --template invoice-processing` generates structure |
| 4-5 | **Sample data generator** | Realistic demo data for each finance domain |

### Week 2: Parallelize Template Creation

Assign templates to team members. Each template needs:

| Component | Effort | Who |
|-----------|--------|-----|
| Config file (connectors, context schema, decisions) | ~2 hrs | Engineer |
| 2-3 UI pages (list view, detail view, dashboard) | ~3 hrs | Use Coding Agent |
| Sample data + seed script | ~1 hr | Engineer |
| README + setup guide | ~30 min | Engineer |

**Per template: ~1 day** if shared layer exists.

### Template Assembly Line

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEMPLATE FACTORY                             │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   Scaffold   │──▶│  Configure   │──▶│  Generate UI │        │
│  │   Template   │   │  Connectors  │   │  w/ Coding   │        │
│  │              │   │  + Context   │   │    Agent     │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  Add Sample  │──▶│    Test &    │──▶│   Publish    │        │
│  │     Data     │   │    Polish    │   │  to Gallery  │        │
│  └──────────────┘   └──────────────┘   └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Use Coding Agent to Build Templates

Prompt the Coding Agent for each template's UI:

```
"Create an invoice processing app with:
 - Inbox page showing incoming invoices with status
 - Detail page with extracted fields, GL coding, approval actions
 - Dashboard showing processing stats, exceptions, aging
 - Settings page for approval thresholds and GL mappings"
```

The agent generates the pages; engineers wire up connectors and decisions.

### Batch by Shared Components

Group templates that share infrastructure:

| Batch | Templates | Shared |
|-------|-----------|--------|
| **AP Batch** | Invoice Processing, Three-Way Match, Vendor Onboarding | AP connectors, vendor context |
| **AR Batch** | Billing, Collections, Cash Application | AR connectors, customer context |
| **Close Batch** | Month-End Close, JE Automation, Flux Analysis | ERP connectors, GL context |
| **Payroll Batch** | Payroll JE, Commissions, Stock Comp | HRIS connectors, employee context |

Building one template in a batch makes the next one 50% faster.

### Minimum Viable Template

Define what "done" means for v1:

- [ ] Config file with connectors + context schema
- [ ] 1 ingest source working (even if just file upload)
- [ ] 1 decision pattern configured
- [ ] 2-3 pages (inbox, detail, dashboard)
- [ ] Sample data that tells a story
- [ ] 5-minute demo script

Skip for v1: multi-ERP support, edge cases, advanced customization.

### Team Allocation (Example: 4 engineers)

| Engineer | Week 1 | Week 2 |
|----------|--------|--------|
| **A** | Connector library | AP Batch (3 templates) |
| **B** | Decision patterns | AR Batch (3 templates) |
| **C** | Template scaffold + schema | Close Batch (3 templates) |
| **D** | Action components + sample data | Payroll + Treasury (4 templates) |

**Output: 13 templates in 2 weeks** with a 4-person team.

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Connectors take longer than expected | Start with file upload as universal fallback |
| Decision patterns need tuning | Ship with human-in-the-loop, tune post-launch |
| UI takes too long | Lean heavily on Coding Agent; accept "good enough" |
| Scope creep per template | Strict MVP definition; v2 backlog for enhancements |

---

## Quick Reference

### Template Anatomy
```yaml
name: invoice-processing
version: 1.0.0

ingest:
  - type: document_ingest
    source: email_forward
    parser: invoice_extraction

context:
  business_rules:
    - approval_matrix: {under_5k: "manager", over_5k: "director"}
  reference_data:
    - chart_of_accounts: [link_to_upload]

decisions:
  - pattern: classify_and_route
    task: "Code invoice to GL account"
    context_refs: [chart_of_accounts, coding_rules]

actions:
  - type: erp_write
    target: netsuite
    object: VendorBill
  - type: approval_workflow
    route_to: [approver_from_matrix]
```

### Key Differentiators

- **AI-Native**: LLM-powered decision engine, not just rule-based automation
- **Coding Agent Customization**: Modify pages, flows, and logic through natural language prompts — no code required
- **Two-Track Flexibility**: Simple settings UI for config, coding agent for structural changes
- **Finance-Grade Audit**: Full observability for auditors and controllers
- **Forkable Templates**: Rapid customization without rebuilding from scratch
- **Unified Platform**: Collections, automations, and hooks in one system
