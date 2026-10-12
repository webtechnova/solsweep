import { SweepCard } from '@/components/SweepCard';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-10 sm:py-16">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">SolSweep</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Send your full SOL balance, nothing left behind.
        </p>
      </header>

      <SweepCard />

      <footer className="mt-8 text-center text-xs text-zinc-500">
        Open source. No keys. No backend.
      </footer>
    </main>
  );
}
