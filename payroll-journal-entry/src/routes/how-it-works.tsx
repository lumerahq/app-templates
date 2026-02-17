import { createFileRoute } from '@tanstack/react-router';
import { ArrowDown, Bot, CheckCircle, Eye, FileUp, Zap } from 'lucide-react';

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">How it Works</h1>
        <p className="text-muted-foreground mt-1">
          See how a payroll report becomes a posted journal entry
        </p>
      </div>

      {/* Flow Steps */}
      <div className="space-y-2">
        <Step
          icon={<FileUp className="size-5" />}
          color="blue"
          title="1. Upload Your Payroll Report"
          description="Click 'New Payroll Run' and upload a CSV, PDF, or image of your payroll register. Sample files are included in the samples/ folder."
        />

        <Arrow />

        <Step
          icon={<Zap className="size-5" />}
          color="amber"
          title="2. Automatic Processing Begins"
          description="As soon as your document is uploaded, the system automatically kicks off data extraction. You'll see a 'Processing' indicator while this happens."
        />

        <Arrow />

        <Step
          icon={<Bot className="size-5" />}
          color="purple"
          title="3. AI Generates Journal Entries"
          description="AI reads your payroll report and creates debit/credit journal entry lines mapped to the appropriate GL accounts — wages, taxes, benefits, and their corresponding payables."
        />

        <Arrow />

        <Step
          icon={<Eye className="size-5" />}
          color="orange"
          title="4. Review the Journal Entry"
          description="Once extraction is complete, review the generated debit and credit lines. Verify totals balance and accounts are mapped correctly."
        />

        <Arrow />

        <Step
          icon={<CheckCircle className="size-5" />}
          color="green"
          title="5. Post or Reject"
          description="When you're satisfied the journal entry is correct, click 'Post' to finalize it. If something isn't right, click 'Reject'. The dashboard updates instantly."
        />
      </div>

      {/* Status Lifecycle */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Payroll Run Statuses</h2>
        <p className="text-sm text-muted-foreground">Every payroll run moves through these stages:</p>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <StatusChip label="Draft" color="bg-slate-100 text-slate-700" />
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Processing" color="bg-blue-100 text-blue-700" />
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Review" color="bg-amber-100 text-amber-700" />
          <span className="text-muted-foreground">then</span>
          <div className="flex items-center gap-2">
            <StatusChip label="Posted" color="bg-green-100 text-green-700" />
            <span className="text-muted-foreground">or</span>
            <StatusChip label="Rejected" color="bg-red-100 text-red-700" />
          </div>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground mt-2">
          <p><strong className="text-foreground">Draft</strong> — Payroll report just uploaded, waiting for AI processing</p>
          <p><strong className="text-foreground">Processing</strong> — AI is reading the report and generating journal entries</p>
          <p><strong className="text-foreground">Review</strong> — Journal entries are ready for you to review</p>
          <p><strong className="text-foreground">Posted</strong> — Journal entry has been verified and posted</p>
          <p><strong className="text-foreground">Rejected</strong> — Payroll run was rejected (incorrect data or duplicate)</p>
        </div>
      </div>

      {/* What gets generated */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Journal Entry Structure</h2>
        <p className="text-sm text-muted-foreground">A typical payroll journal entry has these debit and credit lines:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold text-sm text-green-700">Debits (Expenses)</h3>
            <div className="space-y-1">
              <InfoItem label="Wages Expense" description="Gross pay for employees" />
              <InfoItem label="Payroll Tax Expense" description="Employer FICA, FUTA, SUTA" />
              <InfoItem label="Benefits Expense" description="Employer-paid health, 401k match" />
            </div>
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold text-sm text-blue-700">Credits (Payables)</h3>
            <div className="space-y-1">
              <InfoItem label="Wages Payable" description="Net pay owed to employees" />
              <InfoItem label="Tax Withholdings Payable" description="Employee taxes to remit" />
              <InfoItem label="Benefits Payable" description="Deductions to remit to providers" />
            </div>
          </div>
        </div>
      </div>

      {/* Sample Files */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Sample Files</h2>
        <p className="text-sm text-muted-foreground">
          Two sample payroll CSV files are included in the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">samples/</code> folder.
          Upload one to see the full extraction and journal entry generation flow in action.
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

function InfoItem({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
