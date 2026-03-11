import { createFileRoute } from '@tanstack/react-router';
import { useContext } from 'react';
import { MessageSquare, Layers, Zap, Webhook } from 'lucide-react';
import { AuthContext } from '../main';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const auth = useContext(AuthContext);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Welcome{auth?.user?.name ? `, ${auth.user.name}` : ''}</h1>
        <p className="text-muted-foreground mt-1">Your app is ready. Use Studio to start building.</p>
      </div>

      {/* Getting Started */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <MessageSquare className="size-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="font-semibold text-lg">Build with Studio</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Switch to the <strong>Chat</strong> tab and tell the agent what you want to build.
              It will create collections, write backend logic, and build your UI — all from a conversation.
            </p>
            <p className="text-muted-foreground text-sm">
              Try something like: <em>"Build an expense tracker with categories and a dashboard"</em>
            </p>
          </div>
        </div>
      </div>

      {/* Building blocks overview */}
      <div>
        <h2 className="font-semibold mb-4">What you can build</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 space-y-2">
            <Layers className="size-5 text-muted-foreground" />
            <h3 className="font-medium text-sm">Collections</h3>
            <p className="text-xs text-muted-foreground">
              Structured data tables — your app's foundation. Define schemas in JSON, deploy with one command.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5 space-y-2">
            <Zap className="size-5 text-muted-foreground" />
            <h3 className="font-medium text-sm">Automations &amp; Hooks</h3>
            <p className="text-xs text-muted-foreground">
              Python scripts for background work. JavaScript hooks for real-time data validation and triggers.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5 space-y-2">
            <Webhook className="size-5 text-muted-foreground" />
            <h3 className="font-medium text-sm">Integrations</h3>
            <p className="text-xs text-muted-foreground">
              Connect to Slack, Google, Xero, and more. Receive webhooks, process inbound email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
