# Lumera Template Prompts

> Detailed prompts for building each finance automation template using the Coding Agent.

Each prompt follows a consistent structure:
- **Problem Statement**: Why this exists
- **Target User**: Who uses it
- **Core Functionality**: What it does
- **Pages & Views**: UI requirements
- **Platform Config**: Ingest, context, decisions, actions
- **Sample Data**: What demo data to generate

---

## Shared Primitives Reference

Before building any template, ensure these shared components exist:

### Connectors
- `salesforce` - CRM data (opportunities, accounts, contacts)
- `netsuite` - ERP (GL, AP, AR, JEs)
- `quickbooks` - ERP for SMB
- `email_ingest` - Forward emails with attachments
- `file_upload` - Manual CSV/PDF upload
- `slack` - Notifications and approvals
- `google_sheets` - Spreadsheet sync

### Decision Patterns
- `classify_and_route` - Categorize items, route to workflows
- `validate_and_flag` - Check against rules, flag violations
- `calculate_and_generate` - Apply logic, produce outputs
- `match_and_reconcile` - Find corresponding items across datasets

### Action Types
- `erp_write` - Post to NetSuite/QBO
- `send_email` - Transactional emails
- `slack_notify` - Channel or DM notifications
- `create_task` - Approval tasks
- `generate_document` - PDFs, reports
- `export_data` - CSV, Google Sheets

---

# Record-to-Report (Accounting & Close)

---

## 1. Month-End Close Checklist Agent

### Problem Statement
Month-end close is a recurring nightmare. Controllers manage dozens of tasks across multiple team members using spreadsheets and email. Tasks get missed, deadlines slip, and there's no visibility into what's blocking the close. The close takes 10-15 days when it should take 5.

### Target User
Controller, Accounting Manager

### Core Functionality

