'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { PublicKey } from '@solana/web3.js';
import { IS_MAINNET } from '@/lib/config';
import { formatLamports, parseSolToLamports, shortAddress } from '@/lib/format';
import { parseAddress } from '@/lib/solana';
import { maxSendable, planTransfer } from '@/lib/transfer';
import { useDestinationBalance } from '@/hooks/useDestinationBalance';
import { useNetworkCosts } from '@/hooks/useNetworkCosts';
import { useSendSol } from '@/hooks/useSendSol';
import { useSolBalance } from '@/hooks/useSolBalance';
import { ConfirmModal, type ConfirmDetails } from './ConfirmModal';
import { CopyButton } from './CopyButton';
import { NetworkBadge } from './NetworkBadge';
import { SecurityNotice } from './SecurityNotice';
import { StatusPanel } from './StatusPanel';
import { WalletButton } from './WalletButton';

/** What the user is reviewing in the confirm dialog (numbers are frozen at open time). */
type ReviewState = ConfirmDetails & { destinationKey: PublicKey };

export function SweepCard() {
  const { publicKey, connected } = useWallet();
  const { balance, loading: balanceLoading, error: balanceError, refresh } = useSolBalance();
  const costs = useNetworkCosts();
  const sender = useSendSol();

  const [destination, setDestination] = useState('');
  const [amountText, setAmountText] = useState('');
  const [maxMode, setMaxMode] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);

  const busy =
    sender.phase === 'preparing' || sender.phase === 'approving' || sender.phase === 'confirming';

  // ---- Destination ---------------------------------------------------------
  const parsedDestination = useMemo(() => parseAddress(destination), [destination]);
  const destinationError =
    destination.trim() === ''
      ? null
      : !parsedDestination
        ? 'Invalid Solana address'
        : publicKey && parsedDestination.equals(publicKey)
          ? 'Destination cannot be your own wallet'
          : null;
  const validDestination = parsedDestination && !destinationError ? parsedDestination : null;
  const dest = useDestinationBalance(validDestination);

  // ---- Amount --------------------------------------------------------------
  const fee = costs.fee;
  const rentMin = costs.rentMin;

  const amount = useMemo<bigint | null>(() => {
    if (maxMode) {
      return balance !== null && fee !== null ? maxSendable(balance, fee) : null;
    }
    return parseSolToLamports(amountText);
  }, [maxMode, balance, fee, amountText]);

  const amountError =
    !maxMode && amountText.trim() !== '' && amount === null
      ? 'Enter a valid amount (numbers only, up to 9 decimals).'
      : null;

  const amountInputValue = maxMode ? (amount !== null ? formatLamports(amount) : '') : amountText;

  // ---- Plan (all validation lives in lib/transfer.ts) ------------------------
  const plan = useMemo(() => {
    if (balance === null || fee === null || rentMin === null || dest.balance === null || amount === null) {
      return null;
    }
    return planTransfer({ balance, fee, rentMin, destBalance: dest.balance, amount });
  }, [balance, fee, rentMin, dest.balance, amount]);

  const canReview = connected && !busy && !!validDestination && plan?.ok === true;

  // ---- Handlers ------------------------------------------------------------
  const onMax = useCallback(() => {
    setMaxMode(true);
    setAmountText('');
  }, []);

  const onAmountChange = useCallback((value: string) => {
    setMaxMode(false);
    setAmountText(value);
  }, []);

  const onPaste = useCallback(async () => {
    try {
      setDestination((await navigator.clipboard.readText()).trim());
    } catch (err) {
      console.warn('Clipboard unavailable', err);
    }
  }, []);

  function openReview() {
    if (!publicKey || !validDestination || !plan || !plan.ok) return;
    // Freeze the numbers the user is about to approve.
    setReview({
      destinationKey: validDestination,
      from: publicKey.toBase58(),
      to: validDestination.toBase58(),
      amount: plan.amount,
      fee: plan.fee,
      remaining: plan.remaining,
      emptiesWallet: plan.emptiesWallet,
    });
  }

  function confirmSend() {
    if (!review) return;
    const { destinationKey, amount: confirmedAmount } = review;
    setReview(null);
    void sender.send({ destination: destinationKey, amount: confirmedAmount });
  }

  function dismissStatus() {
    if (sender.phase === 'done') {
      setAmountText('');
      setMaxMode(false);
    }
    sender.reset();
  }

  const sol = (v: bigint | null) => (v === null ? null : `${formatLamports(v)} SOL`);

  return (
    <section className="card space-y-5" aria-labelledby="sweep-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="sweep-title" className="text-lg font-semibold">
          Send SOL
        </h2>
        <NetworkBadge />
      </div>

      {IS_MAINNET && (
        <p className="-mt-2 text-xs text-amber-300/90">You are on mainnet. Transactions use real SOL.</p>
      )}

      {/* ---- Wallet ---- */}
      {!connected || !publicKey ? (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-center">
          <p className="text-sm text-zinc-300">Connect your wallet to continue</p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
          <p className="text-xs text-zinc-500">
            No wallet yet? Get{' '}
            <a className="text-violet-300 underline" href="https://phantom.app/download" target="_blank" rel="noopener noreferrer">
              Phantom
            </a>{' '}
            or{' '}
            <a className="text-violet-300 underline" href="https://solflare.com/download" target="_blank" rel="noopener noreferrer">
              Solflare
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Connected wallet</p>
              <p className="truncate font-mono text-sm" title={publicKey.toBase58()}>
                {shortAddress(publicKey.toBase58())}
              </p>
            </div>
            <CopyButton value={publicKey.toBase58()} />
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-zinc-500">Balance</p>
              {balance === null ? (
                balanceError ? (
                  <p className="text-sm text-red-300">Unavailable</p>
                ) : (
                  <div className="mt-1 h-6 w-32 animate-pulse rounded bg-zinc-800" aria-label="Loading balance" />
                )
              ) : (
                <>
                  <p className="text-xl font-semibold tabular-nums">{formatLamports(balance, { trim: false })} SOL</p>
                  <p className="text-xs tabular-nums text-zinc-500">{balance.toString()} lamports</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={balanceLoading}
              className="btn-chip bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              aria-label="Refresh balance"
            >
              {balanceLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {balanceError && (
            <p role="alert" className="text-xs text-red-300">
              {balanceError}
            </p>
          )}

          <div className="flex justify-end">
            <WalletButton />
          </div>
        </div>
      )}

      {/* ---- Form ---- */}
      <fieldset disabled={!connected || busy} className="space-y-5 disabled:opacity-60">
        <legend className="sr-only">Transfer details</legend>

        <div>
          <label htmlFor="destination" className="label">
            Destination address
          </label>
          <div className="relative">
            <input
              id="destination"
              className="input pr-20 font-mono text-sm"
              value={destination}
              onChange={(e) => setDestination(e.target.value.trim())}
              placeholder="Your new wallet address"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              aria-invalid={destinationError ? 'true' : 'false'}
              aria-describedby="destination-msg"
            />
            <button
              type="button"
              onClick={() => void onPaste()}
              className="btn-chip absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            >
              Paste
            </button>
          </div>
          <p
            id="destination-msg"
            role={destinationError ? 'alert' : undefined}
            className={`mt-1.5 min-h-[1rem] text-xs ${destinationError ? 'text-red-300' : 'text-emerald-300'}`}
          >
            {destinationError ??
              (validDestination
                ? `✓ Valid address${dest.loading ? ' · checking balance…' : dest.balance === 0n ? ' · new wallet (no SOL yet)' : ''}`
                : '')}
          </p>
          {dest.error && (
            <p role="alert" className="mt-1 text-xs text-red-300">
              {dest.error}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="amount" className="label">
            Amount (SOL)
          </label>
          <div className="relative">
            <input
              id="amount"
              className="input pr-20 tabular-nums"
              value={amountInputValue}
              onChange={(e) => onAmountChange(e.target.value)}
              inputMode="decimal"
              placeholder="0.0"
              autoComplete="off"
              aria-invalid={amountError ? 'true' : 'false'}
              aria-describedby="amount-msg"
            />
            <button
              type="button"
              onClick={onMax}
              disabled={balance === null || fee === null}
              aria-pressed={maxMode}
              className={`btn-chip absolute right-2 top-1/2 -translate-y-1/2 ${
                maxMode ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              MAX
            </button>
          </div>
          <p id="amount-msg" role={amountError ? 'alert' : undefined} className="mt-1.5 min-h-[1rem] text-xs text-red-300">
            {amountError}
          </p>
          {costs.error && (
            <p role="alert" className="mt-1 text-xs text-red-300">
              {costs.error}{' '}
              <button type="button" className="underline" onClick={() => void costs.reload()}>
                Retry
              </button>
            </p>
          )}
        </div>
      </fieldset>

      {/* ---- Summary ---- */}
      <dl className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
        <SummaryRow label="Balance" value={sol(balance)} />
        <SummaryRow label="Network fee" value={sol(fee)} />
        <SummaryRow label="You send" value={plan?.ok ? sol(plan.amount) : sol(amount)} strong />
        <SummaryRow label="Remaining after send" value={plan?.ok ? sol(plan.remaining) : null} />
      </dl>

      {plan && !plan.ok && validDestination && amount !== null && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {plan.message}
        </p>
      )}

      {plan?.ok && plan.emptiesWallet && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          This sends everything and leaves your wallet at 0. Your wallet app may warn that this empties
          the account. That is expected for MAX.
        </p>
      )}

      <button type="button" className="btn-primary w-full" disabled={!canReview} onClick={openReview}>
        {busy ? 'Working…' : maxMode ? 'Review & send everything' : 'Review & send'}
      </button>

      <StatusPanel
        phase={sender.phase}
        signature={sender.signature}
        error={sender.error}
        onDismiss={dismissStatus}
      />

      <SecurityNotice />

      {review && (
        <ConfirmModal details={review} onCancel={() => setReview(null)} onConfirm={confirmSend} />
      )}
    </section>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-zinc-400">{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-semibold text-zinc-100' : 'text-zinc-200'}`}>
        {value ?? <span className="text-zinc-600">—</span>}
      </dd>
    </div>
  );
}
