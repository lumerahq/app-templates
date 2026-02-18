#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Usage ────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $0 <name> [--title "Title"] [--description "Description"] [--category "Category"]

Creates a new Lumera app template by copying the default template.

Arguments:
  name          Template name (lowercase, hyphens). e.g. "expense-tracker"

Options:
  --title       Human-readable title (default: derived from name)
  --description One-line description (default: placeholder)
  --category    Template category (default: "General")
  -h, --help    Show this help message

Examples:
  $0 expense-tracker
  $0 expense-tracker --title "Expense Tracker" --description "Track and approve employee expenses." --category "Finance"
EOF
  exit 0
}

# ── Helpers ──────────────────────────────────────────────────────────────────
to_title_case() {
  echo "$1" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2))}1'
}

# ── Parse arguments ─────────────────────────────────────────────────────────
if [ $# -eq 0 ]; then
  usage
fi

NAME=""
TITLE=""
DESCRIPTION=""
CATEGORY="General"

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage ;;
    --title) TITLE="$2"; shift 2 ;;
    --description) DESCRIPTION="$2"; shift 2 ;;
    --category) CATEGORY="$2"; shift 2 ;;
    -*) echo "Unknown option: $1" >&2; exit 1 ;;
    *) NAME="$1"; shift ;;
  esac
done

if [ -z "$NAME" ]; then
  echo "Error: template name is required." >&2
  exit 1
fi

# Validate name format (lowercase, hyphens, numbers only)
if ! echo "$NAME" | grep -qE '^[a-z][a-z0-9-]*$'; then
  echo "Error: template name must be lowercase, start with a letter, and use only letters, numbers, and hyphens." >&2
  exit 1
fi

# Defaults
TITLE="${TITLE:-$(to_title_case "$NAME")}"
DESCRIPTION="${DESCRIPTION:-A Lumera app template.}"

TEMPLATE_DIR="$REPO_ROOT/$NAME"

if [ -d "$TEMPLATE_DIR" ]; then
  echo "Error: directory '$NAME' already exists." >&2
  exit 1
fi

# ── Copy default template ───────────────────────────────────────────────────
echo "Creating template '$NAME' from default..."
cp -R "$REPO_ROOT/default" "$TEMPLATE_DIR"

# Remove files that shouldn't carry over
rm -rf "$TEMPLATE_DIR/node_modules" \
       "$TEMPLATE_DIR/dist" \
       "$TEMPLATE_DIR/.lumera" \
       "$TEMPLATE_DIR/.tanstack" \
       "$TEMPLATE_DIR/__pycache__" \
       "$TEMPLATE_DIR/.venv" \
       "$TEMPLATE_DIR/pnpm-lock.yaml" \
       "$TEMPLATE_DIR/src/routeTree.gen.ts"

# Remove default-specific docs (AGENTS.md, ARCHITECTURE.md/html kept as scaffolds)
rm -f "$TEMPLATE_DIR/README.md"

# ── Replace default template name with new template name ───────────────────
echo "Updating template name..."
find "$TEMPLATE_DIR" -type f | while read -r file; do
  # Skip binary files
  if grep -qI '' "$file" 2>/dev/null; then
    sed -i '' "s/default-app/$NAME/g" "$file"
    sed -i '' "s/Default App/$TITLE/g" "$file"
  fi
done

# ── Write template.json ─────────────────────────────────────────────────────
cat > "$TEMPLATE_DIR/template.json" <<EOF
{
  "name": "$NAME",
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "category": "$CATEGORY",
  "version": "1.0.0"
}
EOF

# ── Update registry.json ────────────────────────────────────────────────────
REGISTRY="$REPO_ROOT/registry.json"

python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
data['templates'].append({
    'name': sys.argv[2],
    'title': sys.argv[3],
    'description': sys.argv[4],
    'category': sys.argv[5],
    'version': '1.0.0'
})
with open(sys.argv[1], 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
" "$REGISTRY" "$NAME" "$TITLE" "$DESCRIPTION" "$CATEGORY"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "Template '$NAME' created successfully!"
echo ""
echo "  Directory:  $NAME/"
echo "  Title:      $TITLE"
echo "  Category:   $CATEGORY"
echo ""
echo "Next steps:"
echo "  1. cd $NAME"
echo "  2. Edit platform/collections/ to define your collections"
echo "  3. Edit src/routes/ to build your pages"
echo "  4. Edit scripts/seed-demo.py to add seed data"
echo "  5. pnpm install && lumera login && lumera dev"
echo ""
