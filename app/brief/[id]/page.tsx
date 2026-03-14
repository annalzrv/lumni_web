'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase client ───────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ─────────────────────────────────────────────────────────────────────
type BriefStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Brief {
  id: string;
  status: BriefStatus;
  primary_handle: string;
  secondary_handle: string;
  generated_content: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

// ─── Loading messages ──────────────────────────────────────────────────────────
const LOADING_MESSAGES = [
  'AI is mixing brand DNAs…',
  'Analyzing audience overlap…',
  'Crafting hook options…',
  'Writing scene structure…',
  'Aligning tones and styles…',
  'Running quality check…',
  'Almost there…',
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function BriefResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [brief, setBrief] = useState<Brief | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [visible, setVisible] = useState(true); // for fade transition on complete

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchBrief() {
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }
      setBrief(data as Brief);
    }

    fetchBrief();
  }, [id]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`brief-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'briefs',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setBrief((prev) =>
            prev ? { ...prev, ...(payload.new as Brief) } : (payload.new as Brief)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // ── Rotate loading messages ───────────────────────────────────────────────
  useEffect(() => {
    if (brief?.status === 'pending' || brief?.status === 'processing') {
      const interval = setInterval(() => {
        setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
      }, 2800);
      return () => clearInterval(interval);
    }
  }, [brief?.status]);

  // ── Fade out loader when completed ────────────────────────────────────────
  useEffect(() => {
    if (brief?.status === 'completed') {
      setVisible(false);
    }
  }, [brief?.status]);

  // ── Not found ─────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <ErrorScreen
        title="Brief not found."
        message="This brief ID doesn't exist or may have expired."
        onBack={() => router.push('/brief_generation')}
      />
    );
  }

  // ── Initial load (no data yet) ────────────────────────────────────────────
  if (!brief) {
    return <LoadingScreen message="Loading…" showBack={false} />;
  }

  // ── Failed ────────────────────────────────────────────────────────────────
  if (brief.status === 'failed') {
    return (
      <ErrorScreen
        title="Generation failed."
        message={brief.error_message ?? 'Something went wrong on our end. Please try again.'}
        onBack={() => router.push('/brief_generation')}
      />
    );
  }

  // ── Pending / Processing ──────────────────────────────────────────────────
  if (brief.status === 'pending' || brief.status === 'processing') {
    return (
      <LoadingScreen
        message={LOADING_MESSAGES[messageIndex]}
        handles={[brief.primary_handle, brief.secondary_handle]}
        showBack
        onBack={() => router.push('/brief_generation')}
      />
    );
  }

  // ── Completed ─────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#F7F4EE]">

      {/* Nav */}
      <nav className="sticky top-0 z-10 bg-[#F7F4EE]/90 backdrop-blur border-b border-[#DDD9D0] px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-serif text-lg text-[#0F0E0C] tracking-tight">
          Lumni<span className="text-[#E8431A]">.</span>
        </a>
        <button
          onClick={() => router.push('/brief_generation')}
          className="text-sm font-medium text-[#8C8880] hover:text-[#0F0E0C] transition-colors"
        >
          ← New brief
        </button>
      </nav>

      <div
        className="max-w-3xl mx-auto px-6 py-14 transition-opacity duration-700"
        style={{ opacity: visible ? 0 : 1 }}
      >
        {/* Header */}
        <div className="mb-10 pb-10 border-b border-[#DDD9D0]">
          <span className="text-xs font-semibold tracking-widest uppercase text-[#E8431A]">
            — Collab Brief
          </span>
          <h1 className="mt-3 font-serif text-4xl font-normal tracking-tight text-[#0F0E0C] leading-tight">
            @{brief.primary_handle} <span className="text-[#8C8880] font-light">×</span>{' '}
            @{brief.secondary_handle}
          </h1>
          <p className="mt-2 text-sm text-[#8C8880] font-light">
            Generated · {new Date(brief.created_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>

        {/* Content */}
        {brief.generated_content ? (
          <BriefContent content={brief.generated_content} />
        ) : (
          <p className="text-sm text-[#8C8880]">No content returned.</p>
        )}
      </div>
    </main>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LoadingScreen({
  message,
  handles,
  showBack,
  onBack,
}: {
  message: string;
  handles?: [string, string];
  showBack: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col items-center justify-center px-4 text-center">

      {/* Pulsing orb */}
      <div className="relative mb-10">
        <div className="w-20 h-20 rounded-full bg-[#E8431A] opacity-10 animate-ping absolute inset-0" />
        <div className="w-20 h-20 rounded-full bg-[#E8431A] opacity-20 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">✦</span>
        </div>
      </div>

      {/* Handles */}
      {handles && (
        <p className="text-xs font-semibold tracking-widest uppercase text-[#8C8880] mb-4">
          @{handles[0]} × @{handles[1]}
        </p>
      )}

      {/* Rotating message */}
      <p
        key={message}
        className="font-serif text-2xl font-normal text-[#E8431A] italic tracking-tight animate-pulse"
      >
        {message}
      </p>

      <p className="mt-3 text-sm text-[#8C8880] font-light">
        This usually takes about 30 seconds.
      </p>

      {showBack && onBack && (
        <button
          onClick={onBack}
          className="mt-10 text-xs text-[#8C8880] hover:text-[#0F0E0C] transition-colors underline underline-offset-4"
        >
          Cancel and go back
        </button>
      )}
    </div>
  );
}

function ErrorScreen({
  title,
  message,
  onBack,
}: {
  title: string;
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold tracking-widest uppercase text-[#E8431A] mb-4">Error</p>
      <h2 className="font-serif text-3xl font-normal text-[#0F0E0C] tracking-tight mb-3">
        {title}
      </h2>
      <p className="text-sm text-[#8C8880] font-light max-w-sm leading-relaxed mb-8">
        {message}
      </p>
      <button
        onClick={onBack}
        className="bg-[#0F0E0C] text-[#F7F4EE] text-sm font-semibold px-6 py-3 rounded-sm hover:bg-[#E8431A] transition-colors"
      >
        ← Try again
      </button>
    </div>
  );
}

function BriefContent({ content }: { content: Record<string, unknown> }) {
  // If the API returns structured fields, render them as cards.
  // Falls back to a formatted JSON block for any unknown shape.
  const knownKeys = ['hook', 'scene_1', 'scene_2', 'scene_3', 'cta', 'donts', 'key_message', 'tone'];
  const hasStructured = knownKeys.some((k) => k in content);

  if (hasStructured) {
    return (
      <div className="space-y-4">
        {knownKeys.map((key) => {
          const value = content[key];
          if (value === undefined || value === null) return null;
          return (
            <div
              key={key}
              className="bg-white border border-[#DDD9D0] rounded-sm p-5"
            >
              <p className="text-xs font-bold tracking-widest uppercase text-[#E8431A] mb-2">
                {key.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-[#3A3832] leading-relaxed font-light">
                {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              </p>
            </div>
          );
        })}

        {/* Remaining unknown keys */}
        {Object.entries(content)
          .filter(([k]) => !knownKeys.includes(k))
          .map(([key, value]) => (
            <div
              key={key}
              className="bg-white border border-[#DDD9D0] rounded-sm p-5"
            >
              <p className="text-xs font-bold tracking-widest uppercase text-[#E8431A] mb-2">
                {key.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-[#3A3832] leading-relaxed font-light">
                {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              </p>
            </div>
          ))}
      </div>
    );
  }

  // Fallback: raw JSON
  return (
    <pre className="bg-white border border-[#DDD9D0] rounded-sm p-6 text-xs text-[#3A3832] leading-relaxed overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}
