'use client';

import { useCallback, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { PublicKey } from '@solana/web3.js';
import { UserFacingError, friendlyError, isExpiredError } from '@/lib/errors';
import {
  buildTransferTx,
  estimateFee,
  getBalanceLamports,
  getRentExemptMinimum,
} from '@/lib/solana';
import { planTransfer } from '@/lib/transfer';

export type SendPhase = 'idle' | 'preparing' | 'approving' | 'confirming' | 'done' | 'error';

export interface SendIntent {
  destination: PublicKey;
  /** Exact lamports the user confirmed in the review dialog. */
  amount: bigint;
}

export function useSendSol() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [phase, setPhase] = useState<SendPhase>('idle');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false); // guards against double-submits

  const reset = useCallback(() => {
    if (inFlight.current) return;
    setPhase('idle');
    setSignature(null);
    setError(null);
  }, []);

  const send = useCallback(
    async ({ destination, amount }: SendIntent) => {
      if (inFlight.current) return;
      if (!publicKey) {
        setError('Your wallet is not connected. Connect it and try again.');
        setPhase('error');
        return;
      }

      inFlight.current = true;
      setError(null);
      setSignature(null);
      setPhase('preparing');

      let sentSignature: string | null = null;
      try {
        // 1. Re-read everything fresh. What the user reviewed may be a few seconds old.
        const [balance, destBalance, rentMin, fee] = await Promise.all([
          getBalanceLamports(connection, publicKey),
          getBalanceLamports(connection, destination),
          getRentExemptMinimum(connection),
          estimateFee(connection, publicKey, destination),
        ]);

        // 2. Re-validate with the same rules the UI used. Fail closed.
        const plan = planTransfer({ balance, fee, rentMin, destBalance, amount });
        if (!plan.ok) {
          throw new UserFacingError(`Balances changed since you reviewed this. ${plan.message}`);
        }

        // 3. Build the single-instruction transfer with a fresh blockhash.
        const latest = await connection.getLatestBlockhashAndContext('confirmed');
        const tx = buildTransferTx(publicKey, destination, plan.amount, latest.value);

        // 4. The wallet shows its own approval prompt, signs and submits.
        setPhase('approving');
        sentSignature = await sendTransaction(tx, connection, {
          minContextSlot: latest.context.slot,
        });
        setSignature(sentSignature);

        // 5. Wait for the cluster to confirm it.
        setPhase('confirming');
        const result = await connection.confirmTransaction(
          {
            signature: sentSignature,
            blockhash: latest.value.blockhash,
            lastValidBlockHeight: latest.value.lastValidBlockHeight,
          },
          'confirmed',
        );
        if (result.value.err) {
          throw new UserFacingError(
            `The transaction was rejected by the network: ${JSON.stringify(result.value.err)}`,
          );
        }
        setPhase('done');
      } catch (err) {
        console.error('Send failed', err);
        let message = friendlyError(err);
        // If we already have a signature the transaction may still land; don't invite a blind retry.
        if (sentSignature && !isExpiredError(err) && !(err instanceof UserFacingError)) {
          message += ' The transaction may still have gone through, so check the explorer before retrying.';
        }
        setError(message);
        setPhase('error');
      } finally {
        inFlight.current = false;
      }
    },
    [connection, publicKey, sendTransaction],
  );

  return { phase, signature, error, send, reset };
}
