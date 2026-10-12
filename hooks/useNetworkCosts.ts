'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { friendlyError } from '@/lib/errors';
import { estimateFee, getRentExemptMinimum, withRetry } from '@/lib/solana';

/**
 * Network fee and rent-exempt minimum, both in lamports.
 * Both are effectively constants on a given cluster, so they are fetched once per
 * connected wallet (and on demand via `reload`).
 */
export function useNetworkCosts() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [fee, setFee] = useState<bigint | null>(null);
  const [rentMin, setRentMin] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!publicKey) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const [nextFee, nextRent] = await Promise.all([
        withRetry(() => estimateFee(connection, publicKey, publicKey)),
        withRetry(() => getRentExemptMinimum(connection)),
      ]);
      if (id !== requestId.current) return; // a newer request superseded this one
      setFee(nextFee);
      setRentMin(nextRent);
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('Failed to load network costs', err);
      setError(friendlyError(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    setFee(null);
    setRentMin(null);
    setError(null);
    if (!publicKey) {
      requestId.current++;
      return;
    }
    void reload();
  }, [publicKey, reload]);

  return { fee, rentMin, loading, error, reload };
}
