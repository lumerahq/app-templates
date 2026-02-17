# Architecture Diagrams

Generate visual architecture diagrams for Lumera projects. Creates an ARCHITECTURE.html file with a polished, professional visual diagram.

---

## When to Generate

Generate an architecture diagram when the user:
- Explicitly asks for an architecture diagram
- Says "create architecture", "show me the architecture", or similar
- Asks to document the project structure

## Capturing and Reviewing the Diagram

After writing the HTML, capture a screenshot to verify it looks correct:

```bash
# Open the HTML file in agent-browser and take a full-page screenshot
agent-browser open file:///workspace/{project}/ARCHITECTURE.html
agent-browser screenshot --full /workspace/{project}/ARCHITECTURE.png
```

Then read the PNG to visually verify:
```
read /workspace/{project}/ARCHITECTURE.png
```

This lets you see exactly what the user sees and iterate on the layout.

## Iterating on Diagrams

When improving an existing diagram:

1. **Read the current screenshot**: `read /workspace/{project}/ARCHITECTURE.png`
2. **Identify issues visually**: Overlapping nodes, poor spacing, missing connections
3. **Read the HTML source**: `read /workspace/{project}/ARCHITECTURE.html`
4. **Make targeted edits**: Use the `edit` tool for small changes, or `write` for larger rewrites
5. **Re-capture and verify**: Run `agent-browser screenshot --full` again
6. **Preserve user customizations**: Don't remove nodes or descriptions unless asked

Common improvements:
- Adjust node positions for better layout
- Add missing connections
- Improve descriptions
- Fix overlapping elements
- Enhance animations or styling

## File Location

Always write to: `/workspace/{project}/ARCHITECTURE.html`

## Tech Stack

The HTML uses CDN-loaded libraries for a polished look:
- **Tailwind CSS** - utility-first styling
- **Motion** - smooth animations via ES module import. Refer to the Motion docs for advanced animations: https://motion.dev/docs/quick-start
- **Lucide Icons** - beautiful SVG icons

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Architecture</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <!-- Motion loaded as ES module in body script -->
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
          },
        },
      },
    };
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    /* Custom styles that complement Tailwind */
    .node {
      position: absolute;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      opacity: 0; /* Motion animates this on load */
    }
    .node:hover {
      transform: translateY(-4px) scale(1.02);
      z-index: 10;
    }

    /* Animated connection paths */
    .connection {
      stroke-dasharray: 8 4;
      animation: flow 1s linear infinite;
    }
    @keyframes flow {
      to { stroke-dashoffset: -12; }
    }

    /* Gradient backgrounds for node types */
    .node-collection {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border: 1px solid #3b82f6;
    }
    .node-automation {
      background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
      border: 1px solid #8b5cf6;
    }
    .node-hook {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 1px solid #f59e0b;
    }
    .node-external {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      border: 1px solid #64748b;
    }
    .node-user {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 1px solid #10b981;
    }
    .node-app {
      background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
      border: 1px solid #ec4899;
    }
  </style>
