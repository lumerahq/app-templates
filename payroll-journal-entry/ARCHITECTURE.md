# Architecture

> **This is a starter template.** Update this file as you build — it should always reflect the current state of the project so any agent or developer can understand the system from this file alone.

## Overview

Upload payroll reports (PDF/CSV), AI generates debit/credit journal entry lines with account codes and departments, review for balance and post.

## Collections

| Collection | Purpose |
|------------|---------|
| `pje_journal_entries` | Journal entry header — period, status, totals |
| `pje_journal_lines` | Individual debit/credit lines with accounts |

## Automations

| Automation | Purpose |
|------------|---------|
| `pje_extract` | AI reads payroll report → journal entry lines |

## Design Decisions

_None yet — document key decisions here as you make them._
