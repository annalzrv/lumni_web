'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getApiBaseUrl } from '@/lib/apiBaseUrl';

type TaskStatus =
  | 'queued'
  | 'scraping_data'
  | 'analyzing_dna'
  | 'generating_briefs'
  | 'completed'
  | 'failed';

type BriefScene = {
  scene?: number;
  act?: string;
  timing?: string;
  action?: string;
  dialogue?: string;
  visual_direction?: string;
};

type BriefCard = {
  brief_type?: string;
  title?: string;
  highlight?: string;
  hook?: string;
  scenes?: BriefScene[];
  caption?: string;
  cta?: string;
  visual_style?: string;
  duration?: string;
  script?: string;
  nostalgia_trigger?: string | null;
  belonging_signal?: string | null;
  hype_mechanic?: string | null;
  social_currency_element?: string | null;
  opening_conflict?: string | null;
  rage_level?: string | null;
  loss_aversion_frame?: string | null;
  anchor_value?: string | null;
  social_proof_stack?: string | null;
  [key: string]: unknown;
};

type GenerateResult = {
  brief_id: string;
  briefs: BriefCard[];
};

type StatusResponse = {
  status: TaskStatus;
  progress: number;
  result?: GenerateResult | null;
  error_message?: string | null;
};

type BriefSourceType = 'relatable' | 'viral' | 'bold' | 'custom';

const POLLING_INTERVAL_MS = 3000;

const LOADING_STEPS: {
  status: TaskStatus;
  label: string;
  heading: string;
  subtitle: string;
  hint?: string;
}[] = [
  {
    status: 'queued',
    label: 'Queue',
    heading: 'Getting your request ready.',
    subtitle: 'Just a moment while we set things up.',
  },
  {
    status: 'scraping_data',
    label: 'Profiles',
    heading: 'Agents are analyzing profiles.',
    subtitle: 'Looking at recent posts.',
    hint: 'This may take up to 30 seconds.',
  },
  {
    status: 'analyzing_dna',
    label: 'Fit',
    heading: 'Analyzing the fit.',
    subtitle: 'Looking at audience overlap, content tone, and what has worked for them before.',
  },
  {
    status: 'generating_briefs',
    label: 'Briefs',
    heading: 'Writing the briefs.',
    subtitle: 'Generating three distinct creative directions based on both profiles.',
    hint: 'This is the longest part — usually 30–50 seconds.',
  },
];

const LOADING_STEP_ORDER: TaskStatus[] = ['queued', 'scraping_data', 'analyzing_dna', 'generating_briefs'];

const BRIEF_TYPE_LABELS: Record<string, string> = {
  relatable: 'Relatable',
  viral: 'Viral',
  bold: 'Bold',
};

const INDEX_FALLBACK_TYPES: BriefSourceType[] = ['relatable', 'viral', 'bold'];

function getBriefTypeKey(brief: BriefCard, index: number): BriefSourceType {
  if (brief.brief_type && brief.brief_type in BRIEF_TYPE_LABELS) {
    return brief.brief_type as BriefSourceType;
  }
  const titleLower = (brief.title ?? '').toLowerCase();
  if (titleLower in BRIEF_TYPE_LABELS) return titleLower as BriefSourceType;
  return INDEX_FALLBACK_TYPES[index] ?? 'relatable';
}

function getBriefLabel(brief: BriefCard, index: number): string {
  const key = getBriefTypeKey(brief, index);
  return BRIEF_TYPE_LABELS[key] ?? key;
}

