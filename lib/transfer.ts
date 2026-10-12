import { formatLamports } from './format';

/**
 * Pure transfer-planning logic (no network, no React) so it can be unit-tested.
 *
 * Solana rules this encodes (for a plain system-owned wallet account, 0 data bytes):
 *  1. The sender pays the base fee out of the same balance it is sending from.
 *  2. After the transaction, an account may hold exactly 0 lamports (it is closed)
 *     OR at least the rent-exempt minimum. Anything in between is rejected by the
 *     runtime ("insufficient funds for rent").
 *  3. An account that does not exist yet (0 lamports) must be created with at least
 *     the rent-exempt minimum, so the first deposit to a brand-new wallet can't be tiny.
 */

export type PlanErrorCode =
  | 'CANNOT_COVER_FEE'
  | 'NO_AMOUNT'
  | 'INSUFFICIENT_BALANCE'
  | 'LEFTOVER_BELOW_RENT'
  | 'DESTINATION_BELOW_RENT';

export interface PlanInput {
  /** Sender balance in lamports. */
  balance: bigint;
  /** Network fee for the transaction in lamports. */
  fee: bigint;
  /** Rent-exempt minimum for a 0-byte account in lamports. */
  rentMin: bigint;
  /** Destination balance in lamports (0 means the account doesn't exist yet). */
  destBalance: bigint;
  /** Amount the user wants to send, in lamports. */
  amount: bigint;
}

export type PlanResult =
  | {
      ok: true;
      amount: bigint;
      fee: bigint;
      /** Lamports left in the sender wallet after sending and paying the fee. */
      remaining: bigint;
      /** True when the sender ends at exactly 0. */
      emptiesWallet: boolean;
    }
  | { ok: false; code: PlanErrorCode; message: string };

/** The most that can be sent: everything except the fee. Never negative. */
export function maxSendable(balance: bigint, fee: bigint): bigint {
  return balance > fee ? balance - fee : 0n;
}

export function planTransfer(input: PlanInput): PlanResult {
  const { balance, fee, rentMin, destBalance, amount } = input;
  const sol = (v: bigint) => `${formatLamports(v)} SOL`;

  if (balance <= fee) {
    return {
      ok: false,
      code: 'CANNOT_COVER_FEE',
      message: `Your balance (${sol(balance)}) can't cover the network fee (${sol(fee)}).`,
    };
  }

  if (amount <= 0n) {
    return { ok: false, code: 'NO_AMOUNT', message: 'Enter an amount greater than 0.' };
  }

  if (amount + fee > balance) {
    return {
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
      message: `Amount plus network fee (${sol(amount + fee)}) is more than your balance (${sol(balance)}). Use MAX to send the most possible.`,
    };
  }

  const remaining = balance - amount - fee;
  if (remaining !== 0n && remaining < rentMin) {
    return {
      ok: false,
      code: 'LEFTOVER_BELOW_RENT',
      message: `This would leave ${sol(remaining)} behind, and Solana doesn't allow a wallet to keep less than ${sol(rentMin)} unless it is completely empty. Click MAX to send everything, or send less so at least ${sol(rentMin)} stays.`,
    };
  }

  if (destBalance === 0n && amount < rentMin) {
    return {
      ok: false,
      code: 'DESTINATION_BELOW_RENT',
      message: `The destination wallet is empty, and Solana requires the first deposit to a new wallet to be at least ${sol(rentMin)}. Send a small amount to the new wallet first (for example from an exchange), then try again.`,
    };
  }

  return { ok: true, amount, fee, remaining, emptiesWallet: remaining === 0n };
}
