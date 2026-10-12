import { IS_MAINNET } from '@/lib/config';

export function NetworkBadge() {
  return (
    <span
      className={
        IS_MAINNET
          ? 'rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-300'
          : 'rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-orange-300'
      }
      title={IS_MAINNET ? 'Solana mainnet-beta' : 'Solana devnet (test network)'}
    >
      {IS_MAINNET ? 'MAINNET' : 'DEVNET'}
    </span>
  );
}
