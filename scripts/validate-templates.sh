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

  # template.json: valid JSON with required fields, name matches directory
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

  # Must be listed in registry.json
  if ! echo "$REGISTRY_NAMES" | grep -qx "$name"; then
    error "not listed in registry.json"
  fi

  # package.json: exists and has a real name
  if [ -f "$dir/package.json" ]; then
    PKG_NAME=$(python3 -c "import json; print(json.load(open('$dir/package.json'))['name'])" 2>/dev/null || echo "")
    if [ -z "$PKG_NAME" ]; then
      error "package.json missing name field"
    fi
  else
    error "missing package.json"
  fi

  # AGENTS.md must exist
  if [ ! -f "$dir/AGENTS.md" ]; then
    error "missing AGENTS.md"
  fi

  # CLAUDE.md should be a symlink to AGENTS.md
  if [ -f "$dir/CLAUDE.md" ]; then
    if [ -L "$dir/CLAUDE.md" ]; then
      target=$(readlink "$dir/CLAUDE.md")
      if [ "$target" != "AGENTS.md" ]; then
        error "CLAUDE.md symlink points to '$target' instead of AGENTS.md"
      fi
    else
      error "CLAUDE.md should be a symlink to AGENTS.md, not a separate file"
    fi
  else
    error "missing CLAUDE.md (should be symlink to AGENTS.md)"
  fi

  # architecture.md must exist
  if [ ! -f "$dir/architecture.md" ]; then
    error "missing architecture.md"
  fi

  # No git-tracked build artifacts
  for artifact in node_modules dist .lumera .venv __pycache__; do
    if git ls-files --error-unmatch "$dir/$artifact" >/dev/null 2>&1; then
      error "git-tracked build artifact: $artifact/"
    fi
  done

  # No stale ARCHITECTURE.html
  if [ -f "$dir/ARCHITECTURE.html" ]; then
    error "stale ARCHITECTURE.html — should have been removed"
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

# ── Check for collection name collisions across templates ─────────────────
echo ""
echo "[cross-template collection names]"
PREV_ERRORS=$ERRORS

COLLISION_RESULT=$(python3 -c "
import json, os, sys

repo_root = sys.argv[1]
collections = {}

for entry in os.listdir(repo_root):
    coll_dir = os.path.join(repo_root, entry, 'platform', 'collections')
    if not os.path.isdir(coll_dir):
        continue
    for f in os.listdir(coll_dir):
        if not f.endswith('.json'):
            continue
        try:
            with open(os.path.join(coll_dir, f)) as fh:
                data = json.load(fh)
            name = data.get('name', '')
            if name:
                collections.setdefault(name, []).append(entry)
        except Exception:
            pass

collisions = {k: v for k, v in collections.items() if len(v) > 1}
if collisions:
    for name, templates in sorted(collisions.items()):
        tpl = ','.join(templates)
        print(f'collision:{name}:{tpl}')
else:
    print('ok')
" "$REPO_ROOT" 2>&1)

if [ "$COLLISION_RESULT" = "ok" ]; then
  echo "  ok"
else
  echo "$COLLISION_RESULT" | while IFS= read -r line; do
    case "$line" in
      collision:*)
        coll_name="${line#collision:}"
        name="${coll_name%%:*}"
        templates="${coll_name#*:}"
        error "collection '$name' appears in multiple templates: $templates"
        ;;
    esac
  done
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
if [ $ERRORS -gt 0 ]; then
  echo "Validation failed with $ERRORS error(s)."
  exit 1
else
  echo "All templates valid."
fi
