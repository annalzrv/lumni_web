'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type TaskStatus =
  | 'queued'
  | 'scraping_data'
  | 'analyzing_dna'
  | 'generating_briefs'
  | 'completed'
  | 'failed';

type BriefCard = {
  title?: string;
  highlight?: string;
  script?: string;
  cta?: string;
  [key: string]: unknown;
};

type StatusResponse = {
  status: TaskStatus;
  progress: number;
  result?: BriefCard[] | null;
  error_message?: string | null;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  queued: 'Task queued. Preparing your brief pipeline...',
  scraping_data: 'Collecting and structuring source data...',
  analyzing_dna: 'Analyzing brand DNA and audience fit...',
  generating_briefs: 'Generating polished creative options...',
  completed: 'Completed.',
  failed: 'Failed.',
};

const POLLING_INTERVAL_MS = 3000;

export default function TaskBriefPage() {
  const router = useRouter();
  const { taskId } = useParams<{ taskId: string }>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<TaskStatus>('queued');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BriefCard[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(true);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return;

    if (!process.env.NEXT_PUBLIC_AI_API_URL) {
      setStatus('failed');
      setErrorMessage('Missing NEXT_PUBLIC_AI_API_URL.');
      stopPolling();
      setIsInitialLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AI_API_URL}/api/status/${taskId}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' }
      );

      if (!res.ok) {
        throw new Error(`Status request failed (${res.status})`);
      }

      const data: StatusResponse = await res.json();
      setStatus(data.status);
      setProgress(Math.max(0, Math.min(100, data.progress ?? 0)));
      setResult((data.result as BriefCard[] | null) ?? null);
      setErrorMessage(data.error_message ?? null);

      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling();
      }
    } catch (err) {
      setStatus('failed');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not fetch task status. Please try again.'
      );
      stopPolling();
    } finally {
      setIsInitialLoading(false);
    }
  }, [taskId, stopPolling]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsPolling(true);
    void fetchStatus();
    intervalRef.current = setInterval(() => {
      void fetchStatus();
    }, POLLING_INTERVAL_MS);
  }, [fetchStatus]);

  useEffect(() => {
    startPolling();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startPolling]);

  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <main className="min-h-screen bg-[#F7F4EE]">
      <nav className="sticky top-0 z-10 bg-[#F7F4EE]/90 backdrop-blur border-b border-[#DDD9D0] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg text-[#0F0E0C] tracking-tight">
          Lumni<span className="text-[#E8431A]">.</span>
        </Link>
        <button
          onClick={() => router.push('/brief_generation')}
          className="text-sm font-medium text-[#8C8880] hover:text-[#0F0E0C] transition-colors"
        >
          ← New brief
        </button>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-xs font-semibold tracking-widest uppercase text-[#E8431A]">Task</p>
        <h1 className="mt-3 font-serif text-4xl font-normal tracking-tight text-[#0F0E0C] leading-tight">
          Brief Generation
        </h1>
        <p className="mt-2 text-sm text-[#8C8880] font-light break-all">Task ID: {taskId}</p>

        {!isCompleted && (
          <div className="mt-8 bg-white border border-[#DDD9D0] rounded-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[#3A3832]">{STATUS_LABELS[status]}</p>
              <p className="text-sm font-semibold text-[#0F0E0C]">{progress}%</p>
            </div>
            <div className="w-full h-2 bg-[#EEEAE2] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E8431A] transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-[#8C8880]">
              {isPolling ? 'Updating every 3 seconds.' : 'Polling stopped.'}
            </p>
          </div>
        )}

        {isInitialLoading && (
          <p className="mt-6 text-sm text-[#8C8880]">Loading task status...</p>
        )}

        {isFailed && (
          <div className="mt-8 bg-[#FFF0EC] border border-[#E8431A]/20 rounded-sm p-5">
            <p className="text-sm font-semibold text-[#A93417] mb-2">Generation failed</p>
            <p className="text-sm text-[#6D4A42]">
              {errorMessage ?? 'Something went wrong while generating briefs.'}
            </p>
            <button
              onClick={startPolling}
              className="mt-4 bg-[#0F0E0C] text-[#F7F4EE] text-sm font-semibold px-4 py-2.5 rounded-sm hover:bg-[#E8431A] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="mt-8">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#E8431A] mb-4">
              Generated Briefs
            </p>
            {Array.isArray(result) && result.length > 0 ? (
              <div className="space-y-4">
                {result.map((brief, index) => (
                  <article
                    key={`${brief.title ?? 'brief'}-${index}`}
                    className="bg-white border border-[#DDD9D0] rounded-sm p-6"
                  >
                    <h2 className="font-serif text-2xl text-[#0F0E0C] tracking-tight">
                      {brief.title ?? `Brief ${index + 1}`}
                    </h2>
                    {brief.highlight && (
                      <p className="mt-2 text-sm text-[#E8431A]">{brief.highlight}</p>
                    )}
                    {brief.script && (
                      <p className="mt-4 text-sm text-[#3A3832] leading-relaxed">{brief.script}</p>
                    )}
                    {brief.cta && (
                      <p className="mt-4 text-sm text-[#0F0E0C]">
                        <span className="font-semibold">CTA:</span> {brief.cta}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8C8880]">Completed, but no briefs were returned.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
