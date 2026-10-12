'use client';

import { explorerTxUrl } from '@/lib/config';
import type { SendPhase } from '@/hooks/useSendSol';

interface Props {
  phase: SendPhase;
  signature: string | null;
  error: string | null;
  onDismiss: () => void;
}

const STEPS: { phase: SendPhase; label: string }[] = [
  { phase: 'preparing', label: 'Preparing' },
  { phase: 'approving', label: 'Approve in your wallet' },
  { phase: 'confirming', label: 'Confirming on-chain' },
  { phase: 'done', label: 'Done' },
];

export function StatusPanel({ phase, signature, error, onDismiss }: Props) {
  if (phase === 'idle') return null;

  if (phase === 'error') {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
        <p className="font-semibold text-red-300">Transfer not completed</p>
        <p className="text-red-200/90">{error}</p>
        {signature && (
          <a
            className="inline-block text-xs text-violet-300 underline"
            href={explorerTxUrl(signature)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Check this transaction on Solscan
          </a>
        )}
        <div>
          <button type="button" className="btn-secondary" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div
        role="status"
        className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm"
      >
        <p className="font-semibold text-emerald-300">Transfer confirmed</p>
        {signature && (
          <>
            <p className="break-all font-mono text-xs text-emerald-100/80">{signature}</p>
            <a
              className="inline-block text-xs text-violet-300 underline"
              href={explorerTxUrl(signature)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Solscan
            </a>
          </>
        )}
        <div>
          <button type="button" className="btn-secondary" onClick={onDismiss}>
            Send another
          </button>
        </div>
      </div>
    );
  }

  // In progress: show a simple step list.
  const currentIndex = STEPS.findIndex((s) => s.phase === phase);
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-4 text-sm">
      <ol className="space-y-2">
        {STEPS.map((step, i) => {
          const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'todo';
          return (
            <li key={step.phase} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={
                  state === 'done'
                    ? 'h-2.5 w-2.5 rounded-full bg-emerald-400'
                    : state === 'active'
                      ? 'h-2.5 w-2.5 animate-pulse rounded-full bg-violet-400'
                      : 'h-2.5 w-2.5 rounded-full bg-zinc-700'
                }
              />
              <span className={state === 'todo' ? 'text-zinc-500' : 'text-zinc-100'}>{step.label}</span>
            </li>
          );
        })}
      </ol>
      {phase === 'confirming' && signature && (
        <a
          className="mt-3 inline-block text-xs text-violet-300 underline"
          href={explorerTxUrl(signature)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Track on Solscan
        </a>
      )}
    </div>
  );
}
