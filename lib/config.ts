import { clusterApiUrl } from '@solana/web3.js';

export type Network = 'mainnet-beta' | 'devnet';

// NOTE: NEXT_PUBLIC_* variables must be referenced with a literal `process.env.NAME`
// access so Next.js can inline them into the client bundle at build time.
const rawNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK?.trim();

export const NETWORK: Network = rawNetwork === 'devnet' ? 'devnet' : 'mainnet-beta';

export const RPC_URL: string = process.env.NEXT_PUBLIC_RPC_URL?.trim() || clusterApiUrl(NETWORK);

export const IS_MAINNET = NETWORK === 'mainnet-beta';

/** Link to the transaction on Solscan, with the right cluster. */
export function explorerTxUrl(signature: string): string {
  const suffix = NETWORK === 'devnet' ? '?cluster=devnet' : '';
  return `https://solscan.io/tx/${signature}${suffix}`;
}
