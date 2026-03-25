'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type EntityType = 'brand' | 'creator' | 'unknown';

type EntitySearchItem = {
  handle: string;
  display_name: string | null;
  profile_pic_url: string | null;
  entity_type: EntityType;
};

type InputKind = 'primary' | 'secondary';

export default function BriefGenerationPage() {
  const router = useRouter();
  const [primaryHandle, setPrimaryHandle] = useState('');
  const [secondaryHandle, setSecondaryHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<InputKind | null>(null);

  const [primaryResults, setPrimaryResults] = useState<EntitySearchItem[]>([]);
  const [secondaryResults, setSecondaryResults] = useState<EntitySearchItem[]>([]);
  const [primarySearchLoading, setPrimarySearchLoading] = useState(false);
  const [secondarySearchLoading, setSecondarySearchLoading] = useState(false);

  const [selectedPrimaryEntity, setSelectedPrimaryEntity] = useState<EntitySearchItem | null>(null);
  const [selectedSecondaryEntity, setSelectedSecondaryEntity] = useState<EntitySearchItem | null>(null);

  const debounceTimersRef = useRef<{ primary: ReturnType<typeof setTimeout> | null; secondary: ReturnType<typeof setTimeout> | null; }>({
    primary: null,
    secondary: null,
  });
  const requestVersionRef = useRef<{ primary: number; secondary: number }>({ primary: 0, secondary: 0 });

  useEffect(() => {
    return () => {
      if (debounceTimersRef.current.primary) clearTimeout(debounceTimersRef.current.primary);
      if (debounceTimersRef.current.secondary) clearTimeout(debounceTimersRef.current.secondary);
    };
  }, []);

  async function fetchEntitySearch(kind: InputKind, value: string) {
    if (!process.env.NEXT_PUBLIC_AI_API_URL) return;

    const normalized = value.replace('@', '').trim();
    const requestVersion = ++requestVersionRef.current[kind];

    if (normalized.length < 2) {
      if (kind === 'primary') {
        setPrimaryResults([]);
        setPrimarySearchLoading(false);
      } else {
        setSecondaryResults([]);
        setSecondarySearchLoading(false);
      }
      return;
    }

    if (kind === 'primary') setPrimarySearchLoading(true);
    else setSecondarySearchLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AI_API_URL}/api/entities/search?q=${encodeURIComponent(normalized)}`,
        { method: 'GET' }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('GET /api/entities/search failed', { status: res.status, responseBody: errorText });
        if (kind === 'primary') setPrimaryResults([]);
        else setSecondaryResults([]);
        return;
      }

      const data: EntitySearchItem[] = await res.json();
      if (requestVersion !== requestVersionRef.current[kind]) return;

      if (kind === 'primary') setPrimaryResults(data);
      else setSecondaryResults(data);
    } catch (err) {
      console.error('Entity search request crashed', err);
      if (kind === 'primary') setPrimaryResults([]);
      else setSecondaryResults([]);
    } finally {
      if (requestVersion !== requestVersionRef.current[kind]) return;
      if (kind === 'primary') setPrimarySearchLoading(false);
      else setSecondarySearchLoading(false);
    }
  }

  function scheduleSearch(kind: InputKind, value: string) {
    if (debounceTimersRef.current[kind]) {
      clearTimeout(debounceTimersRef.current[kind]!);
    }
    debounceTimersRef.current[kind] = setTimeout(() => {
      void fetchEntitySearch(kind, value);
    }, 300);
  }

  function handlePrimaryInputChange(value: string) {
    setPrimaryHandle(value);
    setSelectedPrimaryEntity(null);
    setActiveDropdown('primary');
    scheduleSearch('primary', value);
  }

  function handleSecondaryInputChange(value: string) {
    setSecondaryHandle(value);
    setSelectedSecondaryEntity(null);
    setActiveDropdown('secondary');
    scheduleSearch('secondary', value);
  }

  function selectEntity(kind: InputKind, entity: EntitySearchItem) {
    if (kind === 'primary') {
      setPrimaryHandle(entity.handle);
      setSelectedPrimaryEntity(entity);
      setPrimaryResults([]);
    } else {
      setSecondaryHandle(entity.handle);
      setSelectedSecondaryEntity(entity);
      setSecondaryResults([]);
    }
    setActiveDropdown(null);
  }

  function handleInputBlur() {
    window.setTimeout(() => {
      setActiveDropdown(null);
    }, 120);
  }

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
        throw new Error(`Server error ${res.status}: ${errorText.slice(0, 200)}`);
      }

      const { task_id } = await res.json();
      if (!task_id) {
        throw new Error('Missing task_id in response');
      }

      redirected = true;
      router.push(`/brief/${task_id}`);
    } catch (err) {
      console.error('Generate request crashed', err);
      const technical = err instanceof Error ? err.message : String(err);
      const isDev = process.env.NODE_ENV === 'development';
      setError(
        isDev
          ? `Could not reach the API (${technical}). Use http://localhost:3000 (not the Network IP) if you see CORS/Failed to fetch; ensure the backend runs with a valid .env (Supabase).`
          : 'Our AI agents are currently resting. Please try again later.'
      );
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
                onChange={(e) => handlePrimaryInputChange(e.target.value)}
                onFocus={() => setActiveDropdown('primary')}
                onBlur={handleInputBlur}
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
            {selectedPrimaryEntity && (
              <p className="text-[11px] text-[#8C8880]">
                Selected: @{selectedPrimaryEntity.handle}
              </p>
            )}
            <SearchDropdown
              visible={activeDropdown === 'primary'}
              loading={primarySearchLoading}
              query={primaryHandle}
              items={primaryResults}
              onSelect={(item) => selectEntity('primary', item)}
            />
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
                onChange={(e) => handleSecondaryInputChange(e.target.value)}
                onFocus={() => setActiveDropdown('secondary')}
                onBlur={handleInputBlur}
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
            {selectedSecondaryEntity && (
              <p className="text-[11px] text-[#8C8880]">
                Selected: @{selectedSecondaryEntity.handle}
              </p>
            )}
            <SearchDropdown
              visible={activeDropdown === 'secondary'}
              loading={secondarySearchLoading}
              query={secondaryHandle}
              items={secondaryResults}
              onSelect={(item) => selectEntity('secondary', item)}
            />
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
              'Generate Brief'
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

function SearchDropdown({
  visible,
  loading,
  query,
  items,
  onSelect,
}: {
  visible: boolean;
  loading: boolean;
  query: string;
  items: EntitySearchItem[];
  onSelect: (item: EntitySearchItem) => void;
}) {
  if (!visible) return null;

  const normalized = query.replace('@', '').trim();
  if (normalized.length < 2) return null;

  return (
    <div className="relative mt-2">
      <div className="absolute z-20 w-full bg-white border border-[#DDD9D0] rounded-sm shadow-sm max-h-60 overflow-auto">
        {loading ? (
          <p className="px-4 py-3 text-xs text-[#8C8880]">Searching...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-3 text-xs text-[#8C8880]">No matches found.</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={`${item.handle}-${item.entity_type}`}>
                <button
                  type="button"
                  onMouseDown={() => onSelect(item)}
                  className="w-full px-3 py-2.5 text-left hover:bg-[#F7F4EE] transition-colors flex items-center gap-3"
                >
                  {item.profile_pic_url ? (
                    <img
                      src={item.profile_pic_url}
                      alt={`${item.handle} avatar`}
                      className="w-7 h-7 rounded-full object-cover border border-[#DDD9D0]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#EEEAE2] border border-[#DDD9D0] flex items-center justify-center text-[10px] text-[#8C8880]">
                      @
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-[#0F0E0C] truncate">@{item.handle}</p>
                    <p className="text-xs text-[#8C8880] truncate">
                      {item.display_name || 'No display name'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
