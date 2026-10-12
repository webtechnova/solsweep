import { describe, expect, it } from 'vitest';
import { UserFacingError, friendlyError, isExpiredError } from '@/lib/errors';

describe('friendlyError', () => {
  it('passes user-facing messages through unchanged', () => {
    expect(friendlyError(new UserFacingError('Custom message'))).toBe('Custom message');
  });

  it('recognises a rejected wallet request', () => {
    expect(friendlyError(new Error('User rejected the request.'))).toMatch(/rejected/i);
  });

  it('recognises rate limiting', () => {
    expect(friendlyError(new Error('429 Too Many Requests'))).toMatch(/NEXT_PUBLIC_RPC_URL/);
  });

  it('recognises an expired transaction', () => {
    const err = new Error('block height exceeded');
    err.name = 'TransactionExpiredBlockheightExceededError';
    expect(isExpiredError(err)).toBe(true);
    expect(friendlyError(err)).toMatch(/expired/i);
  });

  it('distinguishes the rent error from a plain insufficient funds error', () => {
    expect(friendlyError(new Error('insufficient funds for rent'))).toMatch(/too little SOL/i);
    expect(friendlyError(new Error('Attempt to debit an account but found no record'))).not.toMatch(
      /too little SOL/i,
    );
    expect(friendlyError(new Error('insufficient funds'))).toMatch(/not enough/i);
  });

  it('recognises network failures', () => {
    expect(friendlyError(new TypeError('Failed to fetch'))).toMatch(/network error/i);
  });

  it('falls back to a generic message', () => {
    expect(friendlyError(undefined)).toBe('Something went wrong. Please try again.');
    expect(friendlyError(new Error('weird'))).toContain('weird');
  });

  it('truncates very long unknown errors', () => {
    expect(friendlyError(new Error('x'.repeat(1_000))).length).toBeLessThan(260);
  });
});

describe('isExpiredError', () => {
  it('is false for unrelated errors and non-errors', () => {
    expect(isExpiredError(new Error('boom'))).toBe(false);
    expect(isExpiredError('block height exceeded')).toBe(false);
  });
});
