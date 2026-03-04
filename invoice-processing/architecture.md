# Architecture

> **This is a starter template.** Update this file as you build — it should always reflect the current state of the project so any agent or developer can understand the system from this file alone.

## Overview

Upload invoices (PDF/images), AI extracts vendor/amounts/line items/GL codes, review and approve. Full audit trail.

## Collections

| Collection | Purpose |
|------------|---------|
| `ip_invoices` | Invoice header — vendor, total, status, dates |
| `ip_line_items` | Extracted line items with GL codes |
| `ip_activity` | Comments and status change audit trail |

## Automations

| Automation | Purpose |
|------------|---------|
| `ip_extract` | AI reads uploaded document → structured invoice data |

## Design Decisions

_None yet — document key decisions here as you make them._
