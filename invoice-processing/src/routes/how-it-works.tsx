import { createFileRoute } from '@tanstack/react-router';
import { Bot, CheckCircle, Eye, Send, Upload } from 'lucide-react';

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorksPage,
});

const STATUS_COLORS: Record<string, string> = {
  received: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  coded: 'bg-indigo-100 text-indigo-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  posted: 'bg-emerald-100 text-emerald-800',
};

const WORKFLOW_STEPS = [
  {
    icon: Upload,
    title: '1. Document Upload',
    description:
      'Upload an invoice PDF or image. The AI uses document vision to extract all details — invoice number, vendor, amounts, dates — so you don\'t have to type anything.',
    color: 'bg-blue-500',
  },
  {
    icon: Bot,
    title: '2. AI GL Classification',
    description:
      'After review, the AI analyzes the invoice against your chart of accounts and vendor history. It assigns a GL code, department, and provides a confidence score.',
    color: 'bg-purple-500',
  },
  {
    icon: Eye,
    title: '3. Smart Routing',
    description:
      'High-confidence results (90% or above) are auto-coded and move directly to "coded" status. Lower confidence items are flagged for human review at "pending approval".',
    color: 'bg-orange-500',
  },
  {
    icon: CheckCircle,
    title: '4. Approval',
    description:
      'Authorized approvers review flagged invoices. They can approve the AI\'s suggestion, adjust the GL coding, or reject the invoice entirely.',
    color: 'bg-green-500',
  },
  {
    icon: Send,
    title: '5. Post to ERP',
    description:
      'Approved invoices are posted to your accounting system. Every action is recorded in the audit trail for compliance.',
    color: 'bg-emerald-500',
  },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function HowItWorksPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">How it Works</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered invoice processing from receipt to posting
        </p>
      </div>

      {/* Workflow steps — vertical timeline */}
      <div>
        {WORKFLOW_STEPS.map((step, i) => (
          <div key={step.title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`${step.color} text-white rounded-full p-2.5 shrink-0`}>
                <step.icon className="size-5" />
              </div>
              {i < WORKFLOW_STEPS.length - 1 && <div className="w-px flex-1 bg-border min-h-6" />}
            </div>
            <div className="pt-1 pb-8">
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Confidence threshold */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">AI Confidence Threshold</h2>
        <p className="text-sm text-muted-foreground">
          The AI provides a confidence score (0–100%) for each GL code assignment. This determines how the invoice is routed:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">90% or above</p>
            <p className="text-sm text-green-700 mt-1">
              Auto-coded. The invoice moves directly to <StatusBadge status="coded" /> status with no
              human intervention needed.
            </p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-semibold text-orange-800">Below 90%</p>
            <p className="text-sm text-orange-700 mt-1">
              Flagged for review. The invoice moves to <StatusBadge status="pending_approval" /> for a
              human to verify.
            </p>
          </div>
        </div>
      </div>

      {/* Status reference */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Status Reference</h2>
        <div className="grid gap-3 text-sm">
          {[
            { status: 'received', desc: 'New invoice, not yet processed' },
            { status: 'processing', desc: 'Currently being analyzed by the AI' },
            { status: 'coded', desc: 'GL code assigned with high confidence' },
            { status: 'pending_approval', desc: 'Needs human review (low AI confidence)' },
            { status: 'approved', desc: 'Reviewed and approved, ready to post' },
            { status: 'rejected', desc: 'Rejected during review (e.g., duplicate)' },
            { status: 'posted', desc: 'Posted to accounting system' },
          ].map(({ status, desc }) => (
            <div key={status} className="flex items-center gap-3">
              <StatusBadge status={status} />
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Under the Hood</h2>
        <div className="grid gap-3 text-sm">
          <div className="flex gap-3">
            <span className="font-medium text-muted-foreground w-32 shrink-0">Data</span>
            <span>invoices, vendors, gl_accounts, audit_log</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-muted-foreground w-32 shrink-0">AI Engine</span>
            <span>extract_invoice (document vision) + classify_and_code (GL matching)</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-muted-foreground w-32 shrink-0">Audit Trail</span>
            <span>Every status change and action is logged for compliance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
