import { createFileRoute } from '@tanstack/react-router';
import { ArrowDown, Bot, CalendarClock, DollarSign, Mail, Shield, TrendingUp, Upload, Users } from 'lucide-react';

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">How it Works</h1>
        <p className="text-muted-foreground mt-1">
          See how the Collections Agent helps you manage overdue accounts
        </p>
      </div>

      {/* Flow Steps */}
      <div className="space-y-2">
        <Step
          icon={<Upload className="size-5" />}
          color="blue"
          title="1. Import Your AR Data"
          description="Add your customers and their outstanding invoices. Enter them manually or import from your accounting system."
        />

        <Arrow />

        <Step
          icon={<Users className="size-5" />}
          color="purple"
          title="2. Review Your Customers"
          description="Browse your customer list, see their outstanding balances, and view detailed invoice breakdowns. Filter by status to focus on what matters."
        />

        <Arrow />

        <Step
          icon={<Bot className="size-5" />}
          color="amber"
          title="3. AI Risk Assessment"
          description="Click 'Assess Risk' on any customer to have AI analyze their payment history, overdue amounts, and patterns. You'll get a risk score (0-100), risk level, and recommended next action."
        />

        <Arrow />

        <Step
          icon={<Mail className="size-5" />}
          color="orange"
          title="4. Draft Collection Emails"
          description="Click 'Draft Email' to generate a personalized collection email. The AI uses your reminder templates to match the right tone based on how overdue the invoices are."
        />

        <Arrow />

        <Step
          icon={<DollarSign className="size-5" />}
          color="green"
          title="5. Record Payments"
          description="When payments come in, record them against customer invoices. Payments are applied oldest-first by default. Customer totals and statuses update automatically."
        />

        <Arrow />

        <Step
          icon={<TrendingUp className="size-5" />}
          color="blue"
          title="6. Filter & Prioritize"
          description="The Customers page lets you filter by status, risk level, and sort by outstanding amount or risk score. Take action directly from the list."
        />

        <Arrow />

        <Step
          icon={<CalendarClock className="size-5" />}
          color="purple"
          title="7. Track Follow-ups"
          description="Each risk assessment sets a follow-up date based on urgency. High risk = 1 day, Medium = 3 days, Low = 7 days. The dashboard shows how many are due."
        />

        <Arrow />

        <Step
          icon={<Shield className="size-5" />}
          color="green"
          title="8. Audit Trail"
          description="Every change to customers and invoices is automatically logged. View the full history in the Audit Log — who changed what, when, and the before/after values."
        />
      </div>

      {/* Customer Status Lifecycle */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Customer Statuses</h2>
        <p className="text-sm text-muted-foreground">Customers move through these stages as you work their accounts:</p>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <StatusChip label="Active" color="bg-blue-100 text-blue-700" />
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Contacted" color="bg-amber-100 text-amber-700" />
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Promised" color="bg-purple-100 text-purple-700" />
          <span className="text-muted-foreground">or</span>
          <StatusChip label="Escalated" color="bg-red-100 text-red-700" />
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Resolved" color="bg-green-100 text-green-700" />
        </div>
        <div className="space-y-2 text-sm text-muted-foreground mt-2">
          <p><strong className="text-foreground">Active</strong> — New or uncontacted customer with outstanding invoices</p>
          <p><strong className="text-foreground">Contacted</strong> — A collection email or call has been made</p>
          <p><strong className="text-foreground">Promised</strong> — Customer has committed to a payment date</p>
          <p><strong className="text-foreground">Escalated</strong> — Account has been escalated for urgent action</p>
          <p><strong className="text-foreground">Resolved</strong> — All invoices paid or written off</p>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Manage these in the Settings page:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-1">
            <h3 className="font-semibold text-sm">Reminder Templates</h3>
            <p className="text-xs text-muted-foreground">Email templates for different overdue stages (friendly, firm, urgent, final). Each triggers at a specific days-overdue threshold.</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <h3 className="font-semibold text-sm">Escalation Rules</h3>
            <p className="text-xs text-muted-foreground">Define when to flag, escalate, or send final notices based on days overdue and outstanding amounts.</p>
          </div>
        </div>
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
