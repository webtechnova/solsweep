# SolSweep

Connect a Solana wallet and send your **entire SOL balance** (balance minus the network fee) to another wallet, leaving exactly 0. Built with Next.js 14, TypeScript, Tailwind and the Solana Wallet Adapter. Deploys to Vercel with no server code.

> **Security model:** the app never asks for a private key or seed phrase. You approve every transfer inside your own wallet (Phantom, Solflare, Backpack and any Wallet Standard wallet). There is no backend, no database and no analytics. The only network calls are Solana RPC reads.

## Why a normal wallet refuses to send a tiny balance

Wallet apps reserve some SOL for fees and rent, so they won't let you send "everything". Solana itself is more flexible:

1. **A wallet can go to exactly 0.** After a transaction an account must hold either `0` lamports or at least the **rent-exempt minimum** (about `0.00089088 SOL` / 890,880 lamports for a normal wallet). Anything in between is rejected.
2. **The sender pays the fee from the same balance**, so the most you can send is `balance - fee`.
3. **A brand-new destination needs at least the rent-exempt minimum on its first deposit.** If the receiving wallet has never held SOL, you cannot send it less than about 0.00089 SOL. If your whole balance is smaller than that, first put a small amount into the new wallet (for example from an exchange), then run the sweep.

SolSweep implements these rules in [`lib/transfer.ts`](lib/transfer.ts) and blocks any transfer the network would reject, with a clear message instead of a cryptic failure.

## Quick start

```bash
npm install
cp .env.example .env.local     # keep NEXT_PUBLIC_SOLANA_NETWORK=devnet while testing
npm run dev                    # http://localhost:3000
```

Requires Node 18.18+ (Node 20 recommended, see `.nvmrc`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` in strict mode |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | Typecheck + lint + tests |

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet-beta` | `mainnet-beta` (real SOL) or `devnet` (test SOL) |
| `NEXT_PUBLIC_RPC_URL` | public cluster URL | Your own RPC endpoint (Helius, QuickNode, Alchemy, ...) |

`NEXT_PUBLIC_*` values are embedded in the browser bundle and are **public**. Never put a secret there. If your RPC provider gives you an API key, restrict that key to your site's domain in the provider dashboard. The free public RPC is rate-limited, so use your own endpoint for real use.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New... -> Project**, import the repository (framework is detected as Next.js).
3. Under **Environment Variables** add `NEXT_PUBLIC_SOLANA_NETWORK` (and optionally `NEXT_PUBLIC_RPC_URL`).
4. Click **Deploy**.
5. Environment variables are baked in at build time, so after changing one, **redeploy**.

## Test on devnet first (checklist)

Use a throwaway wallet. In Phantom/Solflare switch the wallet to **Devnet** (Settings -> Developer Settings -> Testnet Mode), and set `NEXT_PUBLIC_SOLANA_NETWORK=devnet`.

1. Get test SOL from <https://faucet.solana.com> for wallet A.
2. Connect wallet A. Paste wallet B's address. Press **MAX**, review, approve. Confirm wallet A ends at exactly `0` and wallet B received `balance - fee`.
3. Try MAX to an **empty** wallet C with a balance below 0.00089088 SOL: the app must block it with the "first deposit" message.
4. Try a custom amount that leaves a tiny remainder: the app must block it.
5. Try an invalid address, your own address, and rejecting the request in the wallet.
6. Test on a phone (Phantom / Solflare in-app browser).
7. Only then switch `NEXT_PUBLIC_SOLANA_NETWORK` to `mainnet-beta`, and try a small mainnet amount before a large one.

Your wallet app may warn that the transaction empties the account. That is expected when you send MAX.

## Project structure

```
app/
  layout.tsx, page.tsx, globals.css, icon.svg
  providers.tsx            Connection + Wallet providers
components/
  SweepCard.tsx            Main UI and form state
  ConfirmModal.tsx         Review dialog (numbers frozen before signing)
  StatusPanel.tsx          Progress / success / error panel
  WalletButton.tsx         Client-only wallet button
  NetworkBadge.tsx, SecurityNotice.tsx, CopyButton.tsx
hooks/
  useSolBalance.ts         Live balance via account subscription
  useNetworkCosts.ts       Fee + rent-exempt minimum
  useDestinationBalance.ts Debounced destination balance
  useSendSol.ts            Fresh re-validation, build, sign, confirm
lib/
  transfer.ts              Pure planning/validation rules (unit-tested)
  format.ts                bigint lamports <-> SOL strings
  solana.ts                Address parsing, tx builder, fee/rent/balance RPC helpers
  errors.ts                Friendly error messages
  config.ts                Network/RPC config, explorer links
tests/                     Vitest unit tests
```

## How it stays safe (design notes)

- **Integer math only.** All money is `bigint` lamports; SOL strings are parsed by string splitting, never floats.
- **One instruction.** The transaction contains a single `SystemProgram.transfer`. No priority fee, no tips, no extra instructions (asserted in `tests/solana.test.ts`). That is also what lets the fee be exactly the base fee so the wallet can reach 0.
- **Re-validate before signing.** `useSendSol` re-reads balances, fee and rent right before building the transaction and re-runs the same validation. If anything changed since you reviewed, it stops instead of sending something different.
- **Review step.** The confirm dialog shows From, To, Amount, Fee and Remaining, and the numbers are frozen when it opens.
- **No double submits.** A ref guard plus disabled controls while a send is in flight.
- **Never silent.** Errors are mapped to plain language and also logged with `console.error`.
- **Security headers.** CSP, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `nosniff`, HSTS and a restrictive Permissions-Policy (see `next.config.mjs`). The CSP allows `'unsafe-inline'` scripts because Next.js emits inline bootstrap scripts; move to a nonce-based CSP via middleware if you want to remove that.

## Known limitations

- **SOL only.** SPL tokens and NFTs are not moved, and their token accounts keep their own rent. Move those with your wallet first if you need them.
- If the sender wallet owns other accounts or holds token accounts, the wallet itself is still a normal account and can be emptied, but the tokens will be stranded unless moved first.
- Public RPC endpoints are rate-limited; configure `NEXT_PUBLIC_RPC_URL` for reliability.
- Wallet-specific behavior (warnings, simulation) varies between Phantom, Solflare and others.
- Unit tests cover the money math, validation rules, transaction shape and error mapping. The wallet connection and a real on-chain transfer must be verified manually with the devnet checklist above.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "The public RPC is rate-limiting requests" | Set `NEXT_PUBLIC_RPC_URL` to your own endpoint and redeploy. |
| "The destination wallet is empty..." | The new wallet needs a first deposit of at least ~0.00089 SOL. Fund it from an exchange or another wallet first. |
| "This would leave X behind..." | Use **MAX**, or send less so at least ~0.00089 SOL stays. |
| Wallet button does nothing | Install Phantom/Solflare, unlock it, refresh the page. |
| Network badge shows the wrong network | Fix `NEXT_PUBLIC_SOLANA_NETWORK` and redeploy (it is read at build time). |
