'use client';

import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { friendlyError } from '@/lib/errors';
import { getBalanceLamports, withRetry } from '@/lib/solana';

/**
 * Live SOL balance (in lamports) of the connected wallet.
 * Loads once on connect, then stays current via an account subscription.
 */
export function useSolBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    setError(null);
    try {
      setBalance(await withRetry(() => getBalanceLamports(connection, publicKey)));
    } catch (err) {
      console.error('Failed to load balance', err);
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    setBalance(null);
    setError(null);
    if (!publicKey) return;

    let cancelled = false;
    void refresh();

    let subscriptionId: number | null = null;
    try {
      subscriptionId = connection.onAccountChange(
        publicKey,
        (info) => {
          if (!cancelled) setBalance(BigInt(info.lamports));
        },
        'confirmed',
      );
    } catch (err) {
      // Live updates are a nicety; the manual refresh button still works.
      console.warn('Could not subscribe to balance changes', err);
    }

    return () => {
      cancelled = true;
      if (subscriptionId !== null) {
        connection.removeAccountChangeListener(subscriptionId).catch(() => undefined);
      }
    };
  }, [connection, publicKey, refresh]);

  return { balance, loading, error, refresh };
}
