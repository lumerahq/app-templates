import { createFileRoute } from '@tanstack/react-router';
import { ArrowDown, Bot, CheckCircle, Eye, Mail, Users } from 'lucide-react';

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">How it Works</h1>
        <p className="text-muted-foreground mt-1">
          See how the Collections Agent helps you get paid faster
        </p>
      </div>

      {/* Flow Steps */}
      <div className="space-y-2">
        <Step
          icon={<Users className="size-5" />}
          color="blue"
          title="1. Import Your AR Data"
          description="Add customers and their open invoices via the Settings page or by running the seed script. Each customer tracks their total outstanding balance, oldest due date, and collection status."
        />

        <Arrow />

        <Step
          icon={<Eye className="size-5" />}
          color="amber"
          title="2. Review Your Dashboard"
          description="The dashboard shows your AR aging at a glance — total outstanding, aging buckets (current, 1-30, 31-60, 61-90, 90+ days), and a priority list of customers sorted by amount owed."
        />

        <Arrow />

        <Step
          icon={<Bot className="size-5" />}
          color="purple"
          title="3. Draft Collection Emails with AI"
          description="Click 'Draft Collection Email' on any customer. The AI reviews their open invoices, the amounts and how overdue they are, and writes a personalized, tone-appropriate collection email — friendly for recent, firm for long overdue."
        />

        <Arrow />

        <Step
          icon={<Mail className="size-5" />}
          color="orange"
          title="4. Review and Send"
          description="Drafted emails appear in the customer's activity log. Review the AI-generated email, make any edits, and send it through your email system. Log calls, notes, and promises to pay to keep a complete history."
        />

        <Arrow />

        <Step
          icon={<CheckCircle className="size-5" />}
          color="green"
          title="5. Track and Resolve"
          description="Update customer status as you work through collections — from Active to Contacted, Promised, Escalated, or Resolved. The dashboard updates in real-time to show your progress."
        />
      </div>

      {/* Status Lifecycle */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Customer Statuses</h2>
        <p className="text-sm text-muted-foreground">Track each customer through the collection lifecycle:</p>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <StatusChip label="Active" color="bg-slate-100 text-slate-700" />
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Contacted" color="bg-blue-100 text-blue-700" />
          <span className="text-muted-foreground">then</span>
          <div className="flex items-center gap-2">
            <StatusChip label="Promised" color="bg-amber-100 text-amber-700" />
            <span className="text-muted-foreground">or</span>
            <StatusChip label="Escalated" color="bg-red-100 text-red-700" />
          </div>
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Resolved" color="bg-green-100 text-green-700" />
        </div>
        <div className="space-y-2 text-sm text-muted-foreground mt-2">
          <p><strong className="text-foreground">Active</strong> — Customer has outstanding AR, not yet contacted</p>
          <p><strong className="text-foreground">Contacted</strong> — Collection email sent or call made</p>
          <p><strong className="text-foreground">Promised</strong> — Customer has committed to a payment date</p>
          <p><strong className="text-foreground">Escalated</strong> — Needs management attention or further action</p>
          <p><strong className="text-foreground">Resolved</strong> — Payment received or issue resolved</p>
        </div>
      </div>

      {/* Sample Data */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Getting Started</h2>
        <p className="text-sm text-muted-foreground">
          Run the seed script to populate demo data with sample customers and invoices:
        </p>
        <code className="block text-sm bg-muted rounded-lg p-3">
          lumera run scripts/seed-demo.py
        </code>
        <p className="text-sm text-muted-foreground">
          This creates 12 customers with varying AR balances, 40+ invoices across aging buckets, and a few sample collection activities.
        </p>
      </div>
    </div>
  );
}

function Step({ icon, color, title, description }: {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
}) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    green: 'bg-green-100 text-green-600',
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex gap-4">
        <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${bgMap[color]}`}>
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="size-5 text-muted-foreground/40" />
    </div>
  );
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{label}</span>;
}
