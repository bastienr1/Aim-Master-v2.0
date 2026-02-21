import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  PlaylistService,
  PlaylistSearchResult,
  TrainingProgram,
  ScenarioCompletion,
} from '@/services/PlaylistService';
import { getScenarioRank } from '@/data/voltaicThresholds';
import {
  Search, Trophy, Target, Zap, Crosshair, BookOpen, Loader2,
  CheckCircle, AlertCircle, RotateCcw, ArrowLeft, Trash2,
  Users, Clock, ListChecks, Download, ChevronRight, Hash,
  Sparkles, LayoutGrid, List,
} from 'lucide-react';
import { PreTrainingCheckin } from '@/components/mental-game/PreTrainingCheckin';
import { usePreTrainingGate } from '@/hooks/usePreTrainingGate';
import { PlaylistIntroduction } from '@/components/training/PlaylistIntroduction';
import { VerifiedBadge } from '@/components/training/VerifiedBadge';
import { VerifiedShieldIcon } from '@/components/icons/VerifiedShieldIcon';

interface TrainingProps {
  profile: any;
  onRefresh: () => Promise<void>;
  pendingIntent?: { intent: string; autoLoaded: boolean } | null;
  onClearIntent?: () => void;
}

interface ScoreInfo {
  highScore: number;
  plays: number;
  rankThresholds: Record<string, number> | null;
}

const AIM_TYPE_COLORS: Record<string, string> = {
  Clicking: '#FF4655',
  Tracking: '#53CADC',
  Switching: '#FFCA3A',
  Speed: '#FFCA3A',
  Mixed: '#9CA8B3',
};

function getAimColor(aimType: string | null | undefined): string {
  if (!aimType) return '#5A6872';
  return AIM_TYPE_COLORS[aimType] || '#5A6872';
}

const FEATURED_PROGRAMS = [
  { title: 'Voltaic S5 Benchmark', query: 'Voltaic S5', color: '#FF4655', icon: Trophy, desc: 'Industry-standard aim benchmarks' },
  { title: 'Viscose Benchmark', query: 'Viscose Benchmark', color: '#53CADC', icon: Target, desc: 'Comprehensive skill assessment' },
  { title: 'Revosect Routines', query: 'Revosect', color: '#FFCA3A', icon: Zap, desc: 'Structured improvement routines' },
  { title: 'Valorant Training', query: 'Valorant aim', color: '#FF4655', icon: Crosshair, desc: 'Tac-shooter specific drills' },
  { title: 'CS2 Training', query: 'CS2 aim', color: '#FFCA3A', icon: Crosshair, desc: 'Counter-Strike aim routines' },
  { title: 'Beginner Fundamentals', query: 'beginner fundamentals', color: '#3DD598', icon: BookOpen, desc: 'Start your aim journey here' },
];

const BENCHMARK_ID_MAP: Record<string, number> = {
  'Voltaic - Intermediate S5': 458,
  'Voltaic S5 Intermediate': 458,
  'VT Intermediate S5': 458,
  'Voltaic Intermediate Benchmarks S5': 458,
  'Voltaic - Novice S5': 459,
  'Voltaic S5 Novice': 459,
  'VT Novice S5': 459,
  'Voltaic Novice Benchmarks S5': 459,
  'Voltaic - Advanced S5': 460,
  'Voltaic S5 Advanced': 460,
  'VT Advanced S5': 460,
  'Voltaic Advanced Benchmarks S5': 460,
  'Voltaic - Elite S5': 475,
  'Voltaic S5 Elite': 475,
  'VT Elite S5': 475,
  'Voltaic Elite Benchmarks S5': 475,
  'Viscose Benchmarks (Easier)': 686,
  'Viscose Easier': 686,
  'Viscose Benchmarks (Medium)': 687,
  'Viscose Medium': 687,
  'Viscose Benchmarks (Hard)': 688,
  'Viscose Hard': 688,
};

function findBenchmarkId(programName: string): number | null {
  if (BENCHMARK_ID_MAP[programName]) return BENCHMARK_ID_MAP[programName];
  const lower = programName.toLowerCase();
  if (lower.includes('intermediate') && lower.includes('s5')) return 458;
  if (lower.includes('novice') && lower.includes('s5')) return 459;
  if (lower.includes('advanced') && lower.includes('s5')) return 460;
  if (lower.includes('elite') && lower.includes('s5')) return 475;
  if (lower.includes('viscose') && lower.includes('easier')) return 686;
  if (lower.includes('viscose') && lower.includes('medium')) return 687;
  if (lower.includes('viscose') && lower.includes('hard')) return 688;
  return null;
}

function isVerifiedPlaylist(name: string): boolean {
  return findBenchmarkId(name) !== null;
}

function isVerifiedSearchResult(playlistName: string): boolean {
  const lower = playlistName.toLowerCase();
  return (
    (lower.includes('voltaic') && lower.includes('s5')) ||
    (lower.includes('viscose') && lower.includes('benchmark'))
  );
}

function extractPlaylists(data: any): PlaylistSearchResult[] {
  let raw: any[] = [];
  if (Array.isArray(data)) {
    raw = data;
  } else if (data?.data && Array.isArray(data.data)) {
    raw = data.data;
  } else if (data?.playlists && Array.isArray(data.playlists)) {
    raw = data.playlists;
  } else if (typeof data === 'object' && data?.playlistName) {
    raw = [data];
  }
  return raw.filter(Boolean) as PlaylistSearchResult[];
}

