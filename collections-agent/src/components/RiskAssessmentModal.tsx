import { Loader2, X } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export type RiskResult = {
  risk_score: number;
  risk_level: string;
  next_action: string;
  reasoning: string;
};

export function RiskAssessmentModal({ result, onClose }: { result: RiskResult | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-lg w-full max-w-md mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{result ? 'Risk Assessment' : 'Assessing Risk...'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {result ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-3xl font-bold mt-1">{result.risk_score}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-sm text-muted-foreground">Level</p>
                <div className="mt-2">
                  <StatusBadge status={result.risk_level} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Recommended Action</p>
                <p className="text-sm text-muted-foreground mt-1">{result.next_action}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Reasoning</p>
                <p className="text-sm text-muted-foreground mt-1">{result.reasoning}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Close
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI is analyzing customer risk profile...</p>
          </div>
        )}
      </div>
    </div>
  );
}
