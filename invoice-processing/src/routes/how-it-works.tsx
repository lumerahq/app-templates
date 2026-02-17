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
          See how an invoice goes from a paper document to an approved record
        </p>
      </div>

      {/* Flow Steps */}
      <div className="space-y-2">
        <Step
          icon={<FileUp className="size-5" />}
          color="blue"
          title="1. Upload Your Invoice"
          description="Click 'New Invoice' and upload a PDF or photo of your invoice. The system securely stores your document and creates a new invoice record."
        />

        <Arrow />

        <Step
          icon={<Zap className="size-5" />}
          color="amber"
          title="2. Automatic Processing Begins"
          description="As soon as your document is uploaded, the system automatically kicks off the data extraction process. You'll see a 'Processing' indicator while this happens."
        />

        <Arrow />

        <Step
          icon={<Bot className="size-5" />}
          color="purple"
          title="3. AI Reads Your Invoice"
          description="An AI reads your uploaded document and pulls out key information: the vendor name, invoice number, dates, amounts, currency, and a description of what the invoice is for. This typically takes just a few seconds."
        />

        <Arrow />

        <Step
          icon={<Eye className="size-5" />}
          color="orange"
          title="4. Review and Edit"
          description="Once the AI has finished, the extracted information appears in an editable form next to your original document. Review what was found, correct any mistakes, and fill in anything that was missed. Click 'Save Changes' when you're done."
        />

        <Arrow />

        <Step
          icon={<CheckCircle className="size-5" />}
          color="green"
          title="5. Approve or Reject"
          description="When you're satisfied the details are correct, click 'Approve' to finalize the invoice. If something isn't right, click 'Reject'. Either way, the dashboard updates instantly to reflect the change."
        />
      </div>

      {/* Status Lifecycle */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Invoice Statuses</h2>
        <p className="text-sm text-muted-foreground">Every invoice moves through these stages:</p>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <StatusChip label="Draft" color="bg-slate-100 text-slate-700" />
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Processing" color="bg-blue-100 text-blue-700" />
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Review" color="bg-amber-100 text-amber-700" />
          <span className="text-muted-foreground">then</span>
          <div className="flex items-center gap-2">
            <StatusChip label="Approved" color="bg-green-100 text-green-700" />
            <span className="text-muted-foreground">or</span>
            <StatusChip label="Rejected" color="bg-red-100 text-red-700" />
          </div>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground mt-2">
          <p><strong className="text-foreground">Draft</strong> — Invoice just uploaded, waiting for AI processing to start</p>
          <p><strong className="text-foreground">Processing</strong> — AI is reading the document and extracting information</p>
          <p><strong className="text-foreground">Review</strong> — Extracted data is ready for you to check and edit</p>
          <p><strong className="text-foreground">Approved</strong> — Invoice has been verified and approved</p>
          <p><strong className="text-foreground">Rejected</strong> — Invoice was rejected (e.g. duplicate, incorrect, or invalid)</p>
        </div>
      </div>

      {/* What data is captured */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">What Gets Extracted</h2>
        <p className="text-sm text-muted-foreground">The AI reads your invoice and tries to find the following details:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoItem label="Vendor Name" description="Who sent the invoice" />
          <InfoItem label="Invoice Number" description="The unique invoice reference" />
          <InfoItem label="Invoice Date" description="When the invoice was issued" />
          <InfoItem label="Due Date" description="When payment is due" />
          <InfoItem label="Total Amount" description="The total amount to be paid" />
          <InfoItem label="Currency" description="The currency (e.g. USD, EUR, GBP)" />
          <InfoItem label="Description" description="What the invoice is for" />
          <InfoItem label="Line Items" description="Individual items, quantities, and prices" />
        </div>
        <p className="text-sm text-muted-foreground">
          If the AI can't find a field or gets something wrong, you can always correct it manually during the Review step.
        </p>
      </div>

      {/* Master Data */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Master Data</h2>
        <p className="text-sm text-muted-foreground">
          You can manage supporting data in the Settings page:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-1">
            <h3 className="font-semibold text-sm">Vendors</h3>
            <p className="text-xs text-muted-foreground">Your list of suppliers and their default accounting codes. Add vendors you frequently receive invoices from.</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <h3 className="font-semibold text-sm">GL Accounts</h3>
            <p className="text-xs text-muted-foreground">Your chart of accounts for categorizing expenses. Each account has a code, name, and type (expense, asset, liability, etc.).</p>
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
