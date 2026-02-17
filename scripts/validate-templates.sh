#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGISTRY="$REPO_ROOT/registry.json"
ERRORS=0

error() {
  echo "  ERROR: $1" >&2
  ERRORS=$((ERRORS + 1))
}

echo "Validating templates..."
echo ""

# ── Check registry.json is valid JSON ────────────────────────────────────────
if ! python3 -c "import json; json.load(open('$REGISTRY'))" 2>/dev/null; then
  error "registry.json is not valid JSON"
  exit 1
fi

# ── Get template names from registry ─────────────────────────────────────────
REGISTRY_NAMES=$(python3 -c "
import json
with open('$REGISTRY') as f:
    data = json.load(f)
for t in data['templates']:
    print(t['name'])
")

# ── Find template directories (dirs with template.json) ─────────────────────
TEMPLATE_DIRS=""
for dir in "$REPO_ROOT"/*/; do
  dirname="$(basename "$dir")"
  # Skip non-template directories
  case "$dirname" in
    scripts|docs|.git|.github|node_modules) continue ;;
  esac
  if [ -f "$dir/template.json" ]; then
    TEMPLATE_DIRS="$TEMPLATE_DIRS $dirname"
  fi
done

# ── Validate each template directory ─────────────────────────────────────────
for name in $TEMPLATE_DIRS; do
  dir="$REPO_ROOT/$name"
  PREV_ERRORS=$ERRORS
  echo "[$name]"

  # Check template.json is valid and has required fields
  VALID=$(python3 -c "
import json, sys
try:
    with open('$dir/template.json') as f:
        t = json.load(f)
    required = ['name', 'title', 'description', 'category', 'version']
    missing = [k for k in required if k not in t]
    if missing:
        print('missing_fields:' + ','.join(missing))
    elif t['name'] != '$name':
        print('name_mismatch:' + t['name'])
    else:
        print('ok')
except Exception as e:
    print('invalid_json:' + str(e))
" 2>&1)

  case "$VALID" in
    ok) ;;
    missing_fields:*) error "template.json missing fields: ${VALID#missing_fields:}" ;;
    name_mismatch:*) error "template.json name '${VALID#name_mismatch:}' does not match directory '$name'" ;;
    invalid_json:*) error "template.json is not valid JSON: ${VALID#invalid_json:}" ;;
  esac

  # Check registry.json has a matching entry
  if ! echo "$REGISTRY_NAMES" | grep -qx "$name"; then
    error "not listed in registry.json"
  fi

  # Check package.json uses default substitution value
  if [ -f "$dir/package.json" ]; then
    PKG_NAME=$(python3 -c "import json; print(json.load(open('$dir/package.json'))['name'])" 2>/dev/null || echo "")
    if [ "$PKG_NAME" != "my-lumera-app" ]; then
      error "package.json name is '$PKG_NAME', expected 'my-lumera-app'"
    fi
  else
    error "missing package.json"
  fi

  # Check no git-tracked build artifacts
  for artifact in node_modules dist .lumera .venv __pycache__; do
    if git ls-files --error-unmatch "$dir/$artifact" >/dev/null 2>&1; then
      error "git-tracked build artifact: $artifact/"
    fi
  done

  # Check skills are present
  skills_dir="$dir/.claude/skills"
  if [ ! -d "$skills_dir" ] || [ -z "$(ls "$skills_dir"/lumera_*.md 2>/dev/null)" ]; then
    error "missing .claude/skills/ (run ./scripts/sync-skills.sh)"
  fi

  # Check CLAUDE.md has skill markers
  if [ -f "$dir/CLAUDE.md" ]; then
    if ! grep -q "LUMERA_SKILLS_START" "$dir/CLAUDE.md"; then
      error "CLAUDE.md missing skill markers (<!-- LUMERA_SKILLS_START/END -->)"
    fi
  fi

  if [ $ERRORS -eq $PREV_ERRORS ]; then
    echo "  ok"
  fi
done

# ── Check registry entries all have directories ──────────────────────────────
echo ""
echo "[registry.json]"
PREV_ERRORS=$ERRORS
for name in $REGISTRY_NAMES; do
  if [ ! -d "$REPO_ROOT/$name" ]; then
    error "registry lists '$name' but directory does not exist"
  fi
done
if [ $ERRORS -eq $PREV_ERRORS ]; then
  echo "  ok"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
if [ $ERRORS -gt 0 ]; then
  echo "Validation failed with $ERRORS error(s)."
  exit 1
else
  echo "All templates valid."
fi