**Task Orchestration**
- Pre-built close checklist with standard tasks (reconciliations, accruals, JEs, reviews)
- Assign tasks to team members with due dates
- Track completion status in real-time
- Automatically flag blockers and overdue items
- Support task dependencies (Task B can't start until Task A completes)

**Flux Analysis Generation**
- Pull actuals vs. prior period and budget from ERP
- Auto-generate plain-English explanations for material variances
- Flag accounts with variances exceeding threshold (e.g., >10% or >$10k)
- Draft narrative for management review

**Close Calendar**
- Visual timeline of close progress
- Day-by-day view of what's due
- Historical comparison (this close vs. last 3 closes)

### Pages & Views

1. **Close Dashboard**
   - Current close status (Day X of Y)
   - Tasks by status (Not Started, In Progress, Complete, Blocked)
   - Team workload view
   - Blockers and overdue items highlighted

2. **Task List**
   - Filterable by assignee, status, category
   - Bulk actions (reassign, mark complete)
   - Task detail with comments, attachments, history

3. **Flux Analysis**
   - Account-by-account variance table
   - AI-generated explanations (editable)
   - Export to Excel or board deck format

4. **Settings**
   - Close checklist template (add/remove/reorder tasks)
   - Variance thresholds
   - Team members and roles
   - Notification preferences

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [TrialBalance, Budget]
    trigger: on_demand
  - type: api_pull
    source: netsuite
    objects: [JournalEntry]
    trigger: on_close_start

context:
  - close_checklist_template: [standard_tasks]
  - variance_thresholds: {percent: 10, absolute: 10000}
  - team_roster: [sync_from_settings]
  - prior_period_actuals: [from_erp]

decisions:
  - pattern: calculate_and_generate
    task: "Generate flux analysis narratives for material variances"
    context_refs: [variance_thresholds, prior_period_actuals]
  - pattern: validate_and_flag
    task: "Identify blocked or overdue tasks"
    context_refs: [close_checklist, task_dependencies]

actions:
  - type: slack_notify
    trigger: task_overdue
    message: "Close task overdue: {task_name} assigned to {assignee}"
  - type: send_email
    trigger: close_complete
    to: controller
    template: close_summary
```

### Sample Data
- 30 close tasks across categories (reconciliations, accruals, reporting)
- 3 team members with assigned tasks
- Trial balance with 50 accounts
- Budget data for variance analysis
- 5-6 accounts with material variances needing explanation

---

## 2. Intercompany Reconciliation

### Problem Statement
Multi-entity companies waste hours reconciling intercompany transactions. Each entity records the transaction independently, leading to mismatches from timing differences, currency conversion, or data entry errors. At consolidation, these mismatches block the close and require manual investigation.

### Target User
Controller, Consolidation Accountant

### Core Functionality

**Transaction Matching**
- Pull intercompany transactions from all entities
- Auto-match transactions using amount, date, counterparty, reference
- AI-powered fuzzy matching for near-matches (timing differences, rounding)
- Flag unmatched transactions for review

**Mismatch Resolution**
- Show matched pairs with any discrepancies
- Suggest resolution (which side is correct, adjustment needed)
- Track resolution status and owner

**Elimination Entry Generation**
- Generate consolidation elimination entries for matched transactions
- Support multiple elimination scenarios (full, partial)
- Export to ERP or consolidation system

### Pages & Views

1. **Matching Dashboard**
   - Match rate (% of transactions matched)
   - Unmatched by entity pair
   - Aging of unmatched items

2. **Transaction Matching**
   - Side-by-side view of entity A vs entity B transactions
   - Auto-matched pairs (expandable to see matching logic)
   - Unmatched items with suggested matches
   - Manual match capability

3. **Elimination Entries**
   - Generated elimination JEs
   - Preview before posting
   - Post to consolidation system

4. **Settings**
   - Entity list and intercompany account mappings
   - Matching thresholds (date tolerance, amount tolerance)
   - Currency conversion rules

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [Transaction]
    filter: "account.is_intercompany = true"
    trigger: scheduled_daily
    per_entity: true

context:
  - entity_list: [upload_or_sync]
  - intercompany_accounts: [by_entity_pair]
  - matching_rules: {date_tolerance_days: 3, amount_tolerance_percent: 0.01}
  - currency_rates: [sync_from_erp]

decisions:
  - pattern: match_and_reconcile
    task: "Match intercompany transactions across entities"
    context_refs: [matching_rules, currency_rates]
  - pattern: calculate_and_generate
    task: "Generate elimination entries for matched transactions"
    context_refs: [intercompany_accounts, entity_list]

actions:
  - type: erp_write
    target: netsuite
    object: JournalEntry
    trigger: on_approval
  - type: slack_notify
    trigger: unmatched_threshold_exceeded
    message: "{count} intercompany transactions unmatched for {entity_pair}"
```

### Sample Data
- 3 entities (Parent, Sub A, Sub B)
- 50 intercompany transactions per entity
- 80% auto-matchable, 15% fuzzy-matchable, 5% true mismatches
- Sample elimination entries

---

## 3. Journal Entry Automation

### Problem Statement
Accountants spend hours each month creating recurring journal entries from spreadsheets — accruals, amortization, allocations, reclasses. It's error-prone, tedious, and adds days to the close. The logic is often trapped in complex Excel formulas that only one person understands.

### Target User
Staff Accountant, Controller

### Core Functionality

**Schedule Ingestion**
- Import accrual schedules, amortization tables, allocation models
- Support Excel upload or Google Sheets sync
- Parse schedule logic (straight-line, declining balance, custom)

**JE Generation**
- Calculate amounts based on schedule and current period
- Generate debit/credit entries with proper coding
- Support multi-line entries and allocations
- Handle reversing entries for accruals

**Approval & Posting**
- Route generated JEs for review
- Show supporting calculation detail
- Post approved entries to ERP
- Track posting status and errors

### Pages & Views

1. **Schedule Library**
   - List of all active schedules (accruals, amortization, allocations)
   - Schedule type, amount remaining, next entry date
   - Add new schedule via upload or manual entry

2. **JE Generation Queue**
   - Pending JEs for current period
   - Preview each entry with calculation breakdown
   - Approve/reject with comments
   - Bulk approve

3. **Posted Entries**
   - History of posted JEs
   - Link back to source schedule
   - Reversal status for accruals

4. **Settings**
   - GL account mappings
   - Approval routing rules
   - Posting preferences (auto-post vs. manual)

### Platform Config

```yaml
ingest:
  - type: file_upload
    format: [xlsx, csv]
    parser: schedule_extraction
  - type: api_pull
    source: google_sheets
    trigger: on_demand

context:
  - chart_of_accounts: [sync_from_erp]
  - schedule_templates: [accrual, amortization, allocation]
  - current_period: [from_erp_or_settings]
  - approval_matrix: {over_threshold: "controller"}

decisions:
  - pattern: calculate_and_generate
    task: "Calculate current period amounts from schedules"
    context_refs: [schedule_templates, current_period]
  - pattern: calculate_and_generate
    task: "Generate journal entries with proper GL coding"
    context_refs: [chart_of_accounts]

actions:
  - type: create_task
    trigger: je_generated
    assignee: from_approval_matrix
    task_type: approval
  - type: erp_write
    target: netsuite
    object: JournalEntry
    trigger: on_approval
```

### Sample Data
- 10 amortization schedules (software, prepaid expenses)
- 5 accrual schedules (bonus, rent, utilities)
- 3 allocation schedules (shared services, overhead)
- Sample GL with 30 accounts

---

## 4. Flux Analysis & Variance Reporter

### Problem Statement
Every month, FP&A and accounting spend hours explaining why numbers changed. They pull data into Excel, manually calculate variances, and write narratives. The analysis is often superficial because there's no time to dig deep. Board meetings get delayed waiting for variance explanations.

### Target User
FP&A Analyst, Controller

### Core Functionality

**Variance Calculation**
- Pull actuals, budget, forecast, and prior period from ERP
- Calculate variances ($ and %) across all accounts
- Support multiple comparison types (vs. budget, vs. forecast, vs. prior month, vs. prior year)

**AI-Powered Narratives**
- Auto-generate plain-English explanations for material variances
- Incorporate context (known events, seasonality, one-time items)
- Editable narratives — user can refine AI draft

**Report Generation**
- Formatted variance report for management
- Executive summary with key drivers
- Export to PowerPoint, PDF, or email

### Pages & Views

1. **Variance Dashboard**
   - P&L with variance columns
   - Heatmap highlighting material variances
   - Drill-down by department, project, or account

2. **Narrative Editor**
   - Account-by-account variance with AI explanation
   - Edit mode for refining narratives
   - Mark as reviewed/approved

3. **Report Builder**
   - Select accounts/sections to include
   - Customize formatting
   - Preview and export

4. **Settings**
   - Materiality thresholds
   - Comparison defaults (vs. budget, vs. prior year)
   - Report templates

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [TrialBalance, Budget, Forecast]
    trigger: on_demand

context:
  - chart_of_accounts: [sync_from_erp]
  - budget_data: [sync_from_erp_or_upload]
  - prior_periods: [last_12_months]
  - materiality_thresholds: {percent: 10, absolute: 25000}
  - known_events: [user_input]  # "Q3 had one-time legal settlement"

decisions:
  - pattern: calculate_and_generate
    task: "Calculate variances across all accounts and comparison types"
    context_refs: [budget_data, prior_periods]
  - pattern: calculate_and_generate
    task: "Generate plain-English variance explanations"
    context_refs: [materiality_thresholds, known_events, chart_of_accounts]

actions:
  - type: generate_document
    format: [pptx, pdf]
    template: variance_report
  - type: send_email
    trigger: report_complete
    to: distribution_list
    attachment: variance_report
```

### Sample Data
- 12 months of actuals (50 accounts)
- Annual budget by month
- 5-6 accounts with significant variances
- Sample narratives showing AI explanation style

---

## 5. Fixed Asset Tracker

### Problem Statement
Fixed asset accounting is tedious and error-prone. When an invoice arrives for a capitalized item, someone has to manually create the asset record, set up the depreciation schedule, and remember to book monthly depreciation. Disposals and impairments are often missed or recorded incorrectly.

### Target User
Accounting Manager, Fixed Asset Accountant

### Core Functionality

**Asset Ingestion**
- Identify capitalizable invoices based on amount/category thresholds
- Extract asset details from invoice (description, cost, useful life)
- Create asset record with proper categorization

**Depreciation Calculation**
- Support multiple methods (straight-line, declining balance, MACRS)
- Calculate monthly depreciation automatically
- Generate depreciation JEs

**Lifecycle Management**
- Track asset location, condition, responsible party
- Handle disposals (calculate gain/loss, remove from books)
- Support impairment adjustments

### Pages & Views

1. **Asset Register**
   - Full list of assets with key details
   - Filter by category, location, status
   - Search by asset tag or description

2. **Asset Detail**
   - Cost basis, accumulated depreciation, NBV
   - Depreciation schedule (past and future)
   - Audit trail of changes

3. **Depreciation Queue**
   - Monthly depreciation JEs to be posted
   - Preview and approve
   - Posting status

4. **Disposals**
   - Record disposal with proceeds
   - Calculate gain/loss
   - Generate disposal JE

5. **Settings**
   - Capitalization thresholds
   - Depreciation methods by category
   - GL account mappings

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [VendorBill]
    filter: "amount > capitalization_threshold"
    trigger: on_create
  - type: file_upload
    format: [xlsx]
    parser: asset_import

context:
  - capitalization_threshold: 5000
  - depreciation_methods: {equipment: "straight_line_5yr", vehicles: "straight_line_7yr"}
  - gl_mappings: {asset: "1500", accum_depr: "1550", depr_expense: "6100"}

decisions:
  - pattern: classify_and_route
    task: "Identify capitalizable items from invoices"
    context_refs: [capitalization_threshold]
  - pattern: calculate_and_generate
    task: "Calculate depreciation schedules and monthly amounts"
    context_refs: [depreciation_methods]
  - pattern: calculate_and_generate
    task: "Generate depreciation and disposal journal entries"
    context_refs: [gl_mappings]

actions:
  - type: erp_write
    target: netsuite
    object: JournalEntry
    trigger: on_approval
  - type: slack_notify
    trigger: new_asset_identified
    message: "New fixed asset identified: {description} (${amount})"
```

### Sample Data
- 25 fixed assets across categories (equipment, furniture, vehicles, software)
- Depreciation history for 12 months
- 2 pending disposals
- 3 new invoices to be capitalized

---

## 6. Lease Accounting (ASC 842)

### Problem Statement
ASC 842 requires companies to recognize lease liabilities and right-of-use assets on the balance sheet. This involves complex calculations (present value, amortization schedules) and ongoing journal entries. Most companies manage this in error-prone spreadsheets, risking audit findings.

### Target User
Controller, Technical Accounting Manager

### Core Functionality

**Lease Data Extraction**
- Ingest lease contracts (PDF)
- Extract key terms: commencement date, term, payments, renewal options, purchase options
- Flag ambiguous terms for human review

**ASC 842 Calculations**
- Calculate lease liability (PV of future payments)
- Calculate ROU asset
- Build amortization schedules (interest expense, lease liability reduction)
- Handle modifications (remeasurement)

**Journal Entry Generation**
- Initial recognition entries (ROU asset, lease liability)
- Monthly entries (interest expense, lease liability payment, ROU amortization)
- Modification entries

### Pages & Views

1. **Lease Portfolio**
   - All leases with key terms
   - Lease liability and ROU asset balances
   - Upcoming expirations

2. **Lease Detail**
   - Extracted terms (editable)
   - Amortization schedule
   - Journal entry history
   - Modification log

3. **Journal Entry Queue**
   - Monthly entries to be posted
   - Preview with supporting calculations

4. **Disclosure Builder**
   - Generate ASC 842 footnote disclosures
   - Maturity analysis table
   - Weighted average calculations

5. **Settings**
   - Discount rate (IBR by lease type)
   - GL account mappings
   - Lease classification rules

### Platform Config

```yaml
ingest:
  - type: document_ingest
    source: email_forward
    parser: lease_extraction
    fields: [commencement_date, term_months, monthly_payment, renewal_options]
  - type: file_upload
    format: [pdf, xlsx]

context:
  - discount_rates: {real_estate: 0.05, equipment: 0.06}
  - gl_mappings: {rou_asset: "1600", lease_liability: "2400", interest_expense: "7100"}
  - lease_classification_rules: [finance_vs_operating_criteria]

decisions:
  - pattern: classify_and_route
    task: "Extract lease terms from contracts"
    context_refs: [lease_classification_rules]
  - pattern: calculate_and_generate
    task: "Calculate lease liability, ROU asset, and amortization schedules"
    context_refs: [discount_rates]
  - pattern: calculate_and_generate
    task: "Generate ASC 842 journal entries"
    context_refs: [gl_mappings]

actions:
  - type: erp_write
    target: netsuite
    object: JournalEntry
    trigger: on_approval
  - type: generate_document
    format: [xlsx, pdf]
    template: asc842_disclosure
```

### Sample Data
- 10 leases (mix of real estate and equipment)
- 5 operating, 5 finance classification
- 12 months of historical entries
- 1 lease modification scenario

---

# Order-to-Cash (Revenue & Billing)

---

## 7. Billing & Revenue Recognition

### Problem Statement
SaaS and services companies struggle with billing complexity — usage-based pricing, milestones, variable consideration. Revenue recognition under ASC 606 requires tracking performance obligations, allocating transaction price, and recognizing over time. Most companies cobble together CRM, billing system, and spreadsheets, leading to revenue errors and audit risk.

### Target User
Revenue Accountant, Controller, Billing Operations

### Core Functionality

**Contract Ingestion**
- Pull closed-won deals from CRM
- Extract contract terms: products, quantities, prices, term, milestones
- Identify performance obligations

**Invoice Generation**
- Generate invoices based on billing schedule
- Support multiple billing models (upfront, monthly, usage, milestone)
- Send invoices to customers

**Revenue Recognition**
- Calculate standalone selling prices
- Allocate transaction price to performance obligations
- Generate rev rec schedules (point-in-time vs. over-time)
- Book revenue entries

### Pages & Views

1. **Contract Dashboard**
   - Active contracts with TCV, billing status, rev rec status
   - New contracts pending setup
   - Contracts with issues (missing data, unusual terms)

2. **Contract Detail**
   - Customer info, products, pricing
   - Performance obligations identified
   - Billing schedule and invoice history
   - Rev rec schedule and entries

3. **Invoice Queue**
   - Invoices to be generated this period
   - Preview and approve
   - Send to customer

4. **Revenue Schedule**
   - Deferred revenue balance by contract
   - Recognition schedule (waterfall view)
   - Monthly entries to be booked

5. **Settings**
   - Product catalog with SSP
   - Rev rec policies by product type
   - Invoice templates
   - ERP and CRM connections

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: salesforce
    object: Opportunity
    trigger: on_close_won
    fields: [amount, products, term, close_date]
  - type: document_ingest
    source: email_forward
    parser: contract_extraction
    fields: [payment_terms, milestones, variable_consideration]

context:
  - product_catalog: [sync_from_crm]
  - standalone_selling_prices: [by_product]
  - rev_rec_policies: {subscription: "ratable", services: "over_time", license: "point_in_time"}
  - customer_master: [sync_from_crm]

decisions:
  - pattern: classify_and_route
    task: "Identify performance obligations in contracts"
    context_refs: [product_catalog, rev_rec_policies]
  - pattern: calculate_and_generate
    task: "Calculate SSP allocation and rev rec schedules"
    context_refs: [standalone_selling_prices]
  - pattern: calculate_and_generate
    task: "Generate invoices and revenue journal entries"
    context_refs: [customer_master]

actions:
  - type: send_email
    trigger: invoice_ready
    to: customer
    template: invoice
    attachment: invoice_pdf
  - type: erp_write
    target: netsuite
    object: [Invoice, JournalEntry]
    trigger: on_approval
```

### Sample Data
- 20 contracts with varying complexity
- Mix of subscription, services, and hybrid deals
- 3-5 contracts with variable consideration or milestones
- 12 months of rev rec history

---

## 8. Collections Agent

### Problem Statement
AR teams spend hours chasing overdue invoices manually. They send emails, make calls, update notes in spreadsheets, and escalate internally — all without a system to track touchpoints or automate follow-ups. Cash collection suffers, DSO increases, and customer relationships get strained by inconsistent communication.

### Target User
AR Manager, Collections Specialist

### Core Functionality

**AR Monitoring**
- Pull AR aging from ERP
- Segment customers by risk (amount overdue, days overdue, payment history)
- Prioritize collection efforts

**Automated Outreach**
- Send graduated reminder sequences (friendly → firm → final)
- Personalize based on customer relationship and amount
- Track email opens and responses

**Escalation & Logging**
- Escalate to account owner or sales rep via Slack
- Log all touchpoints (emails, calls, notes)
- Track promises to pay

**Cash Application Integration**
- When payment received, close out collection case
- Update customer payment history

### Pages & Views

1. **Collections Dashboard**
   - AR aging summary (current, 30, 60, 90+)
   - DSO trend
   - At-risk customers
   - Collection activity this week

2. **Customer Worklist**
   - Prioritized list of customers to contact
   - Last touchpoint and next action
   - One-click to send reminder or log call

3. **Customer Detail**
   - Open invoices
   - Communication history
   - Payment history and patterns
   - Notes and promises to pay

4. **Automation Settings**
   - Reminder sequence templates
   - Timing rules (send reminder at 7, 14, 30 days overdue)
   - Escalation rules

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    object: Invoice
    filter: "status = open"
    trigger: scheduled_daily
  - type: api_pull
    source: netsuite
    object: Payment
    trigger: on_create

context:
  - customer_master: [sync_from_erp]
  - payment_history: [by_customer]
  - reminder_templates: [day_7, day_14, day_30, day_45_final]
  - escalation_rules: {over_50k: "sales_vp", over_90_days: "cfo"}

decisions:
  - pattern: classify_and_route
    task: "Segment customers by collection priority"
    context_refs: [payment_history, customer_master]
  - pattern: validate_and_flag
    task: "Identify invoices needing escalation"
    context_refs: [escalation_rules]

actions:
  - type: send_email
    trigger: reminder_due
    to: customer_contact
    template: from_reminder_templates
  - type: slack_notify
    trigger: escalation_needed
    channel: collections
    message: "Escalation: {customer} has ${amount} over {days} days overdue"
```

### Sample Data
- 50 customers with open AR
- Mix of current and overdue (30% overdue)
- 10 customers with 60+ days overdue
- Sample reminder email sequences
- Communication history for demo

---

## 9. Cash Application

### Problem Statement
When payments arrive, matching them to invoices is tedious. Customers pay multiple invoices with one check, short-pay, overpay, or provide cryptic remittance info. AR teams spend hours researching and manually applying payments. Unapplied cash sits on the books, AR is overstated, and collection efforts target customers who've already paid.

### Target User
AR Manager, Cash Application Specialist

### Core Functionality

**Payment Ingestion**
- Pull bank deposits and payment details
- Ingest remittance data (email, EDI, lockbox files)
- Parse check images for remittance info

**Intelligent Matching**
- Match payments to invoices using invoice number, amount, customer
- AI-powered fuzzy matching for partial payments, combined payments
- Suggest matches with confidence scores

**Exception Handling**
- Queue unmatched payments for manual review
- Handle short-pays (apply partial, flag balance)
- Handle overpayments (apply to oldest invoices or create credit)

### Pages & Views

1. **Cash Application Dashboard**
   - Payments received today/this week
   - Match rate (auto vs. manual)
   - Unapplied cash balance

2. **Payment Queue**
   - Incoming payments with suggested matches
   - Confidence scores for each suggestion
   - One-click apply or manual selection

3. **Payment Detail**
   - Payment amount, date, source
   - Remittance info extracted
   - Matched invoices
   - Variance explanation (short-pay, discount taken)

4. **Exception Queue**
   - Payments that couldn't be matched
   - Research tools (customer lookup, invoice search)

5. **Settings**
   - Matching rules and thresholds
   - Auto-apply rules (confidence > 95%)
   - Variance handling (short-pay tolerance)

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: bank_feed
    object: Deposit
    trigger: scheduled_daily
  - type: document_ingest
    source: email_forward
    parser: remittance_extraction
  - type: file_upload
    format: [csv, bai2]
    parser: lockbox

context:
  - customer_master: [sync_from_erp]
  - open_invoices: [sync_from_erp]
  - matching_rules: {invoice_number_match: 100, amount_match: 80, customer_match: 60}
  - auto_apply_threshold: 95

decisions:
  - pattern: match_and_reconcile
    task: "Match incoming payments to open invoices"
    context_refs: [open_invoices, matching_rules, customer_master]
  - pattern: classify_and_route
    task: "Handle short-pays, overpayments, and exceptions"
    context_refs: [auto_apply_threshold]

actions:
  - type: erp_write
    target: netsuite
    object: CustomerPayment
    trigger: on_match_confirmed
  - type: slack_notify
    trigger: large_unapplied
    message: "Large unapplied payment: ${amount} from {customer}"
```

### Sample Data
- 30 incoming payments
- 100 open invoices
- 70% clean matches, 20% fuzzy matches, 10% exceptions
- Sample remittance data with varying quality

---

## 10. Contract Review & Revenue Impact

### Problem Statement
When sales sends over a new or amended contract, revenue accounting needs to quickly assess the rev rec implications. This requires reading dense legal documents, extracting commercial terms, and mapping to ASC 606 requirements. It's slow, requires specialized knowledge, and delays deal closure.

### Target User
Revenue Accountant, Deal Desk

### Core Functionality

**Contract Analysis**
- Ingest contracts (PDF, Word)
- Extract key terms: pricing, milestones, acceptance criteria, termination rights, variable consideration
- Identify non-standard terms that affect rev rec

**Revenue Impact Assessment**
- Flag terms with rev rec implications
- Provide guidance on treatment (e.g., "milestone payment requires constraint analysis")
- Estimate revenue timing impact

**Collaboration & Approval**
- Route flagged contracts to technical accounting
- Track review status and decisions
- Document conclusions for audit trail

### Pages & Views

1. **Contract Queue**
   - New contracts pending review
   - Contracts with flags/issues
   - Review status by deal

2. **Contract Analysis**
   - Extracted terms (side-by-side with source document)
   - Flags with explanations
   - Rev rec impact summary
   - Recommended treatment

3. **Review Workflow**
   - Assign to reviewer
   - Add comments and conclusions
   - Approve / request changes

4. **Settings**
   - Standard terms library
   - Flag rules (what triggers review)
   - Reviewer assignments

### Platform Config

```yaml
ingest:
  - type: document_ingest
    source: email_forward
    parser: contract_extraction
    fields: [pricing, payment_terms, milestones, acceptance, termination, warranties]
  - type: api_pull
    source: salesforce
    object: Opportunity
    trigger: on_contract_uploaded

context:
  - standard_terms: [library_of_acceptable_terms]
  - rev_rec_rules: [asc_606_guidance]
  - flag_triggers: [variable_consideration, extended_payment, acceptance_criteria]

decisions:
  - pattern: classify_and_route
    task: "Extract key terms from contracts"
    context_refs: [standard_terms]
  - pattern: validate_and_flag
    task: "Identify terms with rev rec implications"
    context_refs: [rev_rec_rules, flag_triggers]
  - pattern: calculate_and_generate
    task: "Assess revenue timing impact"
    context_refs: [rev_rec_rules]

actions:
  - type: create_task
    trigger: flags_identified
    assignee: technical_accounting
    task_type: review
  - type: slack_notify
    trigger: high_risk_contract
    channel: revenue_team
    message: "High-risk contract needs review: {deal_name}"
```

### Sample Data
- 10 sample contracts with varying complexity
- 3 with clean terms, 5 with minor flags, 2 with significant issues
- Sample flags: variable consideration, milestone payments, extended payment terms

---

## 11. Deferred Revenue Waterfall

### Problem Statement
SaaS companies need to track deferred revenue by contract, cohort, and period. They need accurate waterfall reporting for board decks, ARR/MRR calculations, and audit support. Most track this in unwieldy spreadsheets that break when contracts change or new deals close.

### Target User
Revenue Accountant, FP&A

### Core Functionality

**Deferred Revenue Tracking**
- Maintain deferred revenue balance by contract
- Track additions (new bookings), releases (recognition), adjustments
- Support modifications (upgrades, downgrades, cancellations)

**Waterfall Reporting**
- Beginning balance → additions → releases → adjustments → ending balance
- By contract, customer, cohort, or total
- Reconcile to GL

**ARR/MRR Metrics**
- Calculate ARR and MRR from active contracts
- Track new, expansion, contraction, churn
- Cohort analysis

### Pages & Views

1. **Deferred Revenue Dashboard**
   - Total deferred revenue balance
   - Waterfall chart (12-month trend)
   - By customer or product

2. **Contract Schedule**
   - Deferred balance by contract
   - Recognition schedule
   - Modifications and adjustments

3. **Waterfall Report**
   - Period-over-period roll-forward
   - Drill-down by category
   - GL reconciliation

4. **ARR/MRR Metrics**
   - Current ARR/MRR
   - Movement analysis (new, expansion, churn)
   - Cohort retention

5. **Settings**
   - Recognition rules by product
   - Reporting periods
   - GL account mappings

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [Invoice, RevenueRecognitionSchedule]
    trigger: scheduled_daily
  - type: api_pull
    source: salesforce
    objects: [Opportunity, Contract]
    trigger: on_change

context:
  - contract_master: [sync_from_crm]
  - recognition_rules: [by_product]
  - gl_mappings: {deferred_revenue: "2500", revenue: "4000"}

decisions:
  - pattern: calculate_and_generate
    task: "Calculate deferred revenue balances and movements"
    context_refs: [recognition_rules, contract_master]
  - pattern: match_and_reconcile
    task: "Reconcile deferred revenue schedule to GL"
    context_refs: [gl_mappings]

actions:
  - type: generate_document
    format: [xlsx, pdf]
    template: waterfall_report
  - type: slack_notify
    trigger: reconciliation_variance
    message: "Deferred revenue variance: schedule ${schedule_balance} vs GL ${gl_balance}"
```

### Sample Data
- 50 contracts with deferred revenue
- 12 months of historical data
- Sample modifications (upgrades, cancellations)
- ARR movements by month

---

# Procure-to-Pay (AP & Procurement)

---

## 12. Invoice Processing & Coding

### Problem Statement
AP teams drown in invoices arriving via email, mail, and portals. Each invoice requires manual data entry, GL coding, and approval routing. It takes days to process an invoice, vendors complain about slow payment, and the close is delayed waiting for AP accruals.

### Target User
AP Manager, AP Clerk

### Core Functionality

**Invoice Ingestion**
- Receive invoices via email forwarding, upload, or vendor portal
- Extract header and line-item data using AI
- Handle multiple formats (PDF, image, XML)

**GL Coding**
- Auto-suggest GL accounts based on vendor, description, history
- Apply coding rules (by vendor, by department, by project)
- Support split coding across multiple accounts

**Approval Routing**
- Route to approver based on amount, department, vendor
- Support multi-level approval for large invoices
- Track approval status and aging

### Pages & Views

1. **Invoice Inbox**
   - New invoices pending processing
   - Extraction status and confidence
   - Quick actions (approve coding, route to approver)

2. **Invoice Detail**
   - Extracted data with original document side-by-side
   - Edit/correct extracted fields
   - GL coding with suggestions
   - Approval history

3. **Approval Queue**
   - Invoices awaiting your approval
   - Context (vendor history, budget status)
   - Approve/reject with comments

4. **Posted Invoices**
   - Invoices posted to ERP
   - Payment status
   - Search and filter

5. **Settings**
   - GL coding rules
   - Approval matrix (by amount, department)
   - Vendor defaults
   - Email forwarding setup

### Platform Config

```yaml
ingest:
  - type: document_ingest
    source: email_forward
    address: invoices@{company}.lumera.app
    parser: invoice_extraction
    fields: [vendor, invoice_number, date, amount, line_items]
  - type: file_upload
    format: [pdf, png, jpg, xml]

context:
  - vendor_master: [sync_from_erp]
  - chart_of_accounts: [sync_from_erp]
  - coding_rules: {by_vendor: true, by_keyword: true}
  - coding_history: [last_10_by_vendor]
  - approval_matrix: {under_5k: "manager", under_25k: "director", over_25k: "vp_finance"}

decisions:
  - pattern: classify_and_route
    task: "Extract invoice data and code to GL accounts"
    context_refs: [vendor_master, chart_of_accounts, coding_rules, coding_history]
  - pattern: classify_and_route
    task: "Route to appropriate approver"
    context_refs: [approval_matrix]

actions:
  - type: create_task
    trigger: invoice_ready_for_approval
    assignee: from_approval_matrix
    task_type: approval
  - type: erp_write
    target: netsuite
    object: VendorBill
    trigger: on_approval
  - type: slack_notify
    trigger: approval_needed
    message: "Invoice needs approval: {vendor} ${amount}"
```

### Sample Data
- 30 invoices in various states (new, coded, pending approval, posted)
- 20 vendors with coding history
- Sample invoices in different formats (PDF, image)
- Approval workflow in progress

---

## 13. Procurement Compliance Agent

### Problem Statement
Companies have procurement policies (budget limits, approved vendors, required approvals) but no automated way to enforce them. Purchase orders get created that violate policy, and violations are only caught after the fact — if at all. This leads to budget overruns, rogue spending, and audit findings.

### Target User
Procurement Manager, Controller

### Core Functionality

**PO Validation**
- Intercept new POs before posting
- Check against policy rules (budget, approved vendors, coding)
- Flag violations with specific reason

**Exception Handling**
- Route violations for review/override
- Require justification for policy exceptions
- Track exception approvals

**Policy Management**
- Define and maintain procurement policies
- Support complex rules (by department, by category, by amount)
- Test policies before activation

### Pages & Views

1. **Compliance Dashboard**
   - POs reviewed today/this week
   - Violation rate by type
   - Pending exceptions

2. **PO Review Queue**
   - New POs requiring validation
   - Flags and violations
   - Approve/reject/escalate

3. **Violation Detail**
   - PO details
   - Specific policy violated
   - Request exception with justification
   - Approval history

4. **Policy Manager**
   - Define policy rules
   - Test against historical POs
   - Activate/deactivate policies

5. **Reporting**
   - Violations by department, vendor, category
   - Exception trends
   - Budget utilization

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    object: PurchaseOrder
    trigger: on_create
    fields: [vendor, amount, department, gl_account, requestor]

context:
  - approved_vendors: [by_category]
  - budget_by_department: [sync_from_erp]
  - approval_matrix: {under_5k: "manager", under_25k: "director", over_25k: "cfo"}
  - coding_rules: {required_fields: [department, project, gl_account]}
  - policy_rules: [list_of_active_policies]

decisions:
  - pattern: validate_and_flag
    task: "Check PO against procurement policies"
    context_refs: [approved_vendors, budget_by_department, approval_matrix, coding_rules]
  - pattern: classify_and_route
    task: "Route violations for exception handling"
    context_refs: [policy_rules]

actions:
  - type: create_task
    trigger: violation_detected
    assignee: policy_owner
    task_type: exception_review
  - type: slack_notify
    trigger: high_severity_violation
    channel: procurement
    message: "Policy violation: {violation_type} on PO {po_number}"
  - type: erp_write
    target: netsuite
    object: PurchaseOrder
    action: approve_or_reject
    trigger: on_review_complete
```

### Sample Data
- 20 POs (15 compliant, 5 with violations)
- Policy rules (budget limits, approved vendors, required coding)
- Exception requests with justifications
- Budget data by department

---

## 14. Vendor Onboarding & Risk

### Problem Statement
Onboarding new vendors is slow and risky. AP needs W-9s, banking info, and insurance certificates. Compliance needs to screen against sanctions lists. Without a system, documents get lost, vendors start work before being fully vetted, and 1099 reporting is a mess.

### Target User
AP Manager, Procurement

### Core Functionality

**Vendor Registration**
- Self-service portal for vendors to submit info
- Collect W-9/W-8, banking details, insurance certs
- Validate TIN against IRS database

**Risk Screening**
- Screen against OFAC sanctions list
- Check for adverse media
- Verify insurance coverage meets requirements

**Vendor Master Management**
- Create vendor record in ERP when approved
- Track document expiration (insurance renewals)
- Maintain vendor status (active, suspended, inactive)

### Pages & Views

1. **Onboarding Dashboard**
   - Vendors in progress
   - Pending document collection
   - Pending risk review

2. **Vendor Queue**
   - New vendor requests
   - Document status (collected, missing, invalid)
   - Risk screening status

3. **Vendor Detail**
   - Company info
   - Documents (W-9, insurance, banking)
   - Risk screening results
   - Approval history

4. **Vendor Portal** (external)
   - Vendor self-service submission
   - Document upload
   - Status tracking

5. **Settings**
   - Required documents by vendor type
   - Insurance minimums
   - Approval workflow

### Platform Config

```yaml
ingest:
  - type: form_submission
    source: vendor_portal
    fields: [company_name, tin, address, bank_account, contacts]
  - type: document_ingest
    source: vendor_portal
    documents: [w9, insurance_certificate, banking_info]

context:
  - required_documents: {domestic: [w9, insurance], international: [w8, insurance]}
  - insurance_minimums: {general_liability: 1000000, workers_comp: 500000}
  - sanctions_lists: [ofac, bis]

decisions:
  - pattern: validate_and_flag
    task: "Validate TIN and screen against sanctions lists"
    context_refs: [sanctions_lists]
  - pattern: validate_and_flag
    task: "Verify insurance meets requirements"
    context_refs: [insurance_minimums]
  - pattern: classify_and_route
    task: "Route for approval based on risk level"
    context_refs: [required_documents]

actions:
  - type: erp_write
    target: netsuite
    object: Vendor
    trigger: on_approval
  - type: send_email
    trigger: documents_missing
    to: vendor_contact
    template: document_request
  - type: slack_notify
    trigger: sanctions_hit
    channel: compliance
    message: "ALERT: Sanctions screening hit for {vendor_name}"
```

### Sample Data
- 10 vendors in various onboarding stages
- Sample W-9s and insurance certificates
- 1 vendor with sanctions screening flag
- 2 vendors with missing documents

---

## 15. Three-Way Match

### Problem Statement
Before paying a vendor invoice, AP should verify: (1) there's a valid PO, (2) goods/services were received, and (3) the invoice matches. Manual matching is tedious, and mismatches (wrong quantity, wrong price) slip through, leading to overpayments and vendor disputes.

### Target User
AP Manager

### Core Functionality

**Document Matching**
- Pull POs, receipts, and invoices
- Match by PO number, vendor, line items
- Flag mismatches (quantity, price, total)

**Tolerance Rules**
- Auto-approve within tolerance (e.g., <2% variance)
- Route exceptions for review
- Support partial matches (partial receipt)

**Resolution Workflow**
- Investigate mismatches
- Contact vendor or receiving department
- Approve with override or reject

### Pages & Views

1. **Match Dashboard**
   - Match rate (auto-matched, pending, exceptions)
   - Invoices by match status
   - Aging of unmatched invoices

2. **Match Queue**
   - Invoices with matches and discrepancies
   - Side-by-side comparison (PO vs. receipt vs. invoice)
   - Variance details

3. **Match Detail**
   - Line-by-line comparison
   - Variance explanations
   - Resolution actions (approve, reject, request credit)

4. **Settings**
   - Tolerance thresholds (%, $)
   - Auto-approve rules
   - Exception routing

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [PurchaseOrder, ItemReceipt, VendorBill]
    trigger: on_create

context:
  - matching_tolerance: {percent: 2, absolute: 100}
  - auto_approve_rules: {within_tolerance: true, po_required: true}

decisions:
  - pattern: match_and_reconcile
    task: "Match POs, receipts, and invoices"
    context_refs: [matching_tolerance]
  - pattern: validate_and_flag
    task: "Identify variances and route exceptions"
    context_refs: [auto_approve_rules]

actions:
  - type: erp_write
    target: netsuite
    object: VendorBill
    action: approve
    trigger: on_match_confirmed
  - type: create_task
    trigger: mismatch_detected
    assignee: ap_manager
    task_type: resolution
```

### Sample Data
- 20 POs
- 18 receipts (2 POs not yet received)
- 25 invoices
- Mix of clean matches, within-tolerance, and exceptions

---

## 16. Spend Analytics

### Problem Statement
CFOs and controllers lack visibility into spending patterns. Data is scattered across the ERP, expense systems, and corporate cards. Without aggregated analytics, they can't identify savings opportunities, catch anomalies, or hold departments accountable to budgets.

### Target User
CFO, FP&A, Controller

### Core Functionality

**Data Aggregation**
- Pull AP data from ERP
- Pull expense data from expense management system
- Pull corporate card transactions
- Normalize and categorize

**Analytics & Visualization**
- Spend by vendor, category, department, time period
- Budget vs. actual by category
- Trend analysis

**Anomaly Detection**
- Flag duplicate payments
- Identify unusual vendors or amounts
- Detect budget overruns

### Pages & Views

1. **Spend Dashboard**
   - Total spend by period
   - Top vendors, categories, departments
   - Budget vs. actual gauges

2. **Spend Explorer**
   - Interactive drill-down
   - Filter by time, vendor, category, department
   - Export to Excel

3. **Anomaly Alerts**
   - Potential duplicate payments
   - Unusual vendors or amounts
   - Budget overrun warnings

4. **Vendor Analysis**
   - Spend concentration
   - Payment terms analysis
   - Vendor performance

5. **Settings**
   - Category mappings
   - Anomaly thresholds
   - Alert preferences

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [VendorBill, VendorPayment]
    trigger: scheduled_daily
  - type: api_pull
    source: expensify
    objects: [Expense]
    trigger: scheduled_daily
  - type: api_pull
    source: corporate_card
    objects: [Transaction]
    trigger: scheduled_daily

context:
  - category_mappings: [vendor_to_category]
  - budget_by_category: [sync_from_erp]
  - anomaly_rules: {duplicate_threshold: 0.95, unusual_vendor_days: 365}

decisions:
  - pattern: classify_and_route
    task: "Categorize spend across sources"
    context_refs: [category_mappings]
  - pattern: validate_and_flag
    task: "Detect anomalies and budget overruns"
    context_refs: [anomaly_rules, budget_by_category]

actions:
  - type: slack_notify
    trigger: anomaly_detected
    channel: finance
    message: "Spend anomaly: {anomaly_type} - {details}"
  - type: send_email
    trigger: budget_overrun
    to: department_head
    template: budget_alert
```

### Sample Data
- 12 months of AP data (500 transactions)
- Expense data (200 expenses)
- Card transactions (100)
- 3-5 anomalies seeded (duplicates, unusual vendors)

---

# Treasury & Cash Management

---

## 17. Cash Flow Forecasting

### Problem Statement
Treasury teams build cash forecasts in spreadsheets, manually pulling AR aging, AP aging, payroll schedules, and debt service. The forecast is stale by the time it's finished, and it takes hours to update. Without accurate forecasting, companies risk liquidity crunches or hold excess cash.

### Target User
Treasury Manager, CFO

### Core Functionality

**Data Aggregation**
- Pull AR aging (expected cash inflows)
- Pull AP aging (expected cash outflows)
- Pull payroll schedules
- Pull debt service schedules
- Manual adjustments for known items

**Forecast Generation**
- Generate 13-week rolling cash forecast
- Support multiple scenarios (base, optimistic, pessimistic)
- Update daily with actuals

**Monitoring & Alerts**
- Track actual vs. forecast variance
- Alert when cash drops below threshold
- Monitor runway

### Pages & Views

1. **Cash Forecast Dashboard**
   - 13-week forecast chart
   - Current cash position
   - Runway calculation
   - Key inflows/outflows this week

2. **Forecast Detail**
   - Week-by-week breakdown
   - By category (AR, AP, payroll, debt, other)
   - Drill down to underlying items

3. **Scenario Comparison**
   - Base vs. optimistic vs. pessimistic
   - Sensitivity analysis
   - Key drivers

4. **Actuals Tracking**
   - Forecast vs. actual by week
   - Variance analysis
   - Forecast accuracy metrics

5. **Settings**
   - Cash accounts
   - Collection assumptions (DSO)
   - Payment assumptions (DPO)
   - Manual adjustments

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [Invoice, VendorBill]
    filter: "status = open"
    trigger: scheduled_daily
  - type: api_pull
    source: bank_feed
    objects: [Balance, Transaction]
    trigger: scheduled_daily
  - type: file_upload
    format: [xlsx]
    parser: payroll_schedule
  - type: file_upload
    format: [xlsx]
    parser: debt_schedule

context:
  - cash_accounts: [list_of_bank_accounts]
  - collection_assumptions: {current: 0.9, 30_day: 0.7, 60_day: 0.5}
  - payment_assumptions: {terms: "net_30"}
  - minimum_cash_threshold: 500000

decisions:
  - pattern: calculate_and_generate
    task: "Generate 13-week cash forecast"
    context_refs: [collection_assumptions, payment_assumptions, cash_accounts]
  - pattern: validate_and_flag
    task: "Alert when forecast drops below minimum"
    context_refs: [minimum_cash_threshold]

actions:
  - type: slack_notify
    trigger: low_cash_alert
    channel: treasury
    message: "Cash forecast below minimum in week {week}: ${forecast_balance}"
  - type: generate_document
    format: [xlsx, pdf]
    template: cash_forecast
```

### Sample Data
- AR aging (50 invoices)
- AP aging (40 bills)
- Payroll schedule (monthly)
- Debt service schedule
- 8 weeks of historical actuals

---

## 18. Bank Reconciliation

### Problem Statement
Every month, accountants manually reconcile bank statements to the GL. They download transactions, match to recorded entries, and investigate differences. It's tedious, and unreconciled items often roll forward month after month without resolution.

### Target User
Accounting Manager, Staff Accountant

### Core Functionality

**Bank Data Ingestion**
- Connect to bank feeds (Plaid, direct feeds)
- Import bank statements (CSV, OFX, BAI2)
- Normalize transaction data

**Automated Matching**
- Match bank transactions to GL entries
- Support fuzzy matching (date tolerance, amount tolerance)
- Handle one-to-many and many-to-one matches

**Reconciliation**
- Show matched and unmatched items
- Track reconciling items (outstanding checks, deposits in transit)
- Generate reconciliation report

### Pages & Views

1. **Reconciliation Dashboard**
   - Bank balance vs. GL balance
   - Reconciled vs. unreconciled
   - Aging of unreconciled items

2. **Matching Workspace**
   - Bank transactions (left) vs. GL entries (right)
   - Auto-matched pairs
   - Unmatched items with suggested matches
   - Manual match capability

3. **Reconciliation Report**
   - Bank balance
   - Add: deposits in transit
   - Less: outstanding checks
   - Adjusted bank balance = GL balance

4. **Settings**
   - Bank account connections
   - GL cash accounts
   - Matching tolerances

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: plaid
    objects: [Transaction, Balance]
    trigger: scheduled_daily
  - type: file_upload
    format: [csv, ofx, bai2]
    parser: bank_statement
  - type: api_pull
    source: netsuite
    objects: [Transaction]
    filter: "account.type = bank"
    trigger: scheduled_daily

context:
  - bank_accounts: [connected_accounts]
  - gl_cash_accounts: [mapped_gl_accounts]
  - matching_tolerance: {days: 3, amount: 0.01}

decisions:
  - pattern: match_and_reconcile
    task: "Match bank transactions to GL entries"
    context_refs: [matching_tolerance, gl_cash_accounts]

actions:
  - type: generate_document
    format: [xlsx, pdf]
    template: bank_reconciliation
  - type: slack_notify
    trigger: reconciliation_complete
    message: "Bank reconciliation complete for {account}: {status}"
```

### Sample Data
- 100 bank transactions
- 95 GL entries
- 85% auto-match, 10% fuzzy match, 5% unmatched
- Sample outstanding checks and deposits in transit

---

## 19. Intercompany Cash Management

### Problem Statement
Multi-entity companies move cash between entities through intercompany loans and settlements. Tracking these transactions, calculating interest, and ensuring both sides record consistently is challenging. Intercompany accounts are often out of balance, blocking consolidation.

### Target User
Treasury Manager, Controller

### Core Functionality

**Loan Tracking**
- Record intercompany loans (principal, rate, terms)
- Track outstanding balances
- Calculate accrued interest

**Settlement Processing**
- Record cash movements between entities
- Apply to outstanding loans
- Generate entries on both sides

**Reconciliation**
- Reconcile intercompany balances across entities
- Flag mismatches
- Generate elimination entries

### Pages & Views

1. **Intercompany Dashboard**
   - Net positions by entity pair
   - Outstanding loans
   - Pending settlements

2. **Loan Detail**
   - Principal, rate, maturity
   - Interest calculations
   - Payment history

3. **Settlement Queue**
   - Pending settlements
   - Create new settlement
   - Post to both entities

4. **Reconciliation**
   - Entity A balance vs. Entity B balance
   - Mismatches and timing differences
   - Elimination entries

5. **Settings**
   - Entity list
   - Intercompany accounts by entity pair
   - Interest rate policies

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [Transaction]
    filter: "account.is_intercompany = true"
    trigger: scheduled_daily
    per_entity: true

context:
  - entity_list: [parent, sub_a, sub_b]
  - intercompany_accounts: [by_entity_pair]
  - interest_rates: {default: 0.05}

decisions:
  - pattern: calculate_and_generate
    task: "Calculate intercompany interest accruals"
    context_refs: [interest_rates]
  - pattern: match_and_reconcile
    task: "Reconcile intercompany balances"
    context_refs: [intercompany_accounts, entity_list]

actions:
  - type: erp_write
    target: netsuite
    object: JournalEntry
    entities: [both_sides]
    trigger: on_settlement
```

### Sample Data
- 3 entities
- 5 intercompany loans
- Settlement history
- Sample mismatch scenario

---

# People & Payroll

---

## 20. Payroll Journal Entry Generator

### Problem Statement
After each payroll run, accountants manually create journal entries to record wages, taxes, benefits, and deductions. They map payroll register data to GL accounts, often using complex spreadsheets. Errors are common, and mid-period closes require manual accrual calculations.

### Target User
Controller, Payroll Manager

### Core Functionality

**Payroll Data Ingestion**
- Pull payroll register from HRIS/payroll system
- Parse earnings, taxes, deductions, employer costs
- Support multiple payroll frequencies

**GL Mapping**
- Map payroll elements to GL accounts
- Support departmental coding
- Handle multiple entities

**JE Generation**
- Generate JE from payroll run
- Support accruals for mid-period closes
- Handle corrections and adjustments

### Pages & Views

1. **Payroll Runs**
   - List of payroll runs with status
   - JE generated vs. pending
   - Post to ERP

2. **JE Preview**
   - Generated entry with full detail
   - Debit/credit by account
   - Department breakdown
   - Supporting calculations

3. **Accrual Calculator**
   - Days since last payroll
   - Accrual amount by account
   - Generate accrual JE

4. **Settings**
   - Payroll system connection
   - GL mapping rules
   - Department assignments
   - Accrual methodology

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: gusto  # or rippling, adp
    objects: [PayrollRun, Earnings, Taxes, Deductions]
    trigger: on_payroll_complete
  - type: file_upload
    format: [csv, xlsx]
    parser: payroll_register

context:
  - gl_mappings: {wages: "6000", payroll_taxes: "6100", benefits: "6200"}
  - department_mappings: [from_hris_or_upload]
  - entity_mappings: [for_multi_entity]
  - accrual_accounts: [wages_payable, taxes_payable]

decisions:
  - pattern: calculate_and_generate
    task: "Generate journal entry from payroll register"
    context_refs: [gl_mappings, department_mappings]
  - pattern: calculate_and_generate
    task: "Calculate payroll accrual for mid-period close"
    context_refs: [accrual_accounts]

actions:
  - type: erp_write
    target: netsuite
    object: JournalEntry
    trigger: on_approval
```

### Sample Data
- 3 payroll runs
- 50 employees across 5 departments
- Sample GL mappings
- Accrual scenario (mid-month close)

---

## 21. Stock-Based Comp Expense Allocator

### Problem Statement
Companies with equity compensation must calculate and record stock-based comp expense each period. This requires tracking grants, vesting schedules, and fair values, then allocating expense across departments based on where employees work. Most companies do this in error-prone spreadsheets.

### Target User
Controller, Equity Administrator

### Core Functionality

**Grant Tracking**
- Maintain grant data (employee, grant date, shares, fair value, vesting schedule)
- Import from equity management system
- Track modifications and forfeitures

**Expense Calculation**
- Calculate periodic expense by grant
- Apply vesting schedules (cliff, graded, performance)
- Handle forfeitures and modifications

**Department Allocation**
- Allocate expense based on employee department
- Handle department changes mid-period
- Generate JE with full breakdown

### Pages & Views

1. **Grant Dashboard**
   - Active grants summary
   - Unvested shares
   - Expense forecast

2. **Grant Detail**
   - Grant terms and vesting schedule
   - Expense history by period
   - Remaining expense

3. **Period Expense**
   - Current period expense calculation
   - By employee and department
   - Supporting detail

4. **Journal Entry**
   - Generated expense entry
   - Department-level debits
   - Credit to APIC
   - Post to ERP

5. **Settings**
   - Fair value assumptions
   - Forfeiture rate
   - GL accounts
   - Department mappings

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: carta  # or shareworks, equity_edge
    objects: [Grant, Vesting, Employee]
    trigger: scheduled_monthly
  - type: file_upload
    format: [csv, xlsx]
    parser: grant_data

context:
  - gl_mappings: {expense: "6500", apic: "3100"}
  - department_mappings: [from_hris]
  - forfeiture_rate: 0.05
  - fair_value_method: "black_scholes"

decisions:
  - pattern: calculate_and_generate
    task: "Calculate stock-based comp expense by grant"
    context_refs: [forfeiture_rate]
  - pattern: calculate_and_generate
    task: "Allocate expense by department and generate JE"
    context_refs: [gl_mappings, department_mappings]

actions:
  - type: erp_write
    target: netsuite
    object: JournalEntry
    trigger: on_approval
```

### Sample Data
- 100 grants across 50 employees
- Mix of vesting schedules
- 12 months of expense history
- Sample forfeitures and modifications

---

## 22. Commission Calculator

### Problem Statement
Sales compensation is complex — quotas, tiers, accelerators, SPIFs, clawbacks. Finance teams spend days after each period calculating commissions in spreadsheets. Errors lead to unhappy reps, disputes, and delayed payments. Accruals are often wrong because commission expense is hard to predict.

### Target User
Sales Operations, Controller

### Core Functionality

**Comp Plan Management**
- Define commission plans (base rate, tiers, accelerators)
- Support multiple plans for different roles
- Handle plan changes mid-period

**Commission Calculation**
- Pull closed deals from CRM
- Apply comp plan rules
- Calculate commission by rep

**Statement & Accrual**
- Generate rep-level statements
- Calculate commission accruals
- Generate accounting entries

### Pages & Views

1. **Commission Dashboard**
   - Total commissions this period
   - By rep, by team
   - Attainment vs. quota

2. **Rep Detail**
   - Deals credited
   - Commission calculation breakdown
   - Statement preview

3. **Plan Manager**
   - Define and edit comp plans
   - Tier structures and accelerators
   - Rep assignments

4. **Accruals & JEs**
   - Commission accrual calculation
   - Expense by department
   - Generated JE

5. **Settings**
   - CRM connection
   - Plan definitions
   - GL mappings

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: salesforce
    objects: [Opportunity, User]
    filter: "stage = Closed Won"
    trigger: scheduled_daily

context:
  - comp_plans: [by_role]
  - rep_assignments: [rep_to_plan]
  - quota_data: [by_rep_by_period]
  - gl_mappings: {commission_expense: "6300", commission_payable: "2100"}

decisions:
  - pattern: calculate_and_generate
    task: "Calculate commissions by rep based on comp plan"
    context_refs: [comp_plans, quota_data, rep_assignments]
  - pattern: calculate_and_generate
    task: "Generate commission accrual and JE"
    context_refs: [gl_mappings]

actions:
  - type: generate_document
    format: pdf
    template: commission_statement
    per: rep
  - type: erp_write
    target: netsuite
    object: JournalEntry
    trigger: on_approval
```

### Sample Data
- 20 sales reps
- 50 closed deals this period
- 3 comp plans (AE, SDR, Manager)
- Tier and accelerator scenarios

---

# Tax & Compliance

---

## 23. Sales Tax Compliance

### Problem Statement
Companies selling across states must track nexus, calculate tax obligations, and file returns in each jurisdiction. Rules are complex and change frequently. Without automation, companies either over-collect (customer complaints) or under-collect (audit exposure).

### Target User
Tax Manager, Controller

### Core Functionality

**Nexus Monitoring**
- Track sales by state
- Monitor against nexus thresholds (economic nexus)
- Alert when approaching or exceeding threshold

**Tax Calculation**
- Calculate sales tax obligations by jurisdiction
- Apply correct rates and rules
- Handle exemptions

**Filing Preparation**
- Aggregate data for tax filings
- Generate filing-ready reports
- Track filing deadlines and status

### Pages & Views

1. **Nexus Dashboard**
   - States with nexus
   - States approaching threshold
   - Sales by state map

2. **Tax Obligations**
   - Current period tax by state
   - Breakdown by jurisdiction
   - Historical trend

3. **Filing Calendar**
   - Upcoming filing deadlines
   - Filing status (not started, in progress, filed)
   - Generate filing reports

4. **Settings**
   - Nexus thresholds by state
   - Product taxability
   - Exemption certificates

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [Invoice, SalesOrder]
    trigger: scheduled_daily

context:
  - nexus_thresholds: [by_state]  # e.g., CA: $500k, TX: $500k
  - tax_rates: [by_jurisdiction]
  - product_taxability: [by_product]
  - exemption_certificates: [by_customer]

decisions:
  - pattern: validate_and_flag
    task: "Monitor nexus status by state"
    context_refs: [nexus_thresholds]
  - pattern: calculate_and_generate
    task: "Calculate sales tax obligations"
    context_refs: [tax_rates, product_taxability, exemption_certificates]

actions:
  - type: slack_notify
    trigger: nexus_threshold_approaching
    message: "Approaching nexus threshold in {state}: ${sales} of ${threshold}"
  - type: generate_document
    format: [csv, xlsx]
    template: sales_tax_filing
```

### Sample Data
- Sales in 15 states
- 5 states with nexus, 3 approaching threshold
- Tax rates by jurisdiction
- Sample exemption certificates

---

## 24. 1099 / Withholding Tracker

### Problem Statement
At year-end, AP scrambles to identify vendors requiring 1099s, verify W-9s are on file, and generate filings. Throughout the year, no one tracks cumulative payments against the $600 threshold. Missing or incorrect 1099s lead to IRS penalties.

### Target User
Tax Manager, AP Manager

### Core Functionality

**Payment Tracking**
- Track payments to 1099-eligible vendors
- Cumulative totals against $600 threshold
- Flag vendors approaching/exceeding threshold

**W-9 Management**
- Track W-9 status by vendor
- Request missing W-9s
- Validate TIN format

**1099 Generation**
- Generate 1099 forms at year-end
- Support electronic filing
- Track delivery and corrections

### Pages & Views

1. **1099 Dashboard**
   - Vendors over threshold
   - Vendors approaching threshold
   - W-9 status summary

2. **Vendor Tracker**
   - YTD payments by vendor
   - 1099 eligibility status
   - W-9 on file (yes/no)

3. **W-9 Management**
   - Missing W-9 list
   - Send request to vendor
   - Upload received W-9

4. **1099 Generation**
   - Preview 1099s
   - Generate and file
   - Track corrections

5. **Settings**
   - 1099 threshold
   - Eligible payment types
   - Filing preferences

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [VendorPayment]
    trigger: scheduled_daily

context:
  - threshold_1099: 600
  - eligible_payment_types: [services, rent, royalties]
  - vendor_w9_status: [from_vendor_master]

decisions:
  - pattern: validate_and_flag
    task: "Identify vendors approaching 1099 threshold"
    context_refs: [threshold_1099, eligible_payment_types]
  - pattern: validate_and_flag
    task: "Flag vendors missing W-9"
    context_refs: [vendor_w9_status]

actions:
  - type: send_email
    trigger: w9_missing
    to: vendor_contact
    template: w9_request
  - type: generate_document
    format: pdf
    template: form_1099
    per: vendor
```

### Sample Data
- 100 vendors
- 30 over threshold, 10 approaching
- 20 missing W-9s
- Sample W-9 documents

---

## 25. Transfer Pricing Documentation

### Problem Statement
Multinational companies must document intercompany transactions and demonstrate arm's-length pricing. This requires aggregating transaction data, applying pricing policies, and generating contemporaneous documentation. Without automation, companies risk transfer pricing adjustments and penalties.

### Target User
Tax Manager, Transfer Pricing Analyst

### Core Functionality

**Transaction Aggregation**
- Pull intercompany transactions across entities
- Categorize by transaction type (services, IP, goods, financing)
- Aggregate by entity pair and category

**Policy Application**
- Apply transfer pricing policies
- Calculate arm's-length ranges
- Flag outliers

**Documentation Generation**
- Generate local file documentation
- Support country-specific requirements
- Maintain audit trail

### Pages & Views

1. **Transfer Pricing Dashboard**
   - Intercompany transactions by type
   - Entity pairs with significant activity
   - Policy compliance status

2. **Transaction Analysis**
   - Transactions by category
   - Pricing applied vs. policy
   - Outliers flagged

3. **Documentation**
   - Local file generator
   - Country-specific templates
   - Download and archive

4. **Settings**
   - Pricing policies by transaction type
   - Arm's-length ranges
   - Documentation requirements by country

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [Transaction]
    filter: "is_intercompany = true"
    trigger: scheduled_monthly
    per_entity: true

context:
  - pricing_policies: {management_services: "cost_plus_5", ip_royalty: "3_percent_revenue"}
  - arms_length_ranges: {cost_plus: [3, 8], royalty: [2, 5]}
  - documentation_requirements: [by_country]

decisions:
  - pattern: classify_and_route
    task: "Categorize intercompany transactions"
    context_refs: [pricing_policies]
  - pattern: validate_and_flag
    task: "Check pricing against arm's-length ranges"
    context_refs: [arms_length_ranges]
  - pattern: calculate_and_generate
    task: "Generate transfer pricing documentation"
    context_refs: [documentation_requirements]

actions:
  - type: generate_document
    format: [docx, pdf]
    template: local_file
    per: entity
  - type: slack_notify
    trigger: outlier_detected
    message: "Transfer pricing outlier: {transaction_type} between {entity_a} and {entity_b}"
```

### Sample Data
- 3 entities in different countries
- 50 intercompany transactions
- 3 transaction types
- Sample pricing policies

---

# FP&A & Strategic Finance

---

## 26. Budget vs. Actual Reporting

### Problem Statement
Every month, FP&A pulls actuals, compares to budget, and builds variance reports for department heads. It's a manual, time-consuming process that delays accountability conversations. By the time reports are distributed, the month is old news.

### Target User
FP&A Analyst, Department Heads

### Core Functionality

**Data Aggregation**
- Pull actuals from ERP
- Pull budget from budgeting system or upload
- Align account structures

**Variance Calculation**
- Calculate $ and % variances
- Favorable/unfavorable classification
- YTD and period views

**Report Distribution**
- Generate department-level reports
- Auto-distribute to department heads
- Track who's viewed their report

### Pages & Views

1. **BvA Dashboard**
   - Company-level summary
   - Department performance cards
   - Key variances highlighted

2. **Department Report**
   - P&L with budget, actual, variance columns
   - Drill-down to account detail
   - Commentary capture

3. **Report Builder**
   - Select departments and accounts
   - Choose comparison period
   - Generate and distribute

4. **Settings**
   - Budget upload / connection
   - Report templates
   - Distribution lists

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [TrialBalance]
    trigger: scheduled_daily
  - type: file_upload
    format: [xlsx]
    parser: budget
  - type: api_pull
    source: adaptive  # or anaplan
    objects: [Budget]
    trigger: scheduled_monthly

context:
  - chart_of_accounts: [sync_from_erp]
  - budget_data: [by_account_by_period]
  - department_list: [from_erp]
  - materiality_threshold: {percent: 5, absolute: 10000}

decisions:
  - pattern: calculate_and_generate
    task: "Calculate budget vs. actual variances"
    context_refs: [budget_data, chart_of_accounts]
  - pattern: validate_and_flag
    task: "Identify material variances"
    context_refs: [materiality_threshold]

actions:
  - type: generate_document
    format: [pdf, xlsx]
    template: bva_report
    per: department
  - type: send_email
    trigger: report_ready
    to: department_head
    attachment: bva_report
```

### Sample Data
- 12 months of actuals and budget
- 10 departments
- 50 accounts
- Material variances to highlight

---

## 27. Board Reporting Package

### Problem Statement
Finance teams spend days assembling board decks — pulling data from multiple sources, formatting slides, writing narratives. The process is manual and error-prone. Last-minute changes require heroic efforts, and institutional knowledge about "how we present to the board" lives in people's heads.

### Target User
CFO, FP&A Director

### Core Functionality

**KPI Aggregation**
- Pull financial and operational KPIs
- Support custom metric definitions
- Historical trends

**Package Assembly**
- Standard sections (financial summary, KPIs, cash, headcount)
- Templated slides with live data
- AI-assisted narrative generation

**Collaboration & Approval**
- Multi-person editing
- CFO approval workflow
- Version control

### Pages & Views

1. **Package Dashboard**
   - Current package status
   - Sections complete / in progress
   - Deadline countdown

2. **Section Editor**
   - Edit individual sections
   - Live data refresh
   - Narrative drafting with AI assist

3. **Preview & Export**
   - Full deck preview
   - Export to PowerPoint
   - PDF version

4. **Historical Packages**
   - Past board packages
   - Compare periods
   - Reuse content

5. **Settings**
   - Package template
   - KPI definitions
   - Approval workflow

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: netsuite
    objects: [TrialBalance, Budget]
    trigger: on_demand
  - type: api_pull
    source: salesforce
    objects: [Opportunity, Pipeline]
    trigger: on_demand
  - type: api_pull
    source: hris
    objects: [Headcount]
    trigger: on_demand

context:
  - kpi_definitions: [arr, mrr, burn, runway, headcount, nps]
  - package_template: [standard_sections]
  - prior_packages: [for_comparison]

decisions:
  - pattern: calculate_and_generate
    task: "Calculate KPIs and financial summaries"
    context_refs: [kpi_definitions]
  - pattern: calculate_and_generate
    task: "Generate narrative summaries for each section"
    context_refs: [prior_packages]

actions:
  - type: generate_document
    format: [pptx, pdf]
    template: board_package
  - type: create_task
    trigger: package_ready
    assignee: cfo
    task_type: approval
```

### Sample Data
- 6 months of KPI history
- Financial summary data
- Sample narratives
- Prior board package for reference

---

## 28. Scenario Modeling Agent

### Problem Statement
FP&A needs to model "what if" scenarios — what if we hire 10 more engineers? What if churn increases 2%? What if we raise prices? Building scenarios in spreadsheets is slow and error-prone. Each scenario requires manual formula adjustments.

### Target User
FP&A, CFO

### Core Functionality

**Base Model**
- Financial model with key drivers
- P&L, cash flow projections
- Support for uploaded models or built-in

**Scenario Definition**
- Define scenarios by adjusting assumptions
- Support multiple simultaneous changes
- Name and save scenarios

**Comparison & Analysis**
- Side-by-side scenario comparison
- Sensitivity analysis
- Key metric impact

### Pages & Views

1. **Model Dashboard**
   - Base case projections
   - Active scenarios
   - Key metrics summary

2. **Scenario Builder**
   - Adjust assumptions (sliders, inputs)
   - See impact in real-time
   - Save scenario

3. **Comparison View**
   - Side-by-side scenarios
   - Delta analysis
   - Charts and visualizations

4. **Sensitivity Analysis**
   - Select variable to test
   - Range of values
   - Impact on key metrics

5. **Settings**
   - Model upload / connection
   - Assumption definitions
   - Scenario templates

### Platform Config

```yaml
ingest:
  - type: file_upload
    format: [xlsx]
    parser: financial_model
  - type: api_pull
    source: adaptive
    objects: [Model, Assumptions]
    trigger: on_demand

context:
  - base_assumptions: [growth_rate, churn, pricing, headcount]
  - key_metrics: [revenue, burn, runway, profit_margin]
  - model_structure: [from_upload]

decisions:
  - pattern: calculate_and_generate
    task: "Run scenario with adjusted assumptions"
    context_refs: [base_assumptions, model_structure]
  - pattern: calculate_and_generate
    task: "Compare scenarios and generate insights"
    context_refs: [key_metrics]

actions:
  - type: generate_document
    format: [xlsx, pdf]
    template: scenario_comparison
```

### Sample Data
- Base financial model (3-year projection)
- 3 pre-built scenarios (optimistic, pessimistic, hiring plan)
- Key assumptions to adjust

---

## 29. Headcount Planning

### Problem Statement
Headcount is often the largest expense, yet planning is disconnected from finance. HR tracks open roles in a spreadsheet, finance estimates costs in another, and the two rarely reconcile. This leads to surprise expenses, inaccurate forecasts, and heated debates about hiring capacity.

### Target User
FP&A, HR Finance Partner

### Core Functionality

**Headcount Tracking**
- Sync with HRIS for current employees
- Track open roles and hiring pipeline
- Planned vs. actual headcount

**Cost Modeling**
- Model fully-loaded cost by role
- Include salary, benefits, taxes, equity
- Support by department, level, location

**P&L Integration**
- Feed headcount costs into P&L forecast
- Track hiring against budget
- Variance analysis

### Pages & Views

1. **Headcount Dashboard**
   - Current headcount by department
   - Open roles and pipeline
   - Budget vs. actual

2. **Role Detail**
   - Filled and open positions
   - Cost per role
   - Start dates and ramp

3. **Planning Workspace**
   - Add/remove planned hires
   - Adjust timing and compensation
   - See P&L impact

4. **Budget Comparison**
   - Planned vs. budgeted headcount
   - Cost variance by department
   - Monthly trend

5. **Settings**
   - HRIS connection
   - Cost assumptions (benefits %, taxes)
   - Department mappings

### Platform Config

```yaml
ingest:
  - type: api_pull
    source: rippling  # or workday, bamboo
    objects: [Employee, OpenRequisition]
    trigger: scheduled_daily
  - type: file_upload
    format: [xlsx]
    parser: headcount_plan

context:
  - cost_assumptions: {benefits_rate: 0.25, payroll_tax_rate: 0.08}
  - level_salary_bands: [by_role_by_level_by_location]
  - department_list: [from_hris]
  - budget_by_department: [from_finance]

decisions:
  - pattern: calculate_and_generate
    task: "Calculate fully-loaded cost by role"
    context_refs: [cost_assumptions, level_salary_bands]
  - pattern: calculate_and_generate
    task: "Project headcount costs for P&L forecast"
    context_refs: [department_list]
  - pattern: validate_and_flag
    task: "Identify departments over/under budget"
    context_refs: [budget_by_department]

actions:
  - type: generate_document
    format: [xlsx]
    template: headcount_plan
  - type: slack_notify
    trigger: over_budget
    message: "{department} headcount ${amount} over budget"
```

### Sample Data
- 100 current employees
- 20 open roles
- Hiring plan with start dates
- Budget by department
- Cost assumptions

---

# Appendix: Prompt Template

Use this template when prompting the Coding Agent to build any template:

```
Build a Lumera template for [TEMPLATE NAME].

## Problem
[Copy problem statement from above]

## Target User
[Copy target user]

## Core Features
[Copy core functionality bullets]

## Pages Needed
[List the pages with brief descriptions]

## Data Model
Collections needed:
- [Collection 1]: [fields]
- [Collection 2]: [fields]

## Integrations
- Ingest from: [sources]
- Write to: [targets]
- Notify via: [channels]

## Sample Data
Generate realistic sample data including:
[Copy sample data requirements]

## Platform Config
Use these decision patterns:
[Copy relevant patterns]

Start by creating the collection schemas, then build the pages, then wire up the automations.
```
