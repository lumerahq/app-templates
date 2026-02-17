#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_URL="${LUMERA_BASE_URL:-https://app.lumerahq.com}"
SKILLS_API="$BASE_URL/api/public/skills"

# ── Usage ────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $0 [--dry-run]

Fetches the latest Lumera skills from the platform API and updates
all templates in this repo.

For each template with a .claude/skills/ directory, this script:
  1. Downloads all skill markdown files from the API
  2. Removes skills that no longer exist on the server
  3. Updates the CLAUDE.md skill descriptions (between markers)

Options:
  --dry-run   Show what would change without writing files
  -h, --help  Show this help message

Environment:
  LUMERA_BASE_URL  Override the API base (default: https://app.lumerahq.com)
EOF
  exit 0
}

DRY_RUN=false
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── Fetch skill list from API ────────────────────────────────────────────────
echo "Fetching skills from $SKILLS_API..."

SKILLS_JSON=$(curl -sf "$SKILLS_API") || {
  echo "Error: failed to fetch skills list from $SKILLS_API" >&2
  exit 1
}

SLUGS=$(echo "$SKILLS_JSON" | python3 -c "
import json, sys
skills = json.load(sys.stdin)
for s in skills:
    print(s['slug'])
")

SKILL_COUNT=$(echo "$SLUGS" | wc -l | tr -d ' ')
echo "Found $SKILL_COUNT skills."
echo ""

# ── Find template directories ───────────────────────────────────────────────
TEMPLATE_DIRS=""
for dir in "$REPO_ROOT"/*/; do
  dirname="$(basename "$dir")"
  case "$dirname" in
    scripts|docs|.git|.github|node_modules) continue ;;
  esac
  if [ -f "$dir/template.json" ]; then
    TEMPLATE_DIRS="$TEMPLATE_DIRS $dirname"
  fi
done

# ── Download skills and update each template ────────────────────────────────
# First, download all skills to a temp directory
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

echo "Downloading skill files..."
for slug in $SLUGS; do
  filename=$(echo "lumera-${slug#lumera-}" | sed 's/-/_/g').md
  if curl -sf "$SKILLS_API/$slug.md" -o "$TMPDIR/$filename"; then
    echo "  $filename"
  else
    echo "  WARN: failed to download $slug" >&2
  fi
done
echo ""

# ── Update each template ────────────────────────────────────────────────────
for name in $TEMPLATE_DIRS; do
  dir="$REPO_ROOT/$name"
  skills_dir="$dir/.claude/skills"
  echo "[$name]"

  if [ "$DRY_RUN" = true ]; then
    echo "  (dry run) would update $skills_dir/"
  else
    mkdir -p "$skills_dir"
    # Remove old skills and copy fresh ones
    rm -f "$skills_dir"/lumera_*.md
    cp "$TMPDIR"/*.md "$skills_dir/"
    echo "  Updated $skills_dir/ with $SKILL_COUNT skills"
  fi

  # Update CLAUDE.md skill descriptions
  CLAUDE_MD="$dir/CLAUDE.md"
  if [ -f "$CLAUDE_MD" ]; then
    if grep -q "LUMERA_SKILLS_START" "$CLAUDE_MD"; then
      if [ "$DRY_RUN" = true ]; then
        echo "  (dry run) would update CLAUDE.md skill descriptions"
      else
        # Generate skill descriptions from downloaded files
        SKILL_BLOCK=$(python3 -c "
import os, sys

skills_dir = sys.argv[1]
entries = []
for f in sorted(os.listdir(skills_dir)):
    if not f.endswith('.md'):
        continue
    with open(os.path.join(skills_dir, f)) as fh:
        content = fh.read()
    parts = content.split('\n---\n')
    header = parts[0]
    lines = header.split('\n')
    title = ''
    summary_lines = []
    in_summary = False
    for line in lines:
        trimmed = line.strip()
        if trimmed.startswith('# '):
            title = trimmed[2:].strip()
            in_summary = True
            continue
        if not in_summary or (len(summary_lines) == 0 and trimmed == ''):
            continue
        if trimmed == '' and len(summary_lines) > 0:
            break
        summary_lines.append(trimmed)
    slug = f.replace('.md', '').replace('_', '-')
    summary = ' '.join(summary_lines)
    entries.append(f'**{slug}** — {summary}')

print('\n\n'.join(entries))
" "$skills_dir")

        # Replace content between markers
        python3 -c "
import sys

claude_md_path = sys.argv[1]
skill_block = sys.argv[2]

with open(claude_md_path) as f:
    content = f.read()

start_marker = '<!-- LUMERA_SKILLS_START -->'
end_marker = '<!-- LUMERA_SKILLS_END -->'

start_idx = content.index(start_marker) + len(start_marker)
end_idx = content.index(end_marker)

updated = content[:start_idx] + '\n' + skill_block + '\n' + content[end_idx:]

with open(claude_md_path, 'w') as f:
    f.write(updated)
" "$CLAUDE_MD" "$SKILL_BLOCK"
        echo "  Updated CLAUDE.md skill descriptions"
      fi
    fi
  fi
done

echo ""
echo "Done."
