'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BriefGenerationPage() {
  const router = useRouter();
  const [primaryHandle, setPrimaryHandle] = useState('');
  const [secondaryHandle, setSecondaryHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let redirected = false;

    try {
      if (!process.env.NEXT_PUBLIC_AI_API_URL) {
        throw new Error('Missing NEXT_PUBLIC_AI_API_URL');
      }

      const requestBody = {
        primary_handle: primaryHandle.replace('@', '').trim(),
        secondary_handle: secondaryHandle.replace('@', '').trim(),
        campaign_type: 'cross_marketing',
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AI_API_URL}/api/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('POST /api/generate failed', {
          status: res.status,
          statusText: res.statusText,
          requestBody,
          responseBody: errorText,
        });
        throw new Error(`Server error: ${res.status}`);
      }

      const { task_id } = await res.json();
      if (!task_id) {
        throw new Error('Missing task_id in response');
      }

      redirected = true;
      router.push(`/brief/${task_id}`);
    } catch (err) {
      console.error('Generate request crashed', err);
      setError('Our AI agents are currently resting. Please try again later.');
    } finally {
      if (!redirected) {
        setLoading(false);
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F4EE] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm font-medium text-[#8C8880] hover:text-[#0F0E0C] transition-colors">
            ← Lumni
          </Link>
          <h1 className="mt-6 font-serif text-4xl font-normal tracking-tight text-[#0F0E0C] leading-tight">
            Create a<br />
            <span className="italic text-[#E8431A]">Collab Brief.</span>
          </h1>
          <p className="mt-3 text-sm text-[#8C8880] leading-relaxed font-light">
            Enter two Instagram handles and Lumni's AI will generate a ready-to-shoot creative brief for your collaboration.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Primary handle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold tracking-widest uppercase text-[#8C8880]">
              Brand / Business
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8880] text-sm select-none">
                @
              </span>
              <input
                type="text"
                value={primaryHandle}
                onChange={(e) => setPrimaryHandle(e.target.value)}
                placeholder="yourbrand"
                required
                disabled={loading}
                className="
                  w-full bg-white border border-[#DDD9D0] rounded-sm
                  pl-8 pr-4 py-3.5 text-sm text-[#0F0E0C] placeholder-[#8C8880]
                  outline-none transition-colors
                  focus:border-[#E8431A]
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              />
            </div>
          </div>

          {/* Secondary handle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold tracking-widest uppercase text-[#8C8880]">
              Collaborator / Creator
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8880] text-sm select-none">
                @
              </span>
              <input
                type="text"
                value={secondaryHandle}
                onChange={(e) => setSecondaryHandle(e.target.value)}
                placeholder="creatorhandle"
                required
                disabled={loading}
                className="
                  w-full bg-white border border-[#DDD9D0] rounded-sm
                  pl-8 pr-4 py-3.5 text-sm text-[#0F0E0C] placeholder-[#8C8880]
                  outline-none transition-colors
                  focus:border-[#E8431A]
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-[#E8431A] bg-[#FFF0EC] border border-[#E8431A]/20 rounded-sm px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !primaryHandle.trim() || !secondaryHandle.trim()}
            className="
              w-full mt-2 bg-[#0F0E0C] text-[#F7F4EE]
              py-3.5 px-6 rounded-sm text-sm font-semibold
              flex items-center justify-center gap-2.5
              transition-colors
              hover:bg-[#E8431A]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0F0E0C]
            "
          >
            {loading ? (
              <>
                <Spinner />
                Thinking…
              </>
            ) : (
              'Generate Magic ✦'
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="mt-6 text-xs text-[#8C8880] text-center font-light">
          Generation takes about 30 seconds. Three brief options will be ready for you.
        </p>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
