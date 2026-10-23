'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { RPC_URL } from '@/lib/config';
import { syncInjectedWallets } from '@/lib/injectedWallets';

export function Providers({ children }: { children: ReactNode }) {
  // Legacy adapters only. Wallet Standard wallets (including a second copy of
  // Phantom, Solflare, or Backpack) are merged in by WalletProvider.
  // Sync the Phantom install flag first so an extension or in-app browser
  // that already injected `window.phantom.solana` is not reported as missing.
  const wallets = useMemo(() => {
    syncInjectedWallets();
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new BackpackWalletAdapter()];
  }, []);

  useEffect(() => {
    const id = window.setInterval(syncInjectedWallets, 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <ConnectionProvider endpoint={RPC_URL} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
