import { describe, expect, it } from 'vitest';
import { formatLamports, parseSolToLamports, shortAddress } from '@/lib/format';

describe('parseSolToLamports', () => {
  it('parses whole and fractional amounts exactly', () => {
    expect(parseSolToLamports('1')).toBe(1_000_000_000n);
    expect(parseSolToLamports('0.5')).toBe(500_000_000n);
    expect(parseSolToLamports('0.000000001')).toBe(1n);
    expect(parseSolToLamports('2.123456789')).toBe(2_123_456_789n);
  });

  it('accepts leading/trailing dot forms and surrounding whitespace', () => {
    expect(parseSolToLamports('.25')).toBe(250_000_000n);
    expect(parseSolToLamports('3.')).toBe(3_000_000_000n);
    expect(parseSolToLamports('  1.5  ')).toBe(1_500_000_000n);
  });

  it('has no floating point error (0.1 + 0.2 style cases)', () => {
    expect(parseSolToLamports('0.1')).toBe(100_000_000n);
    expect(parseSolToLamports('0.3')).toBe(300_000_000n);
    expect(parseSolToLamports('0.00089088')).toBe(890_880n);
  });

  it('rejects more than 9 decimals', () => {
    expect(parseSolToLamports('0.0000000001')).toBeNull();
  });

  it.each(['', ' ', '.', 'abc', '1e3', '-1', '+1', '1,5', '1.2.3', '0x10', '1 000'])(
    'rejects invalid input %j',
    (input) => {
      expect(parseSolToLamports(input)).toBeNull();
    },
  );

  it('rejects absurdly large whole parts', () => {
    expect(parseSolToLamports('1'.repeat(13))).toBeNull();
  });

  it('parses zero', () => {
    expect(parseSolToLamports('0')).toBe(0n);
    expect(parseSolToLamports('0.0')).toBe(0n);
  });
});

describe('formatLamports', () => {
  it('formats with full precision and trims trailing zeros by default', () => {
    expect(formatLamports(0n)).toBe('0');
    expect(formatLamports(1n)).toBe('0.000000001');
    expect(formatLamports(1_500_000_000n)).toBe('1.5');
    expect(formatLamports(890_880n)).toBe('0.00089088');
    expect(formatLamports(123_456_789_012n)).toBe('123.456789012');
  });

  it('keeps all 9 decimals when trim is false', () => {
    expect(formatLamports(1_500_000_000n, { trim: false })).toBe('1.500000000');
    expect(formatLamports(0n, { trim: false })).toBe('0.000000000');
  });

  it('handles negatives', () => {
    expect(formatLamports(-5000n)).toBe('-0.000005');
  });

  it('round-trips with parseSolToLamports', () => {
    for (const v of [0n, 1n, 5000n, 890_880n, 999_999_999n, 1_000_000_000n, 42_424_242_424n]) {
      expect(parseSolToLamports(formatLamports(v))).toBe(v);
    }
  });
});

describe('shortAddress', () => {
  it('shortens long addresses', () => {
    expect(shortAddress('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin')).toBe('9xQe…VFin');
  });

  it('leaves short strings alone', () => {
    expect(shortAddress('abc')).toBe('abc');
  });
});