</head>
<body class="bg-slate-50 font-sans text-slate-800 antialiased">
  <!-- Header -->
  <header class="border-b border-slate-200 bg-white px-6 py-4">
    <h1 class="text-xl font-semibold text-slate-900">Project Architecture</h1>
    <p class="text-sm text-slate-500 mt-1">System overview and data flow</p>
  </header>

  <!-- Diagram Container -->
  <div id="diagram" class="relative min-h-[600px] p-8 overflow-auto">
    <!-- SVG layer for connections (behind nodes) -->
    <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 0;">
      <defs>
        <!-- Arrow marker -->
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/>
        </marker>
        <!-- Gradient for connections -->
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.3"/>
          <stop offset="50%" stop-color="#94a3b8" stop-opacity="1"/>
          <stop offset="100%" stop-color="#94a3b8" stop-opacity="0.3"/>
        </linearGradient>
      </defs>

      <!-- Connections: Use bezier curves for smooth paths -->
      <!-- Example: <path class="connection" d="M 150 100 C 250 100, 250 200, 350 200" stroke="#94a3b8" stroke-width="2" fill="none" marker-end="url(#arrow)"/> -->
    </svg>

    <!-- Nodes layer -->
    <div class="relative" style="z-index: 1;">
      <!--
        Node template:
        <div class="node node-collection rounded-xl px-4 py-3 shadow-lg shadow-blue-500/10" style="left: 100px; top: 50px;">
          <div class="flex items-center gap-2">
            <i data-lucide="database" class="w-4 h-4 text-blue-600"></i>
            <span class="font-medium text-slate-700">collection_name</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">Brief description</p>
        </div>
      -->
    </div>
  </div>

  <!-- Legend -->
  <div class="border-t border-slate-200 bg-white px-6 py-4">
    <div class="flex flex-wrap gap-6 text-sm">
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded node-collection"></div>
        <span class="text-slate-600">Collections</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded node-automation"></div>
        <span class="text-slate-600">Automations</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded node-hook"></div>
        <span class="text-slate-600">Hooks</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded node-external"></div>
        <span class="text-slate-600">External Services</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded node-user"></div>
        <span class="text-slate-600">Users</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded node-app"></div>
        <span class="text-slate-600">Applications</span>
      </div>
    </div>
  </div>

  <!-- Details Section (collapsible) -->
  <details class="border-t border-slate-200">
    <summary class="bg-white px-6 py-4 cursor-pointer hover:bg-slate-50 font-medium text-slate-700">
      View Details
    </summary>
    <div id="details" class="bg-white px-6 py-6 space-y-8">
      <section data-section="overview">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Overview</h2>
        <p class="text-slate-600 leading-relaxed">Brief description of the project.</p>
      </section>

      <section data-section="data-model">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Data Model</h2>
        <p class="text-slate-600 leading-relaxed">Collections and relationships.</p>
      </section>

      <section data-section="event-flow">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Event Flow</h2>
        <p class="text-slate-600 leading-relaxed">Hooks and triggers.</p>
      </section>

      <section data-section="automations">
        <h2 class="text-lg font-semibold text-slate-900 mb-3">Automations</h2>
        <p class="text-slate-600 leading-relaxed">Background jobs.</p>
      </section>
    </div>
  </details>

  <script type="module">
    import { animate, stagger } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm";

    // Initialize Lucide icons
    lucide.createIcons();

    // Animate nodes on load with stagger
    const nodes = document.querySelectorAll('.node');
    animate(nodes,
      { opacity: [0, 1], y: [20, 0] },
      { delay: stagger(0.1), duration: 0.5, easing: 'ease-out' }
    );

    // Click to highlight node
    nodes.forEach(node => {
      node.addEventListener('click', () => {
        nodes.forEach(n => n.classList.remove('ring-2', 'ring-blue-400'));
        node.classList.add('ring-2', 'ring-blue-400');
      });
    });
  </script>
</body>
</html>
```

## Node Types and Icons

| Type | CSS Class | Icon (Lucide) | Shadow Color |
|------|-----------|---------------|--------------|
| Collection | `node-collection` | `database` | `shadow-blue-500/10` |
| Automation | `node-automation` | `clock` or `cog` | `shadow-violet-500/10` |
| Hook | `node-hook` | `zap` | `shadow-amber-500/10` |
| External Service | `node-external` | `cloud` or `globe` | `shadow-slate-500/10` |
| User | `node-user` | `user` or `users` | `shadow-emerald-500/10` |
| Application | `node-app` | `layout` or `monitor` | `shadow-pink-500/10` |

## Connection Guidelines

Use SVG bezier curves for smooth, professional connections:

```html
<!-- Horizontal flow (left to right) -->
<path class="connection"
  d="M 180 75 C 250 75, 250 150, 320 150"
  stroke="#94a3b8" stroke-width="2" fill="none" marker-end="url(#arrow)"/>

<!-- Vertical flow (top to bottom) -->
<path class="connection"
  d="M 150 100 C 150 150, 150 150, 150 200"
  stroke="#94a3b8" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
```

The `C` command creates a cubic bezier: `C x1 y1, x2 y2, endX endY`
- Start from the previous point (after M)
- x1,y1 = first control point
- x2,y2 = second control point
- endX,endY = end point

## Layout Guidelines

1. **Grid-based positioning**: Use consistent spacing (e.g., 180px horizontal, 120px vertical)
2. **Flow direction**: Generally left-to-right or top-to-bottom
3. **Grouping**: Keep related nodes close together
4. **Hierarchy**: Users/inputs on left, data in middle, outputs/externals on right
5. **Spacing**: Minimum 60px between nodes

## Example Node

```html
<div class="node node-collection rounded-xl px-4 py-3 shadow-lg shadow-blue-500/10"
     style="left: 320px; top: 140px;">
  <div class="flex items-center gap-2">
    <i data-lucide="database" class="w-4 h-4 text-blue-600"></i>
    <span class="font-medium text-slate-700">crm_contacts</span>
  </div>
  <p class="text-xs text-slate-500 mt-1">Customer contact records</p>
</div>
```

Nodes automatically animate in with stagger using Motion.

## Gathering Project Data

Before generating, check what exists:

1. **Collections**: Read `platform/collections/*.json` or list files
2. **Automations**: Read `platform/automations/*.py`
3. **Hooks**: Read `platform/hooks/*.js`

## Best Practices

1. Keep diagrams focused - show main flows, not every detail
2. Use descriptive labels on nodes
3. Add brief descriptions under node names
4. Ensure connections don't overlap nodes
5. Test the diagram renders correctly before finishing
6. Use the staggered animation for visual polish
