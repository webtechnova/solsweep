import { Keypair, SystemInstruction, SystemProgram } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';
import { buildTransferTx, parseAddress, withRetry } from '@/lib/solana';
import { UserFacingError } from '@/lib/errors';

const blockhash = {
  blockhash: '11111111111111111111111111111111',
  lastValidBlockHeight: 1_000,
};

describe('parseAddress', () => {
  it('accepts a valid address', () => {
    const key = Keypair.generate().publicKey;
    expect(parseAddress(key.toBase58())?.equals(key)).toBe(true);
  });

  it('trims whitespace', () => {
    const key = Keypair.generate().publicKey;
    expect(parseAddress(`  ${key.toBase58()}\n`)?.equals(key)).toBe(true);
  });

  it.each([
    '',
    'hello',
    '0OIl'.repeat(10), // characters outside the base58 alphabet
    'a'.repeat(31),
    'a'.repeat(45),
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // an Ethereum address
  ])('rejects %j', (value) => {
    expect(parseAddress(value)).toBeNull();
  });
});

describe('buildTransferTx', () => {
  const from = Keypair.generate().publicKey;
  const to = Keypair.generate().publicKey;

  it('contains exactly one instruction: a SystemProgram transfer', () => {
    const tx = buildTransferTx(from, to, 1_234n, blockhash);
    expect(tx.instructions).toHaveLength(1);

    const ix = tx.instructions[0]!;
    expect(ix.programId.equals(SystemProgram.programId)).toBe(true);
    expect(SystemInstruction.decodeInstructionType(ix)).toBe('Transfer');

    const decoded = SystemInstruction.decodeTransfer(ix);
    expect(decoded.fromPubkey.equals(from)).toBe(true);
    expect(decoded.toPubkey.equals(to)).toBe(true);
    expect(decoded.lamports).toBe(1_234n);
  });

  it('makes the sender the fee payer and uses the supplied blockhash', () => {
    const tx = buildTransferTx(from, to, 1n, blockhash);
    expect(tx.feePayer?.equals(from)).toBe(true);
    expect(tx.recentBlockhash).toBe(blockhash.blockhash);
    expect(tx.lastValidBlockHeight).toBe(blockhash.lastValidBlockHeight);
  });

  it('needs only the sender to sign', () => {
    const message = buildTransferTx(from, to, 1n, blockhash).compileMessage();
    expect(message.header.numRequiredSignatures).toBe(1);
  });
});

describe('withRetry', () => {
  it('returns the first success', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries transient failures and then succeeds', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error('429 Too Many Requests');
        return 'ok';
      },
      3,
      1,
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('throws the last error after exhausting attempts', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error(`fail ${calls}`);
        },
        3,
        1,
      ),
    ).rejects.toThrow('fail 3');
  });

  it('does not retry user-facing errors', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw new UserFacingError('nope');
      }),
    ).rejects.toThrow('nope');
    expect(calls).toBe(1);
  });
});
