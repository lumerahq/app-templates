import { createFileRoute } from '@tanstack/react-router';
import { useContext } from 'react';
import { MessageSquare, LayoutGrid, Bot, Workflow } from 'lucide-react';
import { AuthContext } from '../lib/auth';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const auth = useContext(AuthContext);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome{auth?.user?.name ? `, ${auth.user.name}` : ''}</h1>
        <p className="text-muted-foreground mt-2 text-[0.95rem] leading-relaxed">Your app is ready. Use Studio to start building.</p>
      </div>

      {/* Getting Started */}
      <div className="rounded-xl bg-card p-6 shadow-[0_1px_3px_0_oklch(0_0_0/0.04),0_1px_2px_-1px_oklch(0_0_0/0.04)] border border-border/60 hover:shadow-[0_4px_12px_-2px_oklch(0_0_0/0.06)] transition-shadow duration-300">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-3 ring-1 ring-primary/10">
            <MessageSquare className="size-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="font-semibold text-lg tracking-tight">Build with Studio</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Switch to the <strong>Chat</strong> tab and tell the agent what you want to build.
              It will set up your data, write the logic, and build your UI — all from a conversation.
            </p>
          </div>
        </div>
      </div>

      {/* Example prompts */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Try asking the agent</h2>
        <div className="flex flex-wrap gap-2">
          {[
            'Build an invoice processing app with approval workflows',
            'Track vendor payments and flag overdue invoices',
            'Create a month-end close checklist with task assignments',
            'Set up an AP inbox that triages emails with AI',
            'Build an expense tracker with categories and a dashboard',
          ].map((prompt) => (
            <span
              key={prompt}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm bg-card border border-border/60 text-muted-foreground shadow-[0_1px_2px_0_oklch(0_0_0/0.03)] hover:border-primary/30 hover:text-foreground transition-all duration-200 cursor-default"
            >
              {prompt}
            </span>
          ))}
        </div>
      </div>

      {/* What you can build */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-5">What you can build</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="group rounded-xl bg-card p-5 space-y-3 shadow-[0_1px_2px_0_oklch(0_0_0/0.03)] border border-border/60 hover:shadow-[0_4px_12px_-2px_oklch(0_0_0/0.06)] hover:border-border transition-all duration-300">
            <LayoutGrid className="size-5 text-primary transition-colors duration-300" />
            <h3 className="font-medium text-sm tracking-tight">Internal apps</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Back-office tools for your team — dashboards, approval queues, and operational workflows.
            </p>
          </div>
          <div className="group rounded-xl bg-card p-5 space-y-3 shadow-[0_1px_2px_0_oklch(0_0_0/0.03)] border border-border/60 hover:shadow-[0_4px_12px_-2px_oklch(0_0_0/0.06)] hover:border-border transition-all duration-300">
            <Bot className="size-5 text-primary transition-colors duration-300" />
            <h3 className="font-medium text-sm tracking-tight">Agent-powered workflows</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI agents that extract data, run reviews, draft outputs, and route exceptions — humans stay in the loop.
            </p>
          </div>
          <div className="group rounded-xl bg-card p-5 space-y-3 shadow-[0_1px_2px_0_oklch(0_0_0/0.03)] border border-border/60 hover:shadow-[0_4px_12px_-2px_oklch(0_0_0/0.06)] hover:border-border transition-all duration-300">
            <Workflow className="size-5 text-primary transition-colors duration-300" />
            <h3 className="font-medium text-sm tracking-tight">Automations</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect to your systems, process inbound emails, and trigger actions automatically — with a full audit trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
