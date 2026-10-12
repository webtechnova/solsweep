'use client';

import dynamic from 'next/dynamic';

// The wallet-adapter button reads browser-only state, so it must not render on the server.
export const WalletButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  {
    ssr: false,
    loading: () => (
      <div className="h-11 w-40 animate-pulse rounded-xl bg-zinc-800" aria-hidden="true" />
    ),
  },
);
