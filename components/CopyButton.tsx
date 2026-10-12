'use client';

import { useEffect, useRef, useState } from 'react';

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn('Clipboard unavailable', err);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="btn-chip bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
      aria-label={`${label} address`}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
