import { describe, expect, it } from 'vitest';
import {
  applyDetectionFlags,
  inAppBrowseUrl,
  isMobileBrowser,
  readInjected,
  type WalletGlobals,
} from '@/lib/injectedWallets';

describe('readInjected', () => {
  it('sees Phantom from the extension or the in-app browser without isPhantomInstalled', () => {
    expect(readInjected({ phantom: { solana: { isPhantom: true } } }).phantom).toBe(true);
    expect(readInjected({ solana: { isPhantom: true } }).phantom).toBe(true);
    expect(readInjected({}).phantom).toBe(false);
  });

  it('sees Solflare and Backpack from either injection point', () => {
    expect(readInjected({ solana: { isSolflare: true } }).solflare).toBe(true);
    expect(readInjected({ solflare: { isSolflare: true } }).solflare).toBe(true);
    expect(readInjected({ backpack: { isBackpack: true } }).backpack).toBe(true);
    expect(readInjected({ solana: { isBackpack: true } }).backpack).toBe(true);
  });
});

describe('applyDetectionFlags', () => {
  it('sets the flag Phantom adapter polling requires', () => {
    const scope: WalletGlobals = { phantom: { solana: { isPhantom: true } } };
    applyDetectionFlags(scope);
    expect(scope.isPhantomInstalled).toBe(true);
  });

  it('does not set the flag when Phantom is absent', () => {
    const scope: WalletGlobals = { solflare: { isSolflare: true } };
    applyDetectionFlags(scope);
    expect(scope.isPhantomInstalled).toBeUndefined();
  });
});

describe('in-app browser links', () => {
  it('recognises a phone browser', () => {
    expect(isMobileBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isMobileBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
  });

  it('builds the Phantom and Solflare browse links used by their adapters', () => {
    expect(inAppBrowseUrl('Phantom', 'https://solsweep.vercel.app/', 'https://solsweep.vercel.app')).toBe(
      'https://phantom.app/ul/browse/https%3A%2F%2Fsolsweep.vercel.app%2F?ref=https%3A%2F%2Fsolsweep.vercel.app',
    );
    expect(inAppBrowseUrl('Solflare', 'https://solsweep.vercel.app/', 'https://solsweep.vercel.app')).toContain(
      'https://solflare.com/ul/v1/browse/',
    );
    expect(inAppBrowseUrl('Backpack', 'https://solsweep.vercel.app/', 'https://solsweep.vercel.app')).toBeNull();
  });
});
