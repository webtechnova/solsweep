export function SecurityNotice() {
  return (
    <aside
      className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-400"
      aria-label="Security notice"
    >
      <p>
        <span className="font-semibold text-zinc-200">This site never asks for your private key or seed phrase.</span>{' '}
        If any site asks for it, close it. You approve every transfer inside your own wallet.
      </p>
    </aside>
  );
}
