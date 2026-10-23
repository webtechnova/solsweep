'use client';

import { useEffect, useMemo, useState } from 'react';
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Wallet } from '@solana/wallet-adapter-react';
import {
  inAppBrowseUrl,
  isMobileBrowser,
  syncInjectedWallets,
  type InjectedWallets,
} from '@/lib/injectedWallets';

const PREFERRED = ['Phantom', 'Solflare', 'Backpack'];

function isAvailable(wallet: Wallet, injected: InjectedWallets): boolean {
  if (wallet.readyState === WalletReadyState.Installed) return true;
  if (wallet.adapter.name === 'Phantom') return injected.phantom;
  if (wallet.adapter.name === 'Solflare') return injected.solflare;
  if (wallet.adapter.name === 'Backpack') return injected.backpack;
  return false;
}

export function WalletButton() {
  const { wallets, select, connected, connecting, disconnect, wallet } = useWallet();
  const [open, setOpen] = useState(false);
  const [injected, setInjected] = useState<InjectedWallets>({
    phantom: false,
    solflare: false,
    backpack: false,
  });

  useEffect(() => {
    const tick = () => setInjected(syncInjectedWallets());
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);

  const options = useMemo(() => {
    const seen = new Set<string>();
    const unique = wallets.filter((item) => {
      if (seen.has(item.adapter.name)) return false;
      seen.add(item.adapter.name);
      return true;
    });
    const preferred = PREFERRED.map((name) => unique.find((item) => item.adapter.name === name)).filter(
      (item): item is Wallet => Boolean(item),
    );
    const extras = unique.filter(
      (item) =>
        !PREFERRED.includes(item.adapter.name) && item.readyState === WalletReadyState.Installed,
    );
    return [...preferred, ...extras].sort(
      (a, b) => Number(isAvailable(b, injected)) - Number(isAvailable(a, injected)),
    );
  }, [wallets, injected]);

  function choose(item: Wallet) {
    const found = syncInjectedWallets();
    setInjected(found);
    const available = isAvailable(item, found) || item.readyState === WalletReadyState.Installed;
    if (available) {
      select(item.adapter.name as WalletName);
      setOpen(false);
      return;
    }
    const mobile = isMobileBrowser(window.navigator.userAgent);
    const browse = mobile ? inAppBrowseUrl(item.adapter.name, window.location.href, window.location.origin) : null;
    if (browse) {
      window.location.href = browse;
      return;
    }
    // Desktop without the extension: Solflare can still connect through its web popup.
    if (item.readyState === WalletReadyState.Loadable) {
      select(item.adapter.name as WalletName);
      setOpen(false);
      return;
    }
    window.open(item.adapter.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      {connected ? (
        <button type="button" className="btn-secondary" onClick={() => void disconnect()} disabled={connecting}>
          Disconnect{wallet ? ` ${wallet.adapter.name}` : ''}
        </button>
      ) : (
        <button type="button" className="btn-primary" onClick={() => setOpen(true)} disabled={connecting}>
          {connecting ? 'Connecting…' : 'Connect wallet'}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-picker-title"
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="wallet-picker-title" className="text-lg font-semibold">
              Choose a wallet
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Installed extensions and the in-app wallet browser are marked Available. Signing still happens
              inside that wallet.
            </p>
            <ul className="mt-4 space-y-2">
              {options.map((item) => {
                const available = isAvailable(item, injected);
                return (
                  <li key={item.adapter.name}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-left hover:border-violet-500"
                      onClick={() => choose(item)}
                    >
                      <span className="font-semibold">{item.adapter.name}</span>
                      <span className={available ? 'text-xs font-semibold text-emerald-300' : 'text-xs text-zinc-500'}>
                        {available ? 'Available' : 'Open app'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="btn-secondary mt-4 w-full" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
