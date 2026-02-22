import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FileDropzone } from '@lumerahq/ui/components';
import { useFileUpload } from '@lumerahq/ui/hooks';
import { pbCreate } from '@lumerahq/ui/lib';
import type { Invoice } from '../lib/queries';

export function NewInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { upload, status, reset } = useFileUpload({
    collectionId: 'ip_invoices',
    fieldName: 'document',
    onSuccess: async ({ descriptor }) => {
      try {
        const record = await pbCreate<Invoice>('ip_invoices', {
          document: descriptor,
          status: 'draft',
          currency: 'USD',
        } as Partial<Invoice>);
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        toast.success('Invoice uploaded — extracting data...');
        reset();
        onClose();
        navigate({ to: '/invoices/$id', params: { id: record.id! } });
      } catch (err) {
        toast.error('Failed to create invoice record');
        setError('Failed to create invoice record.');
      }
    },
    onError: () => {
      toast.error('Failed to upload file');
      setError('Failed to upload file.');
    },
  });

  const isUploading = status === 'uploading';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} onKeyDown={() => {}} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upload Invoice</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Upload a PDF or image of an invoice. AI will extract the data automatically.
        </p>

        <FileDropzone
          accept=".pdf,.png,.jpg,.jpeg"
          disabled={isUploading}
          onFilesSelected={(files: File[]) => {
            if (files[0]) {
              setError(null);
              upload(files[0]);
            }
          }}
          description="Accepts PDF, PNG, and JPEG files"
          showSelectedFiles
        />

        {isUploading && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Upload className="size-4 animate-pulse" />
            Uploading...
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