export function Training({ profile: _profile, onRefresh: _onRefresh, pendingIntent, onClearIntent }: TrainingProps) {
  const { user } = useAuth();

  // Pre-training check-in gate — NO auto-trigger on page load
  // Triggers only when user launches a program
  const { showCheckin, triggerCheckin, dismissCheckin, completeCheckin } = usePreTrainingGate(false);


  // State
  const [view, setView] = useState<'discovery' | 'active'>('discovery');
  const [searchQuery, setSearchQuery] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<PlaylistSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const [activeProgram, setActiveProgram] = useState<TrainingProgram | null>(null);
  const [completions, setCompletions] = useState<ScenarioCompletion[]>([]);
  const [userPrograms, setUserPrograms] = useState<TrainingProgram[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [updatingScenario, setUpdatingScenario] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scenarioScores, setScenarioScores] = useState<Map<string, ScoreInfo>>(new Map());
  const [showIntroduction, setShowIntroduction] = useState(false);

  const loadScores = useCallback(async (userId: string) => {
    const scoreMap = new Map<string, ScoreInfo>();
    try {
      const { data: statsData } = await supabase
        .from('user_scenario_stats')
        .select('high_score, total_attempts, scenarios!inner(name, rank_thresholds)')
        .eq('user_id', userId);
      if (statsData) {
        statsData.forEach((s: any) => {
          const name = s.scenarios?.name;
          if (name) {
            scoreMap.set(name, {
              highScore: parseFloat(s.high_score) || 0,
              plays: s.total_attempts || 0,
              rankThresholds: s.scenarios?.rank_thresholds || null,
            });
          }
        });
      }
    } catch {
      // silent
    }
    setScenarioScores(scoreMap);
  }, []);

  const loadPrograms = useCallback(async () => {
    if (!user) return;
    setLoadingPrograms(true);
    try {
      const [active, programs] = await Promise.all([
        PlaylistService.getActiveProgram(user.id),
        PlaylistService.getUserPrograms(user.id),
      ]);
      setActiveProgram(active);
      setUserPrograms(programs);
      if (active) {
        const [comps] = await Promise.all([
          PlaylistService.getCompletions(active.id),
          loadScores(user.id),
        ]);
        setCompletions(comps);
        setView('active');
      } else {
        setView('discovery');
      }
    } catch {
      // silent
    } finally {
      setLoadingPrograms(false);
    }
  }, [user, loadScores]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  // Auto-load playlist when pendingIntent arrives
 useEffect(() => {
  console.log('Training: pendingIntent changed:', pendingIntent);
  if (!pendingIntent?.autoLoaded) return;
  if (!user) return;
  console.log('Training: auto-loading playlist for intent:', pendingIntent.intent);

    const autoLoadPlaylist = async () => {
      const intent = pendingIntent.intent;
      let playlists: PlaylistSearchResult[] = [];

      if (intent === 'warmup') {
        const result = await PlaylistService.searchPlaylists('RAMP');
        if (result.success && result.data) {
          playlists = extractPlaylists(result.data);
        }
        if (playlists.length === 0) {
          const fallback = await PlaylistService.searchPlaylists('Valorant RAMP Warmup');
          if (fallback.success && fallback.data) {
            playlists = extractPlaylists(fallback.data);
          }
        }
      } else if (intent === 'improve') {
        const result = await PlaylistService.searchPlaylists('Voltaic S5 Fundamental');
        if (result.success && result.data) {
          playlists = extractPlaylists(result.data);
        }
        if (playlists.length === 0) {
          const fallback = await PlaylistService.searchPlaylists('Voltaic S5 Benchmark');
          if (fallback.success && fallback.data) {
            playlists = extractPlaylists(fallback.data);
          }
        }
        if (playlists.length === 0) {
          const fallback = await PlaylistService.searchPlaylists('Voltaic');
          if (fallback.success && fallback.data) {
            playlists = extractPlaylists(fallback.data);
          }
        }
      }

      if (playlists.length > 0) {
        await handleImport(playlists[0]);
        setShowIntroduction(true);
      } else {
        console.warn('No default playlist found for intent:', intent);
      }
    };

    autoLoadPlaylist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIntent, user]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    setSearchQuery(query);
    const result = await PlaylistService.searchPlaylists(query.trim());
    if (result.success && result.data) {
      const playlists = extractPlaylists(result.data);
      setSearchResults(playlists);
    } else {
      setSearchError(result.error || 'Search failed. Please try again.');
    }
    setSearching(false);
  };

  const handleCodeImport = async () => {
    if (!codeInput.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    const result = await PlaylistService.getPlaylistByCode(codeInput.trim());
    if (result.success && result.data) {
      const playlists = extractPlaylists(result.data);
      setSearchResults(playlists);
    } else {
      setSearchError(result.error || 'Could not find playlist with that code.');
    }
    setSearching(false);
  };

  const handleImport = async (playlist: PlaylistSearchResult) => {
    const key = playlist.playlistCode || playlist.playlistName;
    setImportingId(key);
    setImportSuccess(null);
    const result = await PlaylistService.importPlaylist(playlist);
    if (result.success) {
      setImportSuccess(key);
      setTimeout(async () => {
        await loadPrograms();
        setImportSuccess(null);
        setImportingId(null);
      }, 1500);
    } else {
      setImportingId(null);
      setSearchError(result.error || 'Import failed.');
    }
  };

// Program launch with check-in gate
  const pendingProgramRef = useRef<string | null>(null);

  const handleLaunchProgram = useCallback(async (programId: string) => {
    pendingProgramRef.current = programId;
    const shouldShow = await triggerCheckin();
    if (!shouldShow) {
      // Cooldown active — skip check-in, activate immediately
      pendingProgramRef.current = null;
      if (user) {
        await PlaylistService.setActiveProgram(user.id, programId);
        await loadPrograms();
      }
    }
  }, [triggerCheckin, user, loadPrograms]);

  const handleCheckinComplete = useCallback(async () => {
    completeCheckin();
    const programId = pendingProgramRef.current;
    pendingProgramRef.current = null;
    if (programId && user) {
      await PlaylistService.setActiveProgram(user.id, programId);
      await loadPrograms();
    }
  }, [completeCheckin, user, loadPrograms]);

  const handleCheckinDismiss = useCallback(async () => {
    dismissCheckin();
    const programId = pendingProgramRef.current;
    pendingProgramRef.current = null;
    if (programId && user) {
      await PlaylistService.setActiveProgram(user.id, programId);
      await loadPrograms();
    }
  }, [dismissCheckin, user, loadPrograms]);

  const handleDeleteProgram = async (programId: string) => {
    if (!user) return;
    setDeletingId(programId);
    await PlaylistService.deleteProgram(user.id, programId);
    await loadPrograms();
    setDeletingId(null);
  };

  const handleUpdateCompletion = async (scenarioName: string, status: string) => {
    if (!user || !activeProgram) return;
    setUpdatingScenario(scenarioName);
    await PlaylistService.updateCompletion(user.id, activeProgram.id, scenarioName, status);
    const comps = await PlaylistService.getCompletions(activeProgram.id);
    setCompletions(comps);
    setUpdatingScenario(null);
  };

  if (loadingPrograms) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#FF4655] animate-spin" />
      </div>
    );
  }

  // ─── VIEW 2: ACTIVE PROGRAM ───
  if (view === 'active' && activeProgram) {
    return (
      <ActiveProgramView
        program={activeProgram}
        completions={completions}
        scenarioScores={scenarioScores}
        updatingScenario={updatingScenario}
        loadScores={loadScores}
        onUpdateCompletion={handleUpdateCompletion}
        onChangeProgram={() => setView('discovery')}
        showIntroduction={showIntroduction}
        pendingIntent={pendingIntent}
        onDismissIntroduction={() => {
          setShowIntroduction(false);
          onClearIntent?.();
        }}
      />
    );
  }

  // ─── VIEW 1: DISCOVERY ───
  return (
    <>
      <PreTrainingCheckin
        isOpen={showCheckin}
        onClose={handleCheckinDismiss}
        onComplete={handleCheckinComplete}
      />
      <div className="p-6 lg:p-8 animate-slide-up">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-['Rajdhani'] text-[28px] font-bold text-[#ECE8E1]">Training Programs</h1>
          <p className="text-[#9CA8B3] text-sm mt-1 font-['Inter']">
            Import training playlists directly from KovaaK's
          </p>
        </div>

        {/* Featured Programs */}
        <section className="mb-8">
          <h2 className="font-['Rajdhani'] text-lg font-semibold text-[#9CA8B3] uppercase tracking-wider mb-4">
            Featured Programs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURED_PROGRAMS.map((fp) => (
              <button
                key={fp.title}
                onClick={() => handleSearch(fp.query)}
                className="bg-[#2A3A47] border border-white/10 rounded-xl p-5 text-left hover:shadow-lg transition-all duration-200 cursor-pointer group"
                style={{ borderColor: undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${fp.color}50`)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${fp.color}15` }}
                >
                  <fp.icon className="w-5 h-5" style={{ color: fp.color }} />
                </div>
                <h3 className="font-['Rajdhani'] text-base font-semibold text-[#ECE8E1] group-hover:text-white transition-colors">
                  {fp.title}
                </h3>
                <p className="text-[#9CA8B3] text-xs mt-1 font-['Inter']">{fp.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Search Bar */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6872]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                placeholder="Search KovaaK's playlists... (e.g. 'Voltaic S5', 'tracking routine')"
                className="w-full bg-[#1C2B36] border border-white/10 rounded-lg pl-11 pr-4 py-3 text-[#ECE8E1] text-sm font-['Inter'] placeholder:text-[#5A6872] focus:outline-none focus:border-[#FF4655]/50 transition-colors"
              />
            </div>
            <button
              onClick={() => handleSearch(searchQuery)}
              disabled={searching || !searchQuery.trim()}
              className="bg-[#FF4655] hover:bg-[#FF4655]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 text-sm font-semibold font-['Inter'] flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>

          {/* Code import */}
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="flex-1 relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A6872]" />
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCodeImport()}
                placeholder="Or paste a playlist code..."
                className="w-full bg-[#1C2B36] border border-white/10 rounded-lg pl-11 pr-4 py-2.5 text-[#ECE8E1] text-sm font-['Inter'] placeholder:text-[#5A6872] focus:outline-none focus:border-[#53CADC]/50 transition-colors"
              />
            </div>
            <button
              onClick={handleCodeImport}
              disabled={searching || !codeInput.trim()}
              className="bg-[#53CADC] hover:bg-[#53CADC]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-2.5 text-sm font-semibold font-['Inter'] flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
              Fetch
            </button>
          </div>
        </section>

        {/* Search Error */}
        {searchError && (
          <div className="mb-6 bg-[#FF4655]/10 border border-[#FF4655]/30 rounded-xl p-4 text-[#FF4655] text-sm font-['Inter']">
            {searchError}
          </div>
        )}

        {/* Search Loading */}
        {searching && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-[#FF4655] animate-spin" />
              <p className="text-[#9CA8B3] text-sm font-['Inter']">Searching KovaaK's playlists...</p>
            </div>
          </div>
        )}

        {/* Search Results */}
        {!searching && searchResults.length > 0 && (
          <section className="mb-8">
            <h2 className="font-['Rajdhani'] text-lg font-semibold text-[#9CA8B3] uppercase tracking-wider mb-4">
              Search Results
              <span className="ml-2 text-sm font-['JetBrains_Mono'] text-[#5A6872]">({searchResults.length})</span>
            </h2>
            <div className="space-y-4">
              {searchResults.filter(Boolean).map((playlist) => (
                <SearchResultCard
                  key={playlist.playlistCode || playlist.playlistName}
                  playlist={playlist}
                  importing={importingId === (playlist.playlistCode || playlist.playlistName)}
                  imported={importSuccess === (playlist.playlistCode || playlist.playlistName)}
                  onImport={() => handleImport(playlist)}
                />
              ))}
            </div>
          </section>
        )}

        {/* My Programs */}
        {userPrograms.length > 0 && (
          <section>
            <h2 className="font-['Rajdhani'] text-lg font-semibold text-[#9CA8B3] uppercase tracking-wider mb-4">
              My Programs
              <span className="ml-2 text-sm font-['JetBrains_Mono'] text-[#5A6872]">({userPrograms.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPrograms.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  deleting={deletingId === program.id}
                  onActivate={() => handleLaunchProgram(program.id)}
                  onDelete={() => handleDeleteProgram(program.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

// ─── SEARCH RESULT CARD ───
function SearchResultCard({
  playlist,
  importing,
  imported,
  onImport,
}: {
  playlist: PlaylistSearchResult;
  importing: boolean;
  imported: boolean;
  onImport: () => void;
}) {
  const aimColor = getAimColor(playlist.aimType);
  const author = playlist.webappUsername || playlist.steamAccountName || 'Unknown';
  const scenarios = (playlist.scenarioList || []).filter(Boolean);
  const previewCount = 5;
  const remaining = Math.max(0, scenarios.length - previewCount);

  return (
    <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] leading-tight">
              {playlist.playlistName}
            </h3>
            {isVerifiedSearchResult(playlist.playlistName) && (
              <VerifiedBadge variant="tag" />
            )}
          </div>
          <p className="text-[#9CA8B3] text-xs font-['Inter'] mt-1">
            by <span className="text-[#ECE8E1]/70">{author}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {playlist.aimType && (
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-['Inter'] uppercase tracking-wide"
                style={{ backgroundColor: `${aimColor}20`, color: aimColor }}
              >
                {playlist.aimType}
              </span>
            )}
            <span className="text-[#9CA8B3] text-xs font-['Inter'] flex items-center gap-1">
              <ListChecks className="w-3 h-3" />
              <span className="font-['JetBrains_Mono']">{scenarios.length}</span> scenarios
            </span>
            {playlist.subscribers > 0 && (
              <span className="text-[#9CA8B3] text-xs font-['Inter'] flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span className="font-['JetBrains_Mono']">{playlist.subscribers.toLocaleString()}</span>
              </span>
            )}
            {playlist.playlistDuration > 0 && (
              <span className="text-[#9CA8B3] text-xs font-['Inter'] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="font-['JetBrains_Mono']">{playlist.playlistDuration}</span>min
              </span>
            )}
          </div>

          {scenarios.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {scenarios.slice(0, previewCount).map((s, i) => (
                <span
                  key={i}
                  className="bg-[#0F1923] text-[#9CA8B3] text-[11px] font-['Inter'] px-2 py-0.5 rounded-md truncate max-w-[200px]"
                >
                  {s.scenarioName}
                </span>
              ))}
              {remaining > 0 && (
                <span className="text-[#5A6872] text-[11px] font-['JetBrains_Mono'] px-2 py-0.5">
                  +{remaining} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0">
          {imported ? (
            <div className="flex items-center gap-2 text-[#3DD598] text-sm font-semibold font-['Inter']">
              <CheckCircle className="w-5 h-5" />
              Imported!
            </div>
          ) : (
            <button
              onClick={onImport}
              disabled={importing}
              className="bg-[#3DD598] hover:bg-[#3DD598]/90 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-semibold font-['Inter'] flex items-center gap-2 transition-colors"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {importing ? 'Importing...' : 'Import Program'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PROGRAM CARD (My Programs) ───
function ProgramCard({
  program,
  deleting,
  onActivate,
  onDelete,
}: {
  program: TrainingProgram;
  deleting: boolean;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const aimColor = getAimColor(program.aim_type);

  return (
    <div
      className={`bg-[#2A3A47] border rounded-xl p-5 transition-all relative group ${
        program.is_active
          ? 'border-[#FF4655]/50 shadow-lg shadow-[#FF4655]/10'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={deleting}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-[#5A6872] hover:text-[#FF4655] hover:bg-[#FF4655]/10 opacity-0 group-hover:opacity-100 transition-all"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>

      {program.is_active && (
        <div className="absolute top-3 left-3">
          <span className="bg-[#FF4655]/20 text-[#FF4655] text-[10px] font-bold font-['Inter'] uppercase tracking-wider px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>
      )}

      <div className={program.is_active ? 'mt-6' : ''}>
        <h3 className="font-['Rajdhani'] text-base font-semibold text-[#ECE8E1] leading-tight line-clamp-2 pr-6">
          {program.program_name}
        </h3>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          {program.aim_type && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-['Inter'] uppercase tracking-wide"
              style={{ backgroundColor: `${aimColor}20`, color: aimColor }}
            >
              {program.aim_type}
            </span>
          )}
          {isVerifiedPlaylist(program.program_name) && (
            <VerifiedBadge variant="tag" />
          )}
          <span className="text-[#9CA8B3] text-xs font-['Inter']">
            <span className="font-['JetBrains_Mono']">{program.scenario_count}</span> scenarios
          </span>
        </div>

        {program.playlist_author && (
          <p className="text-[#5A6872] text-xs font-['Inter'] mt-2 truncate">
            by {program.playlist_author}
          </p>
        )}

        {!program.is_active && (
          <button
            onClick={onActivate}
            className="mt-4 w-full bg-[#1C2B36] hover:bg-[#FF4655]/10 border border-white/10 hover:border-[#FF4655]/30 text-[#9CA8B3] hover:text-[#FF4655] rounded-lg py-2 text-xs font-semibold font-['Inter'] flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Set Active
          </button>
        )}

        {program.is_active && (
          <button
            onClick={onActivate}
            className="mt-4 w-full bg-[#FF4655]/10 border border-[#FF4655]/30 text-[#FF4655] rounded-lg py-2 text-xs font-semibold font-['Inter'] flex items-center justify-center gap-1.5 transition-all hover:bg-[#FF4655]/20"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            Open Program
          </button>
        )}
      </div>
    </div>
  );
}

// ─── VIEW 2: ACTIVE PROGRAM ───
function ActiveProgramView({
  program,
  completions,
  scenarioScores,
  updatingScenario,
  loadScores,
  onUpdateCompletion,
  onChangeProgram,
  showIntroduction,
  pendingIntent,
  onDismissIntroduction,
}: {
  program: TrainingProgram;
  completions: ScenarioCompletion[];
  scenarioScores: Map<string, ScoreInfo>;
  updatingScenario: string | null;
  loadScores: (userId: string) => Promise<void>;
  onUpdateCompletion: (scenarioName: string, status: string) => void;
  onChangeProgram: () => void;
  showIntroduction?: boolean;
  pendingIntent?: { intent: string; autoLoaded: boolean } | null;
  onDismissIntroduction?: () => void;
}) {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const scenarios: any[] = Array.isArray(program.scenarios_data) ? program.scenarios_data.filter(Boolean) : [];
  const completionMap = new Map(completions.map((c) => [c.scenario_name, c]));

  const completedCount = completions.filter((c) => c.status === 'completed').length;
  const totalCount = scenarios.length || program.scenario_count || 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const groups = new Map<string, any[]>();
  for (const s of scenarios) {
    const type = s.aimType || 'Other';
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(s);
  }

  const aimColor = getAimColor(program.aim_type);

  const overallRank = (() => {
    const achievedIndices: number[] = [];
    let refTiers: { name: string; color: string }[] = [];

    for (const s of scenarios) {
      const scoreInfo = scenarioScores.get(s.scenarioName);
      if (!scoreInfo || !scoreInfo.highScore) continue;

      const rt = scoreInfo.rankThresholds as any;
      if (!rt || !rt.tiers || !Array.isArray(rt.tiers)) continue;

      const tiers: { name: string; color: string; threshold: number }[] = rt.tiers;
      if (refTiers.length === 0) refTiers = tiers;

      const info = getRankFromThresholds(s.scenarioName, scoreInfo.highScore, rt);
      if (!info.isVoltaic) continue;

      let idx = -1;
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (tiers[i].name === info.rank) { idx = i; break; }
      }
      achievedIndices.push(idx);
    }

    if (achievedIndices.length === 0 || refTiers.length === 0) return null;

    const minIdx = Math.min(...achievedIndices);
    if (minIdx < 0 || minIdx >= refTiers.length) return null;

    const allAtOrAbove = achievedIndices.every(i => i >= minIdx);

    return {
      rank: refTiers[minIdx].name,
      color: refTiers[minIdx].color,
      isComplete: allAtOrAbove,
    };
  })();

  const handleSyncScores = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data: kProfile } = await supabase
        .from('kovaaks_profiles')
        .select('steam_id')
        .eq('user_id', user.id)
        .single();

      const steamId = kProfile?.steam_id;
      if (!steamId) {
        setSyncing(false);
        return;
      }

      const benchmarkId = findBenchmarkId(program.program_name);
      if (!benchmarkId) {
        setSyncing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('kovaaks-playlists', {
        body: { action: 'sync_benchmark_scores', benchmarkId, steamId },
      });

      if (!error && data?.success) {
        await loadScores(user.id);
      }
    } catch (e) {
      console.error('Score sync failed:', e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onChangeProgram}
          className="flex items-center gap-1.5 text-[#9CA8B3] hover:text-[#FF4655] text-sm font-['Inter'] mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Programs
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-['Rajdhani'] text-2xl font-bold text-[#ECE8E1] leading-tight">
                {program.program_name}
              </h1>
              {overallRank && (
                <span
                  className="text-xs font-bold font-['Inter'] px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5"
                  style={{
                    color: overallRank.color,
                    backgroundColor: overallRank.color + '18',
                    border: `1px solid ${overallRank.color}40`,
                  }}
                >
                  {overallRank.rank}
                  {overallRank.isComplete && (
                    <span className="opacity-70">Complete</span>
                  )}
                </span>
              )}
            </div>
            {isVerifiedPlaylist(program.program_name) && (
              <div className="mt-2 mb-1">
                <div className="flex items-center gap-2">
                  <VerifiedShieldIcon size={20} />
                  <span className="text-[#FFCA3A] text-xs font-bold font-['Inter'] uppercase tracking-wider">
                    Verified Learning Path
                  </span>
                </div>
                <p className="text-[#5A6872] text-[11px] font-['Inter'] mt-1 ml-7">
                  Full rank tracking &amp; coaching enabled
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {program.playlist_author && (
                <span className="text-[#9CA8B3] text-xs font-['Inter']">
                  by <span className="text-[#ECE8E1]/70">{program.playlist_author}</span>
                </span>
              )}
              {program.aim_type && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-['Inter'] uppercase tracking-wide"
                  style={{ backgroundColor: `${aimColor}20`, color: aimColor }}
                >
                  {program.aim_type}
                </span>
              )}
              {program.playlist_code && (
                <span className="text-[#5A6872] text-xs font-['JetBrains_Mono']">
                  #{program.playlist_code}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center bg-[#1C2B36] border border-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'card'
                    ? 'bg-[#FF4655]/20 text-[#FF4655]'
                    : 'text-[#5A6872] hover:text-[#9CA8B3]'
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#FF4655]/20 text-[#FF4655]'
                    : 'text-[#5A6872] hover:text-[#9CA8B3]'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleSyncScores}
              disabled={syncing}
              className="bg-[#FF4655] hover:bg-[#FF4655]/90 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-semibold font-['Inter'] flex items-center gap-2 transition-colors"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {syncing ? 'Syncing...' : 'Sync Scores'}
            </button>

            <button
              onClick={onChangeProgram}
              className="bg-[#1C2B36] border border-white/10 hover:border-[#FF4655]/30 text-[#9CA8B3] hover:text-[#FF4655] rounded-lg px-4 py-2 text-sm font-semibold font-['Inter'] transition-all"
            >
              Change Program
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 bg-[#1C2B36] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#9CA8B3] text-sm font-['Inter']">Session Progress</span>
            <span className="text-[#ECE8E1] text-sm font-['JetBrains_Mono'] font-semibold">
              {completedCount}/{totalCount}
              <span className="text-[#5A6872] ml-1">({progressPct}%)</span>
            </span>
          </div>
          <div className="h-2 bg-[#0F1923] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                backgroundColor: progressPct === 100 ? '#3DD598' : '#FF4655',
              }}
            />
          </div>
        </div>
      </div>

      {/* Playlist Introduction — shown above scenarios when auto-loaded */}
      {showIntroduction && pendingIntent && onDismissIntroduction && (
        <PlaylistIntroduction
          intent={pendingIntent.intent as 'warmup' | 'improve'}
          playlistName={program.program_name}
          scenarioCount={scenarios.length || program.scenario_count || 0}
          scenarios={scenarios}
          onDismiss={onDismissIntroduction}
        />
      )}

      {/* Scenario Groups */}
      {groups.size > 0 ? (
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([aimType, groupScenarios]) => {
            const groupColor = getAimColor(aimType);
            return (
              <section key={aimType}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: groupColor }} />
                  <h2 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
                    {aimType}
                  </h2>
                  <span className="text-[#5A6872] text-xs font-['JetBrains_Mono']">
                    ({groupScenarios.length})
                  </span>
                </div>

                {viewMode === 'card' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {groupScenarios.map((scenario: any, idx: number) => {
                      const comp = completionMap.get(scenario.scenarioName);
                      const status = comp?.status || 'pending';
                      return (
                        <ScenarioCard
                          key={`${scenario.scenarioName}-${idx}`}
                          scenarioName={scenario.scenarioName}
                          aimType={scenario.aimType}
                          status={status}
                          updating={updatingScenario === scenario.scenarioName}
                          scoreInfo={scenarioScores.get(scenario.scenarioName) || null}
                          onUpdate={(s) => onUpdateCompletion(scenario.scenarioName, s)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-[#2A3A47] border border-white/10 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_100px_200px_60px_100px] gap-2 px-4 py-2 border-b border-white/5 text-[10px] font-semibold font-['Inter'] uppercase tracking-wider text-[#5A6872]">
                      <span>Scenario</span>
                      <span className="text-center">Rank</span>
                      <span className="text-center">Score</span>
                      <span className="text-center">Plays</span>
                      <span className="text-center">Status</span>
                    </div>
                    {groupScenarios.map((scenario: any, idx: number) => {
                      const comp = completionMap.get(scenario.scenarioName);
                      const status = comp?.status || 'pending';
                      return (
                        <ScenarioRow
                          key={`${scenario.scenarioName}-${idx}`}
                          scenarioName={scenario.scenarioName}
                          status={status}
                          updating={updatingScenario === scenario.scenarioName}
                          scoreInfo={scenarioScores.get(scenario.scenarioName) || null}
                          onUpdate={(s) => onUpdateCompletion(scenario.scenarioName, s)}
                          isLast={idx === groupScenarios.length - 1}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#1C2B36] border border-white/10 rounded-xl p-12 text-center">
          <ListChecks className="w-12 h-12 text-[#5A6872] mx-auto mb-3" />
          <h3 className="font-['Rajdhani'] text-xl font-semibold text-[#9CA8B3]">No Scenarios Found</h3>
          <p className="text-[#5A6872] text-sm mt-1 font-['Inter']">
            This program doesn't have scenario data yet.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── DYNAMIC RANK CALCULATION FROM DATABASE THRESHOLDS ───
function getRankFromThresholds(
  _scenarioName: string,
  score: number,
  thresholds: Record<string, any>
): {
  isVoltaic: boolean;
  rank: string;
  color: string;
  progress: number;
  nextRank: string | null;
  nextColor: string | null;
  nextThreshold: number | null;
} {
  const tiers: { name: string; color: string; threshold: number }[] = thresholds.tiers || [];

  if (tiers.length === 0) {
    return getRankFromLegacyThresholds(score, thresholds);
  }

  let currentIdx = -1;
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (tiers[i].threshold > 0 && score >= tiers[i].threshold) {
      currentIdx = i;
      break;
    }
  }

  if (currentIdx === -1) {
    const firstThreshold = tiers[0]?.threshold || 0;
    const progress = firstThreshold > 0 ? Math.min(99, Math.round((score / firstThreshold) * 100)) : 0;
    return {
      isVoltaic: true,
      rank: 'Unranked',
      color: '#5A6872',
      progress,
      nextRank: tiers[0]?.name || null,
      nextColor: tiers[0]?.color || '#808080',
      nextThreshold: firstThreshold > 0 ? Math.round(firstThreshold - score) : null,
    };
  }

  const current = tiers[currentIdx];

  if (currentIdx >= tiers.length - 1) {
    return {
      isVoltaic: true,
      rank: current.name,
      color: current.color,
      progress: 100,
      nextRank: null,
      nextColor: null,
      nextThreshold: null,
    };
  }

  const next = tiers[currentIdx + 1];
  const range = next.threshold - current.threshold;
  const progress = range > 0 ? Math.min(99, Math.round(((score - current.threshold) / range) * 100)) : 0;
  const remaining = Math.round(next.threshold - score);

  return {
    isVoltaic: true,
    rank: current.name,
    color: current.color,
    progress,
    nextRank: next.name,
    nextColor: next.color,
    nextThreshold: remaining > 0 ? remaining : null,
  };
}

function getRankFromLegacyThresholds(
  score: number,
  thresholds: Record<string, number>
): {
  isVoltaic: boolean;
  rank: string;
  color: string;
  progress: number;
  nextRank: string | null;
  nextColor: string | null;
  nextThreshold: number | null;
} {
  const LEGACY_TIERS = [
    { key: 'iron', name: 'Iron', color: '#878787' },
    { key: 'bronze', name: 'Bronze', color: '#CD7F32' },
    { key: 'silver', name: 'Silver', color: '#C0C0C0' },
    { key: 'gold', name: 'Gold', color: '#FFD700' },
    { key: 'platinum', name: 'Platinum', color: '#3EDBD3' },
    { key: 'diamond', name: 'Diamond', color: '#B9F2FF' },
    { key: 'jade', name: 'Jade', color: '#00A86B' },
    { key: 'master', name: 'Master', color: '#FF4655' },
  ];

  let currentIdx = -1;
  for (let i = LEGACY_TIERS.length - 1; i >= 0; i--) {
    const t = thresholds[LEGACY_TIERS[i].key] || 0;
    if (t > 0 && score >= t) { currentIdx = i; break; }
  }

  if (currentIdx === -1) {
    const ironT = thresholds.iron || 0;
    return {
      isVoltaic: true, rank: 'Unranked', color: '#5A6872',
      progress: ironT > 0 ? Math.min(99, Math.round((score / ironT) * 100)) : 0,
      nextRank: 'Iron', nextColor: '#808080',
      nextThreshold: ironT > 0 ? Math.round(ironT - score) : null,
    };
  }

  const cur = LEGACY_TIERS[currentIdx];
  if (currentIdx >= LEGACY_TIERS.length - 1) {
    return { isVoltaic: true, rank: cur.name, color: cur.color, progress: 100, nextRank: null, nextColor: null, nextThreshold: null };
  }

  const nxt = LEGACY_TIERS[currentIdx + 1];
  const curT = thresholds[cur.key] || 0;
  const nxtT = thresholds[nxt.key] || 0;
  const range = nxtT - curT;
  const progress = range > 0 ? Math.min(99, Math.round(((score - curT) / range) * 100)) : 0;

  return {
    isVoltaic: true, rank: cur.name, color: cur.color, progress,
    nextRank: nxt.name, nextColor: nxt.color,
    nextThreshold: Math.round(nxtT - score) > 0 ? Math.round(nxtT - score) : null,
  };
}

// ─── VOLTAIC RANK HEALTH BAR ───
function VoltaicHealthBar({
  scenarioName,
  scoreInfo,
}: {
  scenarioName: string;
  scoreInfo: ScoreInfo | null;
}) {
  const score = scoreInfo?.highScore || 0;
  const dbThresholds = scoreInfo?.rankThresholds || null;

  const rankInfo = dbThresholds
    ? getRankFromThresholds(scenarioName, score, dbThresholds)
    : getScenarioRank(scenarioName, score);

  if (!scoreInfo || score === 0) {
    return (
      <div className="mt-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] text-[#5A6872] italic font-['Inter']">No score yet</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#1A2530] overflow-hidden">
          <div className="h-full rounded-full bg-[#2A3A47]" style={{ width: '0%' }} />
        </div>
      </div>
    );
  }

  if (!rankInfo.isVoltaic) {
    return (
      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs font-['JetBrains_Mono'] text-[#ECE8E1]">
          PR: {score.toLocaleString()}
        </span>
        {scoreInfo.plays > 0 && (
          <span className="text-[10px] text-[#5A6872] font-['Inter']">
            {scoreInfo.plays} plays
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          {rankInfo.nextRank && rankInfo.nextColor ? (
            <span
              className="text-[11px] font-bold font-['Inter'] px-1.5 py-0.5 rounded"
              style={{
                color: rankInfo.nextColor,
                backgroundColor: rankInfo.nextColor + '14',
                border: `1px solid ${rankInfo.nextColor}40`,
              }}
            >
              {rankInfo.nextRank}
            </span>
          ) : (
            <span
              className="text-[11px] font-bold font-['Inter'] px-1.5 py-0.5 rounded"
              style={{
                color: rankInfo.color,
                backgroundColor: rankInfo.color + '14',
                border: `1px solid ${rankInfo.color}40`,
              }}
            >
              {rankInfo.rank}
            </span>
          )}
          <span className="text-xs font-['JetBrains_Mono'] text-[#ECE8E1]">
            {score.toLocaleString()}
          </span>
        </div>
        {rankInfo.nextRank && rankInfo.nextThreshold && (
          <span className="text-[10px] text-[#5A6872] font-['Inter']">
            {rankInfo.nextThreshold.toLocaleString()} to go
          </span>
        )}
      </div>

      <div className="w-full h-2 rounded-full bg-[#1A2530] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${rankInfo.progress}%`,
            backgroundColor: rankInfo.nextColor || rankInfo.color,
          }}
        />
      </div>

      {scoreInfo.plays > 0 && (
        <div className="flex justify-end mt-0.5">
          <span className="text-[10px] text-[#5A6872] font-['Inter']">
            {scoreInfo.plays} plays
          </span>
        </div>
      )}
    </div>
  );
}

// ─── SCENARIO ROW (LIST VIEW) ───
function ScenarioRow({
  scenarioName,
  status,
  updating,
  scoreInfo,
  onUpdate,
  isLast,
}: {
  scenarioName: string;
  status: string;
  updating: boolean;
  scoreInfo: ScoreInfo | null;
  onUpdate: (status: string) => void;
  isLast: boolean;
}) {
  const score = scoreInfo?.highScore || 0;
  const dbThresholds = scoreInfo?.rankThresholds || null;

  const rankInfo = dbThresholds
    ? getRankFromThresholds(scenarioName, score, dbThresholds)
    : getScenarioRank(scenarioName, score);

  const isCompleted = status === 'completed';
  const needsPractice = status === 'not_completed';

  return (
    <div
      className={`grid grid-cols-[1fr_100px_200px_60px_100px] gap-2 px-4 py-2.5 items-center transition-colors hover:bg-white/[0.02] ${
        !isLast ? 'border-b border-white/5' : ''
      } ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-[#3DD598] shrink-0" />}
        {needsPractice && <AlertCircle className="w-3.5 h-3.5 text-[#FFCA3A] shrink-0" />}
        <span className="text-sm font-['Inter'] text-[#ECE8E1] truncate">
          {scenarioName}
        </span>
      </div>

      <div className="flex justify-center">
        {score > 0 && rankInfo.isVoltaic ? (
          <span
            className="text-[10px] font-bold font-['Inter'] px-2 py-0.5 rounded"
            style={{
              color: rankInfo.nextColor || rankInfo.color,
              backgroundColor: (rankInfo.nextColor || rankInfo.color) + '18',
              border: `1px solid ${rankInfo.nextColor || rankInfo.color}40`,
            }}
          >
            {rankInfo.nextRank || rankInfo.rank}
          </span>
        ) : (
          <span className="text-[10px] text-[#5A6872] font-['Inter']">—</span>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        {score > 0 ? (
          <>
            <span className="text-xs font-['JetBrains_Mono'] text-[#ECE8E1] w-[70px] text-right">
              {score.toLocaleString()}
            </span>
            {rankInfo.isVoltaic && (
              <div className="w-20 h-1.5 rounded-full bg-[#1A2530] overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(rankInfo.progress, 100)}%`,
                    backgroundColor: rankInfo.progress >= 100
                      ? rankInfo.color
                      : rankInfo.nextColor || rankInfo.color,
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <span className="text-[10px] text-[#5A6872] italic font-['Inter']">No score</span>
        )}
      </div>

      <div className="text-center">
        <span className="text-xs font-['JetBrains_Mono'] text-[#5A6872]">
          {scoreInfo?.plays || 0}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1">
        {updating ? (
          <Loader2 className="w-3.5 h-3.5 text-[#9CA8B3] animate-spin" />
        ) : (
          <>
            <button
              onClick={() => onUpdate('completed')}
              disabled={isCompleted}
              className={`p-1 rounded transition-all ${
                isCompleted
                  ? 'text-[#3DD598] cursor-default'
                  : 'text-[#5A6872] hover:text-[#3DD598] hover:bg-[#3DD598]/10'
              }`}
              title="Done"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdate('not_completed')}
              disabled={needsPractice}
              className={`p-1 rounded transition-all ${
                needsPractice
                  ? 'text-[#FFCA3A] cursor-default'
                  : 'text-[#5A6872] hover:text-[#FFCA3A] hover:bg-[#FFCA3A]/10'
              }`}
              title="Practice"
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdate('pending')}
              disabled={status === 'pending'}
              className="p-1 rounded text-[#5A6872] hover:text-[#9CA8B3] transition-all disabled:opacity-30 disabled:cursor-default"
              title="Reset"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ScenarioCard({
  scenarioName,
  aimType,
  status,
  updating,
  scoreInfo,
  onUpdate,
}: {
  scenarioName: string;
  aimType: string;
  status: string;
  updating: boolean;
  scoreInfo: ScoreInfo | null;
  onUpdate: (status: string) => void;
}) {
  const aimColor = getAimColor(aimType);
  const isCompleted = status === 'completed';
  const needsPractice = status === 'not_completed';

  const borderColor = isCompleted
    ? 'border-l-[#3DD598]'
    : needsPractice
    ? 'border-l-[#FFCA3A]'
    : 'border-l-transparent';

  return (
    <div
      className={`bg-[#2A3A47] border border-white/10 rounded-xl p-4 border-l-[3px] transition-all ${borderColor} ${
        isCompleted ? 'opacity-75' : ''
      }`}
    >
      {isCompleted && (
        <div className="flex items-center gap-1.5 mb-2">
          <CheckCircle className="w-3.5 h-3.5 text-[#3DD598]" />
          <span className="text-[#3DD598] text-[10px] font-semibold font-['Inter'] uppercase tracking-wider">
            Completed
          </span>
        </div>
      )}
      {needsPractice && (
        <div className="flex items-center gap-1.5 mb-2">
          <AlertCircle className="w-3.5 h-3.5 text-[#FFCA3A]" />
          <span className="text-[#FFCA3A] text-[10px] font-semibold font-['Inter'] uppercase tracking-wider">
            Needs Practice
          </span>
        </div>
      )}

      <h4 className="font-['Inter'] text-sm font-semibold text-[#ECE8E1] line-clamp-2 leading-snug">
        {scenarioName}
      </h4>

      {aimType && (
        <span
          className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold font-['Inter'] uppercase tracking-wide"
          style={{ backgroundColor: `${aimColor}20`, color: aimColor }}
        >
          {aimType}
        </span>
      )}

      <VoltaicHealthBar scenarioName={scenarioName} scoreInfo={scoreInfo} />

      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
        {updating ? (
          <div className="flex items-center justify-center w-full py-1">
            <Loader2 className="w-4 h-4 text-[#9CA8B3] animate-spin" />
          </div>
        ) : (
          <>
            <button
              onClick={() => onUpdate('completed')}
              disabled={isCompleted}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold font-['Inter'] transition-all ${
                isCompleted
                  ? 'bg-[#3DD598]/20 text-[#3DD598] cursor-default'
                  : 'bg-[#0F1923] text-[#9CA8B3] hover:bg-[#3DD598]/10 hover:text-[#3DD598]'
              }`}
              title="Mark as completed"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Done
            </button>
            <button
              onClick={() => onUpdate('not_completed')}
              disabled={needsPractice}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold font-['Inter'] transition-all ${
                needsPractice
                  ? 'bg-[#FFCA3A]/20 text-[#FFCA3A] cursor-default'
                  : 'bg-[#0F1923] text-[#9CA8B3] hover:bg-[#FFCA3A]/10 hover:text-[#FFCA3A]'
              }`}
              title="Needs practice"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Practice
            </button>
            <button
              onClick={() => onUpdate('pending')}
              disabled={status === 'pending'}
              className="flex items-center justify-center p-1.5 rounded-lg bg-[#0F1923] text-[#5A6872] hover:text-[#9CA8B3] transition-all disabled:opacity-30 disabled:cursor-default"
              title="Reset status"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
