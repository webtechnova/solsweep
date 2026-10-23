/**
 * What a browser extension or a wallet's in-app browser actually injects.
 * The official Phantom adapter also requires `isPhantomInstalled`, which those
 * environments often leave unset, so the connect list treats the wallet as missing.
 */
export interface WalletGlobals {
  isPhantomInstalled?: boolean;
  phantom?: { solana?: { isPhantom?: boolean } };
  solana?: { isPhantom?: boolean; isSolflare?: boolean; isBackpack?: boolean };
  solflare?: { isSolflare?: boolean };
  backpack?: { isBackpack?: boolean };
}

export interface InjectedWallets {
  phantom: boolean;
  solflare: boolean;
  backpack: boolean;
}

const NONE: InjectedWallets = { phantom: false, solflare: false, backpack: false };

export function readInjected(scope: WalletGlobals | undefined): InjectedWallets {
  if (!scope) return NONE;
  return {
    phantom: Boolean(scope.phantom?.solana?.isPhantom || scope.solana?.isPhantom),
    solflare: Boolean(scope.solflare?.isSolflare || scope.solana?.isSolflare),
    backpack: Boolean(scope.backpack?.isBackpack || scope.solana?.isBackpack),
  };
}

/** Tell the stock Phantom adapter that its provider is already on the page. */
export function applyDetectionFlags(scope: WalletGlobals | undefined): InjectedWallets {
  const found = readInjected(scope);
  if (scope && found.phantom) scope.isPhantomInstalled = true;
  return found;
}

export function syncInjectedWallets(): InjectedWallets {
  if (typeof window === 'undefined') return NONE;
  return applyDetectionFlags(window as WalletGlobals);
}

export function isMobileBrowser(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

/** Open this page inside the wallet app. URLs match the official adapters. */
export function inAppBrowseUrl(name: string, pageUrl: string, origin: string): string | null {
  const url = encodeURIComponent(pageUrl);
  const ref = encodeURIComponent(origin);
  if (name === 'Phantom') return `https://phantom.app/ul/browse/${url}?ref=${ref}`;
  if (name === 'Solflare') return `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
  return null;
}
