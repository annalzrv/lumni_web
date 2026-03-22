'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SelectedContent() {
  const searchParams = useSearchParams();
  const chosenType = searchParams.get('type');

  return (
    <main className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <nav className="sticky top-0 z-10 bg-[#F7F4EE]/90 backdrop-blur border-b border-[#DDD9D0] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg text-[#0F0E0C] tracking-tight">
          Lumni<span className="text-[#E8431A]">.</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-[#E8431A]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#E8431A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="font-serif text-4xl font-normal tracking-tight text-[#0F0E0C] leading-tight">
            Brief selected
          </h1>
          <p className="mt-3 text-lg text-[#8C8880] font-light">Thank you!</p>

          {chosenType && (
            <p className="mt-4 text-sm text-[#3A3832]">
              You chose: <span className="font-semibold text-[#0F0E0C]">{chosenType}</span>
            </p>
          )}

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/brief_generation"
              className="px-6 py-3 text-sm font-semibold rounded-sm bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#E8431A] transition-colors"
            >
              New brief
            </Link>
            <Link
              href="/"
              className="px-6 py-3 text-sm font-semibold rounded-sm border border-[#DDD9D0] text-[#3A3832] hover:border-[#0F0E0C] transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function BriefSelectedPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F7F4EE] flex items-center justify-center">
        <p className="text-sm text-[#8C8880]">Loading...</p>
      </main>
    }>
      <SelectedContent />
    </Suspense>
  );
}
