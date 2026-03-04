# Architecture

> **This is a starter template.** Update this file as you build — it should always reflect the current state of the project so any agent or developer can understand the system from this file alone.

## Overview

AR collections management app. Monitor overdue accounts, AI risk assessment, automated collection emails, payment recording (oldest-first), audit log.

## Collections

| Collection | Purpose |
|------------|---------|
| `ca_customers` | Customer master data with outstanding balances |
| `ca_invoices` | Individual invoices linked to customers |
| `ca_payments` | Payment records, auto-applied oldest-first |
| `ca_audit_log` | Immutable log of all collection actions |

## Automations

| Automation | Purpose |
|------------|---------|
| `ca_assess_risk` | Analyzes invoices + payment history → risk score, level, recommended action |
| `ca_draft_email` | Picks tone based on overdue days, personalizes with invoice details |

## Design Decisions

_None yet — document key decisions here as you make them._
