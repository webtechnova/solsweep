'use client';

import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { friendlyError } from '@/lib/errors';
import { getBalanceLamports, withRetry } from '@/lib/solana';

const DEBOUNCE_MS = 400;

/**
 * Balance (lamports) of the destination address, debounced so we don't hit the RPC
 * on every keystroke. A balance of 0n means the account doesn't exist yet.
 */
export function useDestinationBalance(destination: PublicKey | null) {
  const { connection } = useConnection();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = destination ? destination.toBase58() : null;

  useEffect(() => {
    setBalance(null);
    setError(null);
    if (!key) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const result = await withRetry(() => getBalanceLamports(connection, new PublicKey(key)));
        if (!cancelled) setBalance(result);
      } catch (err) {
        console.error('Failed to load destination balance', err);
        if (!cancelled) setError(friendlyError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [connection, key]);

  return { balance, loading, error };
}
