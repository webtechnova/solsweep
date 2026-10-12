import { describe, expect, it } from 'vitest';
import { maxSendable, planTransfer, type PlanInput } from '@/lib/transfer';

const FEE = 5_000n;
const RENT_MIN = 890_880n;

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    balance: 2_000_000n,
    fee: FEE,
    rentMin: RENT_MIN,
    destBalance: 1_000_000n, // existing destination by default
    amount: 1_000_000n,
    ...overrides,
  };
}

describe('maxSendable', () => {
  it('is balance minus fee', () => {
    expect(maxSendable(2_000_000n, FEE)).toBe(1_995_000n);
  });

  it('never goes negative', () => {
    expect(maxSendable(1_000n, FEE)).toBe(0n);
    expect(maxSendable(FEE, FEE)).toBe(0n);
    expect(maxSendable(0n, FEE)).toBe(0n);
  });
});

describe('planTransfer', () => {
  it('MAX leaves the sender at exactly 0 lamports', () => {
    const balance = 1_234_567n;
    const plan = planTransfer(input({ balance, amount: maxSendable(balance, FEE) }));
    expect(plan).toMatchObject({ ok: true, remaining: 0n, emptiesWallet: true });
    if (plan.ok) expect(plan.amount + plan.fee).toBe(balance);
  });

  it('allows MAX on a tiny balance when the destination already exists', () => {
    // 10_000 lamports total: far below the rent minimum, but fine to sweep to 0.
    const plan = planTransfer(input({ balance: 10_000n, amount: 5_000n, destBalance: 1n }));
    expect(plan).toMatchObject({ ok: true, remaining: 0n, emptiesWallet: true });
  });

  it('allows a partial send that keeps at least the rent-exempt minimum', () => {
    const plan = planTransfer(input({ balance: 3_000_000n, amount: 1_000_000n }));
    expect(plan).toMatchObject({ ok: true, remaining: 1_995_000n, emptiesWallet: false });
  });

  it('allows leaving exactly the rent-exempt minimum', () => {
    const balance = 2_000_000n;
    const amount = balance - FEE - RENT_MIN;
    expect(planTransfer(input({ balance, amount }))).toMatchObject({ ok: true, remaining: RENT_MIN });
  });

  it('rejects a leftover one lamport below the rent-exempt minimum', () => {
    const balance = 2_000_000n;
    const amount = balance - FEE - (RENT_MIN - 1n);
    expect(planTransfer(input({ balance, amount }))).toMatchObject({
      ok: false,
      code: 'LEFTOVER_BELOW_RENT',
    });
  });

  it('rejects a tiny leftover such as 1 lamport', () => {
    const balance = 2_000_000n;
    expect(planTransfer(input({ balance, amount: balance - FEE - 1n }))).toMatchObject({
      ok: false,
      code: 'LEFTOVER_BELOW_RENT',
    });
  });

  it('rejects sending to an empty destination below the rent-exempt minimum', () => {
    const plan = planTransfer(input({ destBalance: 0n, amount: RENT_MIN - 1n, balance: 100_000_000n }));
    expect(plan).toMatchObject({ ok: false, code: 'DESTINATION_BELOW_RENT' });
  });

  it('allows sending exactly the rent-exempt minimum to an empty destination', () => {
    const plan = planTransfer(input({ destBalance: 0n, amount: RENT_MIN, balance: 100_000_000n }));
    expect(plan.ok).toBe(true);
  });

  it('blocks MAX to an empty destination when the max is below the rent-exempt minimum', () => {
    const balance = 500_000n;
    const plan = planTransfer(input({ balance, destBalance: 0n, amount: maxSendable(balance, FEE) }));
    expect(plan).toMatchObject({ ok: false, code: 'DESTINATION_BELOW_RENT' });
  });

  it('rejects when the balance cannot cover the fee', () => {
    expect(planTransfer(input({ balance: 4_000n, amount: 1n }))).toMatchObject({
      ok: false,
      code: 'CANNOT_COVER_FEE',
    });
    expect(planTransfer(input({ balance: FEE, amount: 1n }))).toMatchObject({
      ok: false,
      code: 'CANNOT_COVER_FEE',
    });
  });

  it('rejects zero amounts', () => {
    expect(planTransfer(input({ amount: 0n }))).toMatchObject({ ok: false, code: 'NO_AMOUNT' });
  });

  it('rejects amount + fee greater than balance', () => {
    expect(planTransfer(input({ balance: 1_000_000n, amount: 1_000_000n }))).toMatchObject({
      ok: false,
      code: 'INSUFFICIENT_BALANCE',
    });
  });

  it('includes human-readable SOL amounts in error messages', () => {
    const plan = planTransfer(input({ destBalance: 0n, amount: 1n, balance: 100_000_000n }));
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.message).toContain('0.00089088 SOL');
  });
});
