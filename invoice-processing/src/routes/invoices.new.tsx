import { FileDropzone } from '@lumerahq/ui';
import { useFileUpload } from '@lumerahq/ui/hooks';
import { createRun, pollRun } from '@lumerahq/ui/lib';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, FileCheck, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { createInvoice, listVendors, logAction } from '../lib/queries';

export const Route = createFileRoute('/invoices/new')({
  component: NewInvoicePage,
});

type Step = 'upload' | 'extracting' | 'review';

type ExtractedData = {
  invoice_number: string;
  vendor_name: string;
  date: string | null;
  due_date: string | null;
  amount: number;
  description: string;
};

function NewInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fileUpload = useFileUpload({
    collectionId: 'invoices',
    fieldName: 'source_document',
  });

  const vendorsQuery = useQuery({
    queryKey: ['vendors-list'],
    queryFn: () => listVendors(1, 200),
  });
  const vendors = vendorsQuery.data?.items ?? [];

  const [form, setForm] = useState({
    vendor: '',
    invoice_number: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    description: '',
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // --- Fuzzy-match vendor name against vendor list ---
  const matchVendor = (name: string): string => {
    if (!name) return '';
    const lower = name.toLowerCase();
    const match = vendors.find(
      (v) => v.name.toLowerCase() === lower || v.name.toLowerCase().includes(lower) || lower.includes(v.name.toLowerCase())
    );
    return match?.id ?? '';
  };

  // --- Handle file upload + extraction ---
  const handleFilesSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setFileName(file.name);

    // Upload the file
    fileUpload.upload(file);
  };

  // Watch for upload completion and trigger extraction
  const extractionTriggered = useRef(false);
  if (fileUpload.result && step === 'upload' && !extractionTriggered.current) {
    extractionTriggered.current = true;
    setStep('extracting');

    // Trigger extraction automation
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const run = await createRun({
          automationId: '{{projectName}}:extract_invoice',
          inputs: { file_descriptor: fileUpload.result!.descriptor },
        });

        const result = await pollRun(run.id, {
          timeoutMs: 120_000,
          signal: controller.signal,
        });

        if (result.status === 'succeeded' && result.result) {
          const data = result.result as { success: boolean; extracted: ExtractedData };
          if (data.success && data.extracted) {
            const ext = data.extracted;
            setForm({
              vendor: matchVendor(ext.vendor_name ?? ''),
              invoice_number: ext.invoice_number ?? '',
              date: ext.date ?? new Date().toISOString().split('T')[0],
              due_date: ext.due_date ?? '',
              amount: ext.amount ? String(ext.amount) : '',
              description: ext.description ?? '',
            });
            toast.success('Invoice details extracted');
          }
        } else {
          toast.error('Extraction failed — please fill in the details manually');
        }
      } catch {
        toast.error('Extraction failed — please fill in the details manually');
      } finally {
        setStep('review');
      }
    })();
  }

  // --- Submit invoice ---
  const createMutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        ...form,
        amount: parseFloat(form.amount),
        status: 'received',
      };
      if (fileUpload.result) {
        data.source_document = fileUpload.result.descriptor;
      }
      if (!form.vendor) delete data.vendor;
      return createInvoice(data);
    },
    onSuccess: (invoice) => {
      logAction(invoice.id!, 'created', `Invoice ${form.invoice_number} created`);
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-invoices'] });
      toast.success('Invoice created');
      navigate({ to: '/invoices/$invoiceId', params: { invoiceId: invoice.id! } });
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err instanceof Error ? err.message : 'Unknown error'}`);
    },
  });

  const canSubmit = form.invoice_number && form.date && form.amount && !createMutation.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <Link to="/invoices" className="text-sm text-primary hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="size-4" /> Back to invoices
        </Link>
        <h1 className="text-2xl font-semibold">
          {step === 'upload' ? 'Upload Invoice' : step === 'extracting' ? 'Extracting Details...' : 'Review Invoice'}
        </h1>
        <p className="text-muted-foreground">
          {step === 'upload'
            ? 'Drop an invoice document and AI will extract the details'
            : step === 'extracting'
              ? 'AI is reading your document'
              : 'Review the extracted details and make any corrections'}
        </p>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-8">
            <FileDropzone
              accept=".pdf,.png,.jpg,.jpeg"
              maxSize={10 * 1024 * 1024}
              disabled={fileUpload.isUploading}
              onFilesSelected={handleFilesSelected}
              description="PDF or image of an invoice (max 10 MB)"
            />
            {fileUpload.isUploading && (
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Uploading {fileName}...
              </div>
            )}
            {fileUpload.error && <p className="text-sm text-red-600 mt-2">{fileUpload.error}</p>}
          </div>
          <button
            type="button"
            onClick={() => setStep('review')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            or enter details manually
          </button>
        </div>
      )}

      {/* Step 2: Extracting */}
      {step === 'extracting' && (
        <div className="rounded-xl border bg-card p-10 flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <div>
            <p className="font-medium">Extracting invoice details...</p>
            <p className="text-sm text-muted-foreground mt-1">
              AI is reading <span className="font-medium">{fileName}</span>
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <>
          {/* Show uploaded file indicator */}
          {fileUpload.result && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2.5 text-sm">
              <FileCheck className="size-4 text-green-600" />
              <span className="text-muted-foreground">Document:</span>
              <span className="font-medium">{fileName}</span>
            </div>
          )}

          <div className="rounded-xl border bg-card p-6 space-y-5">
            {/* Invoice number + vendor */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="invoice_number">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="invoice_number"
                  type="text"
                  value={form.invoice_number}
                  onChange={(e) => update('invoice_number', e.target.value)}
                  placeholder="INV-2025-016"
                  className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="vendor">
                  Vendor
                </label>
                <select
                  id="vendor"
                  value={form.vendor}
                  onChange={(e) => update('vendor', e.target.value)}
                  className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select vendor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="date">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => update('date', e.target.value)}
                  className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="due_date">
                  Due Date
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => update('due_date', e.target.value)}
                  className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Amount */}
            <div className="max-w-xs">
              <label className="text-sm font-medium" htmlFor="amount">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => update('amount', e.target.value)}
                placeholder="0.00"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                placeholder="What is this invoice for?"
                className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Upload className="size-4" />
              {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </button>
            <Link to="/invoices" className="text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
