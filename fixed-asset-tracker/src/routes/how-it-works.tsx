import { createFileRoute } from '@tanstack/react-router';
import { ArrowDown, Box, Calculator, CheckCircle, FileSpreadsheet, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/how-it-works')({
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">How it Works</h1>
        <p className="text-muted-foreground mt-1">
          See how a fixed asset goes from acquisition to depreciation to disposal
        </p>
      </div>

      <div className="space-y-2">
        <Step
          icon={<Box className="size-5" />}
          color="blue"
          title="1. Register an Asset"
          description="Add a new fixed asset with its cost basis, category, useful life, and depreciation method. You can add assets manually from the Assets page or import from a CSV."
        />

        <Arrow />

        <Step
          icon={<Calculator className="size-5" />}
          color="purple"
          title="2. Run Monthly Depreciation"
          description="Click 'Run All Depreciation' from the Depreciation page, or run it per-asset from the detail page. The system calculates the monthly amount based on the asset's method (straight-line or declining balance) and creates a depreciation entry."
        />

        <Arrow />

        <Step
          icon={<CheckCircle className="size-5" />}
          color="green"
          title="3. Review and Post Entries"
          description="Each depreciation entry starts as 'Pending'. Review the amounts, then click 'Post' to finalize. Posted entries represent the journal entry that would be booked to your GL."
        />

        <Arrow />

        <Step
          icon={<FileSpreadsheet className="size-5" />}
          color="amber"
          title="4. Track Over Time"
          description="The asset detail page shows the full depreciation schedule — every period's amount, accumulated total, and remaining net book value. The dashboard gives you a portfolio-wide view of your asset base."
        />

        <Arrow />

        <Step
          icon={<Trash2 className="size-5" />}
          color="red"
          title="5. Dispose When Done"
          description="When an asset is retired or sold, click 'Dispose' and enter the sale proceeds. The system records the disposal and calculates any gain or loss."
        />
      </div>

      {/* Status Lifecycle */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Asset Statuses</h2>
        <p className="text-sm text-muted-foreground">Every asset moves through these stages:</p>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <StatusChip label="Active" color="bg-green-100 text-green-700" />
          <span className="text-muted-foreground">then</span>
          <StatusChip label="Fully Depreciated" color="bg-amber-100 text-amber-700" />
          <span className="text-muted-foreground">and/or</span>
          <StatusChip label="Disposed" color="bg-slate-100 text-slate-700" />
        </div>
        <div className="space-y-2 text-sm text-muted-foreground mt-2">
          <p><strong className="text-foreground">Active</strong> — Asset is in use and still being depreciated</p>
          <p><strong className="text-foreground">Fully Depreciated</strong> — Net book value has reached the salvage value; no more depreciation</p>
          <p><strong className="text-foreground">Disposed</strong> — Asset has been sold, scrapped, or otherwise retired</p>
        </div>
      </div>

      {/* Depreciation Methods */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Depreciation Methods</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold text-sm">Straight Line</h3>
            <p className="text-xs text-muted-foreground">
              Equal monthly amounts over the useful life. Formula: (Cost - Salvage) / Useful Life Months. Most common method for general business assets.
            </p>
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold text-sm">Declining Balance</h3>
            <p className="text-xs text-muted-foreground">
              Accelerated method — higher depreciation in early months, decreasing over time. Uses double the straight-line rate applied to the remaining book value.
            </p>
          </div>
        </div>
      </div>

      {/* GL Accounts */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">GL Account Mapping</h2>
        <p className="text-sm text-muted-foreground">
          Set up your chart of accounts in the Settings page. Typical fixed asset accounts:
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoItem label="Fixed Assets (1500)" description="Debit when acquiring an asset" />
          <InfoItem label="Accum. Depreciation (1550)" description="Credit each period (contra-asset)" />
          <InfoItem label="Depreciation Expense (6150)" description="Debit each period (expense)" />
        </div>
      </div>

      {/* Sample Data */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Sample Data</h2>
        <p className="text-sm text-muted-foreground">
          This template includes sample CSV files in the <code className="text-xs bg-muted px-1 rounded">samples/</code> directory
          that you can use to test asset imports. Run the seed script to populate demo data.
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
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
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
