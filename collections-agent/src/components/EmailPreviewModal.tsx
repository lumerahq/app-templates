import { sendEmail } from '@lumerahq/ui/lib';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export type EmailResult = {
  subject: string;
  body: string;
  customer_email: string;
};

export function EmailPreviewModal({ result, onClose }: { result: EmailResult | null; onClose: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Populate fields once result arrives
  if (result && !initialized) {
    setTo(result.customer_email);
    setSubject(result.subject);
    setBody(result.body);
    setInitialized(true);
  }

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setSending(true);
    try {
      await sendEmail({ to, subject, body_text: body });
      setSent(true);
      toast.success('Email sent');
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-lg mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{sent ? 'Email Sent' : result ? 'Review Email' : 'Drafting Email...'}</h2>
            {sent && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Sent</span>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {result ? (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">To</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  disabled={sent}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sent}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={sent}
                  rows={10}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {!sent && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`${sent ? 'flex-1' : ''} rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors`}
              >
                {sent ? 'Close' : 'Cancel'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI is drafting a personalized collection email...</p>
          </div>
        )}
      </div>
    </div>
  );
}