function BriefLoadingScreen({
  status,
  progress,
  isInitialLoading,
}: {
  status: TaskStatus;
  progress: number;
  isInitialLoading: boolean;
}) {
  const rawIndex = LOADING_STEP_ORDER.indexOf(status);
  const stepIndex = rawIndex === -1 ? 0 : rawIndex;

  return (
    <div
      className="flex flex-col px-6 py-12 w-full max-w-sm"
      role="status"
      aria-live="polite"
      aria-busy
    >
      <p className="text-xs font-semibold tracking-widest uppercase text-[#E8431A] mb-8">
        {isInitialLoading ? 'Connecting…' : 'Generating'}
      </p>

      {/* Vertical stepper */}
      <div className="flex flex-col">
        {LOADING_STEPS.map((s, i) => {
          const isDone = i < stepIndex;
          const isActive = i === stepIndex;
          const isPending = i > stepIndex;
          const isLast = i === LOADING_STEPS.length - 1;

          return (
            <div key={s.status} className="flex gap-4">
              {/* Left column: circle + connector line */}
              <div className="flex flex-col items-center">
                {/* Circle */}
                <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
                  {isDone && (
                    <div className="w-8 h-8 rounded-full bg-[#0F0E0C] flex items-center justify-center">
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden>
                        <path d="M1 4L4.5 7.5L11 1" stroke="#F7F4EE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  {isActive && (
                    <>
                      <div className="absolute w-8 h-8 rounded-full border-2 border-[#E8431A] animate-ping opacity-30 motion-reduce:hidden" />
                      <div className="w-8 h-8 rounded-full border-2 border-[#E8431A] flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#E8431A]" />
                      </div>
                    </>
                  )}
                  {isPending && (
                    <div className="w-8 h-8 rounded-full border border-[#DDD9D0]" />
                  )}
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div className={`w-px flex-1 my-1 transition-colors duration-500 ${isDone ? 'bg-[#0F0E0C]' : 'bg-[#DDD9D0]'}`} />
                )}
              </div>

              {/* Right column: text */}
              <div className={`pb-8 pt-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm font-semibold leading-snug transition-colors duration-300 ${
                  isActive ? 'text-[#E8431A]' : isDone ? 'text-[#0F0E0C]' : 'text-[#C8C4BC]'
                }`}>
                  {s.heading}
                </p>
                {(isActive || isDone) && s.subtitle && (
                  <p className="mt-1 text-xs text-[#8C8880] leading-relaxed">{s.subtitle}</p>
                )}
                {isActive && s.hint && (
                  <p className="mt-1.5 text-xs text-[#C8C4BC]">{s.hint}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-8 w-full h-[3px] bg-[#EEEAE2] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#E8431A] rounded-full transition-all duration-700 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-briefShimmer motion-reduce:hidden" />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-[#C8C4BC] tabular-nums">{progress}%</p>
    </div>
  );
}

export default function TaskBriefPage() {
  const router = useRouter();
  const { taskId } = useParams<{ taskId: string }>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<TaskStatus>('queued');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(true);

  const [customBrief, setCustomBrief] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [expandedBriefs, setExpandedBriefs] = useState<Record<number, boolean>>({});

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!taskId) return;

    if (!getApiBaseUrl()) {
      setStatus('failed');
      setErrorMessage('Missing NEXT_PUBLIC_AI_API_URL.');
      stopPolling();
      setIsInitialLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/status/${taskId}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' }, cache: 'no-store' }
      );

      if (!res.ok) {
        throw new Error(`Status request failed (${res.status})`);
      }

      const data: StatusResponse = await res.json();
      setStatus(data.status);
      setProgress(Math.max(0, Math.min(100, data.progress ?? 0)));
      setResult(data.result ?? null);
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

  async function handleSelectBrief(sourceType: BriefSourceType) {
    if (!result?.brief_id || !getApiBaseUrl()) return;
    if (sourceType === 'custom' && !customBrief.trim()) return;

    setIsSelecting(true);
    try {
      const body: Record<string, string> = { source_type: sourceType };
      if (sourceType === 'custom') {
        body.custom_brief = customBrief.trim();
      }

      const res = await fetch(
        `${getApiBaseUrl()}/api/briefs/${result.brief_id}/select`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Selection failed (${res.status}): ${errText}`);
      }

      const label = sourceType === 'custom'
        ? 'Custom brief'
        : BRIEF_TYPE_LABELS[sourceType] ?? sourceType;
      router.push(`/brief/selected?type=${encodeURIComponent(label)}`);
    } catch (err) {
      console.error('Brief selection failed', err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save selection.'
      );
      setIsSelecting(false);
    }
  }

  function toggleBrief(index: number) {
    setExpandedBriefs((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const briefs: BriefCard[] = Array.isArray(result?.briefs)
    ? result.briefs
    : Array.isArray(result)
      ? (result as unknown as BriefCard[])
      : [];

  return (
    <main className="min-h-screen bg-[#F7F4EE] flex flex-col">
      <nav className="sticky top-0 z-10 bg-[#F7F4EE]/90 backdrop-blur border-b border-[#DDD9D0] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg text-[#0F0E0C] tracking-tight">
          Lumni<span className="text-[#E8431A]">.</span>
        </Link>
        <button
          onClick={() => router.push('/brief_generation')}
          className="text-sm font-medium text-[#8C8880] hover:text-[#0F0E0C] transition-colors"
        >
          &larr; New brief
        </button>
      </nav>

      {/* ── Loading ── */}
      {!isCompleted && !isFailed && (
        <div className="flex-1 flex items-center justify-center">
          <BriefLoadingScreen
            status={status}
            progress={progress}
            isInitialLoading={isInitialLoading}
          />
        </div>
      )}

      {/* ── Error ── */}
      {isFailed && (
        <section className="max-w-3xl mx-auto px-6 py-12 w-full">
          <div className="bg-[#FFF0EC] border border-[#E8431A]/20 rounded-sm p-5">
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
        </section>
      )}

      {/* ── Results ── */}
      {isCompleted && (
        <section className="max-w-3xl mx-auto px-6 py-12 w-full">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#E8431A]">Done</p>
          <h1 className="mt-3 font-serif text-4xl font-normal tracking-tight text-[#0F0E0C] leading-tight">
            We created these briefs just for you.
          </h1>
          <p className="mt-2 text-sm text-[#8C8880]">
            Choose a direction or write your own below.
          </p>

          <div className="mt-8">
            {briefs.length > 0 ? (
              <div className="space-y-4">
                {briefs.map((brief, index) => {
                  const typeKey = getBriefTypeKey(brief, index);
                  const typeLabel = getBriefLabel(brief, index);
                  const isExpanded = expandedBriefs[index] ?? false;

                  return (
                    <article
                      key={`${typeKey}-${index}`}
                      className="bg-white border border-[#DDD9D0] rounded-sm transition-all"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <p className="text-xs font-bold tracking-widest uppercase text-[#8C8880]">
                                {typeLabel}
                              </p>
                              {brief.duration && (
                                <span className="text-[10px] font-semibold tracking-wide uppercase bg-[#EEEAE2] text-[#8C8880] px-2 py-0.5 rounded-sm">
                                  {normalizeDuration(brief.duration)}
                                </span>
                              )}
                            </div>
                            {brief.highlight && (
                              <p className="mt-2 text-sm text-[#3A3832] leading-relaxed">{brief.highlight}</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                          <button
                            type="button"
                            disabled={isSelecting}
                            onClick={() => handleSelectBrief(typeKey)}
                            className={`px-5 py-2.5 text-sm font-semibold rounded-sm transition-colors ${
                              isSelecting
                                ? 'bg-[#EEEAE2] text-[#8C8880] cursor-not-allowed'
                                : 'bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#E8431A]'
                            }`}
                          >
                            {isSelecting ? 'Saving...' : `Choose ${typeLabel}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBrief(index)}
                            className="px-4 py-2.5 text-sm font-medium text-[#8C8880] hover:text-[#0F0E0C] border border-[#DDD9D0] rounded-sm transition-colors"
                          >
                            {isExpanded ? 'Hide details' : 'View full brief'}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-[#EEEAE2] px-6 pb-6 pt-5 space-y-4">
                          {brief.hook && (
                            <div>
                              <p className="text-[10px] font-bold tracking-widest uppercase text-[#8C8880] mb-1">Hook</p>
                              <p className="text-sm text-[#3A3832] leading-relaxed italic">
                                &ldquo;{brief.hook}&rdquo;
                              </p>
                            </div>
                          )}

                          {brief.script && (
                            <div>
                              <p className="text-[10px] font-bold tracking-widest uppercase text-[#8C8880] mb-1">Script</p>
                              <p className="text-sm text-[#3A3832] leading-relaxed whitespace-pre-line">{brief.script}</p>
                            </div>
                          )}

                          {brief.scenes && brief.scenes.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold tracking-widest uppercase text-[#8C8880] mb-2">
                                Scenes ({brief.scenes.length})
                              </p>
                              <div className="space-y-3">
                                {brief.scenes.map((scene, si) => (
                                  <div
                                    key={si}
                                    className="bg-[#FAFAF8] border border-[#EEEAE2] rounded-sm p-4"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-[10px] font-bold tracking-widest uppercase text-[#E8431A]">
                                        Scene {scene.scene ?? si + 1}
                                      </span>
                                      {scene.act && (
                                        <span className="text-[10px] font-semibold tracking-wide uppercase bg-[#EEEAE2] text-[#8C8880] px-2 py-0.5 rounded-sm">
                                          {scene.act}
                                        </span>
                                      )}
                                      {scene.timing && (
                                        <span className="text-[10px] text-[#8C8880]">{scene.timing}</span>
                                      )}
                                    </div>
                                    {scene.action && (
                                      <p className="text-sm text-[#3A3832] mb-1">
                                        <span className="font-semibold text-[#0F0E0C]">Action:</span> {scene.action}
                                      </p>
                                    )}
                                    {scene.dialogue && (
                                      <p className="text-sm text-[#3A3832] mb-1">
                                        <span className="font-semibold text-[#0F0E0C]">Dialogue:</span>{' '}
                                        <span className="italic">&ldquo;{scene.dialogue}&rdquo;</span>
                                      </p>
                                    )}
                                    {scene.visual_direction && (
                                      <p className="text-xs text-[#8C8880]">
                                        <span className="font-semibold">Visual:</span> {scene.visual_direction}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {brief.visual_style && (
                            <div>
                              <p className="text-[10px] font-bold tracking-widest uppercase text-[#8C8880] mb-1">Visual Style</p>
                              <p className="text-sm text-[#3A3832]">{brief.visual_style}</p>
                            </div>
                          )}

                          {brief.caption && (
                            <div>
                              <p className="text-[10px] font-bold tracking-widest uppercase text-[#8C8880] mb-1">Caption</p>
                              <p className="text-sm text-[#3A3832] leading-relaxed whitespace-pre-line">{brief.caption}</p>
                            </div>
                          )}

                          <BriefExtras brief={brief} />

                          {brief.cta && (
                            <div>
                              <p className="text-[10px] font-bold tracking-widest uppercase text-[#8C8880] mb-1">CTA</p>
                              <p className="text-sm text-[#3A3832]">{brief.cta}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}

                {/* Custom brief */}
                <div className="bg-white border border-[#DDD9D0] rounded-sm p-6">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#8C8880] mb-1">Or</p>
                  <h3 className="font-serif text-xl text-[#0F0E0C] tracking-tight">
                    Use your own brief
                  </h3>
                  <p className="mt-1 text-sm text-[#8C8880] font-light">
                    Write or paste your own brief instead of choosing one above.
                  </p>
                  <textarea
                    value={customBrief}
                    onChange={(e) => setCustomBrief(e.target.value)}
                    disabled={isSelecting}
                    placeholder="Write your custom brief here..."
                    rows={6}
                    className="
                      mt-4 w-full bg-[#FAFAF8] border border-[#DDD9D0] rounded-sm
                      px-4 py-3 text-sm text-[#0F0E0C] placeholder-[#8C8880]
                      outline-none transition-colors resize-y
                      focus:border-[#E8431A]
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  />
                  <button
                    type="button"
                    disabled={isSelecting || !customBrief.trim()}
                    onClick={() => handleSelectBrief('custom')}
                    className={`mt-3 w-full py-3 text-sm font-semibold rounded-sm transition-colors ${
                      isSelecting || !customBrief.trim()
                        ? 'bg-[#EEEAE2] text-[#8C8880] cursor-not-allowed'
                        : 'bg-[#0F0E0C] text-[#F7F4EE] hover:bg-[#E8431A]'
                    }`}
                  >
                    {isSelecting ? 'Saving...' : 'Choose my brief'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-[#8C8880]">Completed, but no briefs were returned.</p>
                <p className="text-xs text-[#8C8880]">
                  This usually means all Vertex AI calls failed. Check backend logs for &quot;[briefs]&quot; errors,
                  and ensure <code className="bg-[#EEEAE2] px-1 rounded">GOOGLE_CLOUD_PROJECT</code> and
                  Vertex AI credentials are configured.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}


function normalizeDuration(raw: string): string {
  const parseSeconds = (s: string): number | null => {
    const cleaned = s.trim().replace(/\s*sec(onds?)?\s*$/i, '').trim();
    if (cleaned.includes(':')) {
      const [min, sec] = cleaned.split(':').map(Number);
      if (!isNaN(min) && !isNaN(sec)) return min * 60 + sec;
    }
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  };

  const parts = raw.split(/\s*[–\-]\s*/);
  if (parts.length === 2) {
    const a = parseSeconds(parts[0]);
    const b = parseSeconds(parts[1]);
    if (a !== null && b !== null) return `${Math.round(a)}–${Math.round(b)} sec`;
  } else if (parts.length === 1) {
    const a = parseSeconds(parts[0]);
    if (a !== null) return `${Math.round(a)} sec`;
  }
  return raw;
}

function BriefExtras({ brief }: { brief: BriefCard }) {
  const extras: { label: string; value: string | null | undefined }[] = [];

  if (brief.opening_conflict)
    extras.push({ label: 'Opening Conflict', value: brief.opening_conflict });
  if (brief.rage_level)
    extras.push({ label: 'Rage Level', value: brief.rage_level });
  if (brief.loss_aversion_frame)
    extras.push({ label: 'Loss Aversion', value: brief.loss_aversion_frame });
  if (brief.anchor_value)
    extras.push({ label: 'Anchor Value', value: brief.anchor_value });
  if (brief.social_proof_stack)
    extras.push({ label: 'Social Proof', value: brief.social_proof_stack });
  if (brief.hype_mechanic)
    extras.push({ label: 'Hype Mechanic', value: brief.hype_mechanic });
  if (brief.social_currency_element)
    extras.push({ label: 'Social Currency', value: brief.social_currency_element });
  if (brief.nostalgia_trigger)
    extras.push({ label: 'Nostalgia Trigger', value: brief.nostalgia_trigger });
  if (brief.belonging_signal)
    extras.push({ label: 'Belonging Signal', value: brief.belonging_signal });

  if (extras.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {extras.map((e) => (
        <div key={e.label}>
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#8C8880]">
            {e.label}
          </span>
          <p className="text-sm text-[#3A3832]">{e.value}</p>
        </div>
      ))}
    </div>
  );
}
