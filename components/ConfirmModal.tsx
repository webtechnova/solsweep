'use client';

import { useEffect, useRef } from 'react';
import { NETWORK } from '@/lib/config';
import { formatLamports } from '@/lib/format';

export interface ConfirmDetails {
  from: string;
  to: string;
  amount: bigint;
  fee: bigint;
  remaining: bigint;
  emptiesWallet: boolean;
}

interface Props {
  details: ConfirmDetails;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ details, onCancel, onConfirm }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the safe option first, close on Escape, and keep Tab inside the dialog.
  useEffect(() => {
    cancelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      const first = cancelRef.current;
      const last = confirmRef.current;
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const sol = (v: bigint) => `${formatLamports(v)} SOL`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          Review transfer
        </h2>

        <dl className="mt-4 space-y-3 text-sm">
          <Row label="From">
            <span className="break-all font-mono text-xs">{details.from}</span>
          </Row>
          <Row label="To">
            <span className="break-all font-mono text-xs">{details.to}</span>
          </Row>
          <Row label="Amount">
            <span className="font-semibold">{sol(details.amount)}</span>
          </Row>
          <Row label="Network fee">{sol(details.fee)}</Row>
          <Row label="Left in your wallet">
            <span className={details.emptiesWallet ? 'font-semibold text-amber-300' : undefined}>
              {sol(details.remaining)}
            </span>
          </Row>
          <Row label="Network">{NETWORK === 'devnet' ? 'Devnet (test)' : 'Mainnet'}</Row>
        </dl>

        {details.emptiesWallet && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            Your wallet will be fully emptied. Your wallet app may show a warning about this. That is
            expected when you send MAX.
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button ref={cancelRef} type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button ref={confirmRef} type="button" className="btn-primary" onClick={onConfirm}>
            Confirm &amp; sign
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
