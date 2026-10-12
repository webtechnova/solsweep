/**
 * An error whose message is already written for the end user and can be shown as-is.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

/** True when the transaction's blockhash expired, i.e. it can never land on-chain. */
export function isExpiredError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.name === 'TransactionExpiredBlockheightExceededError' ||
    msg.includes('block height exceeded') ||
    msg.includes('blockhash not found')
  );
}

/** Turn any thrown value into a short, human-friendly message. */
export function friendlyError(err: unknown): string {
  if (err instanceof UserFacingError) return err.message;

  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const msg = raw.toLowerCase();
  const name = err instanceof Error ? err.name : '';

  if (
    msg.includes('user rejected') ||
    msg.includes('rejected the request') ||
    msg.includes('user denied') ||
    msg.includes('request was cancelled') ||
    msg.includes('request was canceled') ||
    msg.includes('declined')
  ) {
    return 'You rejected the request in your wallet. Nothing was sent.';
  }

  if (name === 'WalletNotConnectedError' || msg.includes('wallet not connected')) {
    return 'Your wallet is not connected. Connect it and try again.';
  }

  if (isExpiredError(err)) {
    return 'The transaction expired before it was confirmed and can no longer be processed. You can safely try again.';
  }

  if (msg.includes('429') || msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'The public RPC is rate-limiting requests. Wait a moment and retry, or set NEXT_PUBLIC_RPC_URL to your own RPC endpoint.';
  }

  if (msg.includes('insufficient funds for rent')) {
    return 'Solana rejected the transfer because it would leave too little SOL behind. Use MAX to send everything, or leave a larger remainder.';
  }

  if (msg.includes('insufficient funds') || msg.includes('insufficient lamports')) {
    return 'Your balance is not enough to cover the amount plus the network fee.';
  }

  if (msg.includes('failed to fetch') || msg.includes('fetch failed') || msg.includes('network request failed')) {
    return 'Network error while contacting the Solana RPC. Check your connection and try again.';
  }

  const detail = raw.trim().slice(0, 200);
  return detail ? `Something went wrong: ${detail}` : 'Something went wrong. Please try again.';
}
