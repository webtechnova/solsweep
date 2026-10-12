import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  type BlockhashWithExpiryBlockHeight,
} from '@solana/web3.js';
import { UserFacingError } from './errors';

/**
 * Validate and parse a base58 Solana address. Returns null if it is not a valid
 * 32-byte public key. The round-trip check rejects non-canonical encodings.
 */
export function parseAddress(value: string): PublicKey | null {
  const v = value.trim();
  if (v.length < 32 || v.length > 44) return null;
  try {
    const key = new PublicKey(v);
    return key.toBase58() === v ? key : null;
  } catch {
    return null;
  }
}

/**
 * Build the one and only transaction this app ever sends: a single
 * SystemProgram.transfer. No other instructions (no priority fee, no tips, no extras).
 */
export function buildTransferTx(
  from: PublicKey,
  to: PublicKey,
  lamports: bigint,
  blockhash: BlockhashWithExpiryBlockHeight,
): Transaction {
  const tx = new Transaction({
    feePayer: from,
    blockhash: blockhash.blockhash,
    lastValidBlockHeight: blockhash.lastValidBlockHeight,
  });
  tx.add(SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }));
  return tx;
}

/** Ask the cluster what it will charge for this exact transaction shape. */
export async function estimateFee(
  connection: Connection,
  from: PublicKey,
  to: PublicKey,
): Promise<bigint> {
  const blockhash = await connection.getLatestBlockhash('confirmed');
  // The fee does not depend on the amount, so a 1-lamport probe is enough.
  const probe = buildTransferTx(from, to, 1n, blockhash);
  const res = await connection.getFeeForMessage(probe.compileMessage(), 'confirmed');
  if (res.value === null) {
    throw new UserFacingError('Could not determine the network fee. Please try again.');
  }
  return BigInt(res.value);
}

/** Minimum balance a 0-byte (normal wallet) account must hold to stay alive. */
export async function getRentExemptMinimum(connection: Connection): Promise<bigint> {
  return BigInt(await connection.getMinimumBalanceForRentExemption(0));
}

export async function getBalanceLamports(
  connection: Connection,
  address: PublicKey,
): Promise<bigint> {
  return BigInt(await connection.getBalance(address, 'confirmed'));
}

/** Retry a read call with exponential backoff (handy for rate-limited public RPCs). */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 400,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof UserFacingError) throw err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** i));
      }
    }
  }
  throw lastError;
}
