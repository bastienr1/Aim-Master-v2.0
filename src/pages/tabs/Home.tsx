import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { relativeTime } from '@/lib/time';
import {
  RefreshCw, Crosshair,
  TrendingUp, TrendingDown, Minus, ArrowRight, Brain,
  AlertCircle, Link2
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer
} from 'recharts';
import { ProfileOnboarding } from '@/components/onboarding/ProfileOnboarding';

// New Battle Stats components
import { MentalGameBar } from '@/components/dashboard/MentalGameBar';
import { PRStreakTracker } from '@/components/dashboard/PRStreakTracker';
import { GoalRoadmap } from '@/components/dashboard/GoalRoadmap';
import { LastSessionCard } from '@/components/dashboard/LastSessionCard';
import { VaultTipCard } from '@/components/dashboard/VaultTipCard';
import { StartTrainingBar } from '@/components/dashboard/StartTrainingBar';
import { usePRDetection } from '@/hooks/usePRDetection';
import { useBenchmarkRadarData, BenchmarkScenarioRow } from '@/hooks/useBenchmarkRadarData';
import { useGoals } from '@/hooks/useGoals';
import { useGoalStrategy } from '@/hooks/useGoalStrategy';
import { useLastDebrief } from '@/hooks/useLastDebrief';
import { useVaultTip } from '@/hooks/useVaultTip';
import { getMomentumContext } from '@/utils/momentum-context';
import { SURFACE, TEXT, RADIUS, RED } from '@/constants/theme';

interface HomeProps {
  profile: any;
  onNavigate: (tab: string) => void;
  onRefresh?: () => Promise<void>;
	onTriggerCheckin?: () => void;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse ${className || ''}`}
      style={{ background: SURFACE.card, borderRadius: RADIUS.card }}
    />
  );
}

function SectionError({ onRetry, label }: { onRetry: () => void; label: string }) {
  return (
    <div
      className="p-6 text-center"
      style={{ background: SURFACE.card, border: `1px solid ${SURFACE.cardBorder}`, borderRadius: RADIUS.card }}
    >
      <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: `${RED}99` }} />
      <p className="text-sm font-['Inter'] mb-3" style={{ color: TEXT.body }}>Unable to load {label}</p>
      <button
        onClick={onRetry}
        className="text-sm font-semibold font-['Inter'] hover:underline"
        style={{ color: RED, background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        Retry
      </button>
    </div>
  );
}

export function Home({ profile, onNavigate, onRefresh, onTriggerCheckin }: HomeProps) {
  const { user } = useAuth();
  const prData = usePRDetection();
  const { primaryGoal } = useGoals();

  // Profile completeness check — wait for profile to load before deciding
  const isProfileLoaded = profile !== null && profile !== undefined;
  const isProfileComplete = isProfileLoaded && !!(profile?.main_game && profile?.username);

  // Sync status
  const [syncData, setSyncData] = useState<any>(null);
  const [loadingSync, setLoadingSync] = useState(true);
  const [errorSync, setErrorSync] = useState(false);

  // Momentum
  const [momentumData, setMomentumData] = useState<any>(null);
  const [loadingMomentum, setLoadingMomentum] = useState(true);
  const [errorMomentum, setErrorMomentum] = useState(false);


  // Benchmark Radar
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkScenarioRow[] | null>(null);

  const [syncing, setSyncing] = useState(false);

  // Journal sources for the Last session + vault tip cards
  const {
    debrief: lastDebrief,
    loading: loadingDebrief,
    reload: reloadDebrief,
    updateNextIntent,
  } = useLastDebrief();
  const vaultTip = useVaultTip(lastDebrief);

  const isConnected = !!syncData?.username;

  const loadSyncStatus = useCallback(async () => {
    if (!user) return;
    setLoadingSync(true);
    setErrorSync(false);
    try {
      const { data, error } = await supabase
        .from('kovaaks_profiles')
        .select('last_synced_at, username')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setSyncData(data);
    } catch {
      setErrorSync(true);
    } finally {
      setLoadingSync(false);
    }
  }, [user]);

  const loadMomentum = useCallback(async () => {
    if (!user) return;
    setLoadingMomentum(true);
    setErrorMomentum(false);
    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const { data, error } = await supabase
        .from('score_history')
        .select('score, session_date')
        .eq('user_id', user.id)
        .gte('session_date', fourteenDaysAgo.toISOString())
        .order('session_date', { ascending: true });
      if (error) throw error;

      if (!data || data.length < 3) {
        setMomentumData({ state: 'insufficient', delta: 0, sparkline: [], dataPoints: data?.length || 0 });
        return;
      }

      const byDay: Record<string, number[]> = {};
      data.forEach((d: any) => {
        const day = d.session_date?.split('T')[0];
        if (day) {
          if (!byDay[day]) byDay[day] = [];
          byDay[day].push(Number(d.score) || 0);
        }
      });

      const dailyAvgs = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, scores]) => ({
          day,
          avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        }));

      const mid = Math.floor(dailyAvgs.length / 2);
      const firstHalf = dailyAvgs.slice(0, mid);
      const secondHalf = dailyAvgs.slice(mid);

      const avgFirst = firstHalf.length > 0
        ? firstHalf.reduce((a, b) => a + b.avg, 0) / firstHalf.length
        : 0;
      const avgSecond = secondHalf.length > 0
        ? secondHalf.reduce((a, b) => a + b.avg, 0) / secondHalf.length
        : 0;

      const delta = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;

      let state: 'improving' | 'declining' | 'steady' | 'insufficient' = 'steady';
      if (delta > 3) state = 'improving';
      else if (delta < -3) state = 'declining';

      setMomentumData({
        state,
        delta: Math.round(delta * 10) / 10,
        sparkline: dailyAvgs.map((d) => ({ value: Math.round(d.avg) })),
        dataPoints: data.length,
      });
    } catch {
      setErrorMomentum(true);
    } finally {
      setLoadingMomentum(false);
    }
  }, [user]);


  const loadBenchmarkRadar = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_scenario_stats')
        .select(`
          high_score,
          current_rank,
          scenarios!inner(
            name,
            category,
            subcategory,
            benchmark_system,
            rank_thresholds
          )
        `)
        .eq('user_id', profile.id)
        .in('scenarios.benchmark_system', ['voltaic_novice', 'voltaic_intermediate'])
        .not('scenarios.subcategory', 'is', null)
        .not('scenarios.rank_thresholds', 'is', null);

      if (error) {
        console.error('Benchmark radar load error:', error);
        return;
      }

      setBenchmarkData(data as unknown as BenchmarkScenarioRow[]);
    } catch (err) {
      console.error('Benchmark radar error:', err);
    }
  }, [profile?.id]);

  const loadAllData = useCallback(async () => {
    setSyncing(true);
    await Promise.all([
      loadSyncStatus(),
      loadMomentum(),
      loadBenchmarkRadar(),
      reloadDebrief(),
    ]);
    setSyncing(false);
  }, [loadSyncStatus, loadMomentum, loadBenchmarkRadar, reloadDebrief]);

  useEffect(() => {
    if (isProfileComplete) {
      loadAllData();
    }
  }, [loadAllData, isProfileComplete]);

  // benchmarkData still loads: the radar component is gone from Home, but
  // GoalRoadmap's strategy is derived from these axes.
  const radarResult = useBenchmarkRadarData(benchmarkData);

  const goToTraining = useCallback(() => onNavigate('training'), [onNavigate]);

  // Goal-aware strategy
  const goalStrategy = useGoalStrategy(primaryGoal, radarResult.axes);
  const momentumContext = getMomentumContext(momentumData?.state, momentumData?.delta);

  const getMomentumConfig = () => {
    if (!momentumData) return { color: '#B9B6AF', icon: Minus, label: 'Loading...' };
    switch (momentumData.state) {
      case 'improving':
        return { color: '#3DD598', icon: TrendingUp, label: 'Improving' };
      case 'declining':
        return { color: '#FFCA3A', icon: TrendingDown, label: 'Declining' };
      case 'steady':
        return { color: '#B9B6AF', icon: Minus, label: 'Steady' };
      default:
        return { color: '#53CADC', icon: Minus, label: 'Gathering Data' };
    }
  };

  const momentumConfig = getMomentumConfig();

  const displayName = profile?.username || 'Trainee';

  // =========================================================
  // LOADING STATE — profile not yet fetched from Supabase
  // =========================================================
  if (!isProfileLoaded) {
    return (
      <div className="p-6 lg:p-8">
        <SkeletonBlock className="h-10 w-64 mb-2" />
        <SkeletonBlock className="h-5 w-96 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-80" />
        </div>
      </div>
    );
  }

  // =========================================================
  // PROFILE ONBOARDING — shown when main_game or username is missing
  // =========================================================
  if (isProfileLoaded && !isProfileComplete) {
    return (
      <ProfileOnboarding
        onComplete={async () => {
          if (onRefresh) await onRefresh();
        }}
      />
    );
  }

  // =========================================================
  // NOT-CONNECTED STATE — Welcome Hub with two feature cards
  // =========================================================
  if (!loadingSync && !errorSync && !isConnected) {
    return (
      <div className="p-6 lg:p-8 animate-slide-up">
        <style>{`
          @keyframes mentalGlow {
            0%, 100% { border-color: rgba(83,202,220,0.15); }
            50% { border-color: rgba(83,202,220,0.3); }
          }
        `}</style>

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="font-['Rajdhani'] text-[28px] font-bold text-[#E8E6E1]">
            Welcome to <span className="text-[#FF2A2A]">AIM MASTER</span>, {displayName}
          </h1>
          <p className="font-['Inter'] text-[14px] text-[#B9B6AF] mt-1">
            Your aim training companion — master the mechanics AND the mental game.
          </p>
        </div>

        {/* Two Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Card 1: Connect KovaaK's */}
          <div className="bg-[#18181B] border border-[#FF2A2A]/20 rounded-md p-8 flex flex-col order-2 md:order-1">
            <div className="w-12 h-12 rounded-md bg-[#131316] flex items-center justify-center mb-5">
              <Link2 className="w-6 h-6 text-[#FF2A2A]" />
            </div>
            <h2 className="font-['Rajdhani'] text-[20px] font-semibold text-[#E8E6E1] mb-2">
              Connect Your KovaaK's Account
            </h2>
            <p className="font-['Inter'] text-[14px] text-[#B9B6AF] mb-4">
              Link your profile to unlock personalized analytics, benchmark tracking, and performance insights.
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3DD598] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#B9B6AF]">Track benchmark progress across Voltaic & Viscose</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3DD598] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#B9B6AF]">See your aim type breakdown and weak areas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3DD598] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#B9B6AF]">Get coaching insights based on your real data</span>
              </div>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => onNavigate('profile')}
                className="w-full bg-[#FF2A2A] text-white rounded-md px-6 py-3 font-['Inter'] text-[14px] font-semibold hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
              >
                Connect Now <ArrowRight className="w-4 h-4" />
              </button>
              <p className="font-['Inter'] text-[11px] text-[#8E8B85] text-center mt-2">
                Requires a KovaaK's Steam account
              </p>
            </div>
          </div>

          {/* Card 2: Start Mental Game */}
          <div
            className="bg-[#18181B] border border-[#53CADC]/20 rounded-md p-8 flex flex-col order-1 md:order-2"
            style={{ animation: 'mentalGlow 4s ease-in-out infinite' }}
          >
            <div className="w-12 h-12 rounded-md bg-[#131316] flex items-center justify-center mb-5">
              <Brain className="w-6 h-6 text-[#53CADC]" />
            </div>
            <h2 className="font-['Rajdhani'] text-[20px] font-semibold text-[#E8E6E1] mb-2">
              Start Your Mental Game
            </h2>
            <p className="font-['Inter'] text-[14px] text-[#B9B6AF] mb-4">
              The best aimers train their mind, not just their mouse. Start with a 60-second readiness check-in.
            </p>
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#53CADC] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#B9B6AF]">Pre-training mental check-in (energy, focus, mood)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#53CADC] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#B9B6AF]">Track your consistency and readiness over time</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#53CADC] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#B9B6AF]">Coaching insights based on sports psychology</span>
              </div>
            </div>
            <p className="font-['Inter'] text-[12px] text-[#8E8B85] italic mb-6">
              Players who check in before training improve 23% faster.
            </p>
            <div className="mt-auto">
              <button
                onClick={() => onTriggerCheckin?.()}
                className="w-full border-2 border-[#53CADC] text-[#53CADC] bg-transparent rounded-md px-6 py-3 font-['Inter'] text-[14px] font-semibold hover:bg-[#53CADC]/10 transition-all inline-flex items-center justify-center gap-2"
              >
                Start Check-in <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="font-['Inter'] text-[11px] text-[#3DD598]">No KovaaK's account needed</span>
                <span className="bg-[#131316] text-[#B9B6AF] font-['Inter'] text-[11px] rounded-full px-2.5 py-0.5">⏱ 60 sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex justify-center gap-3 flex-wrap mt-8">
          <span className="bg-[#18181B] rounded-full px-4 py-2 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-[#B9B6AF]" />
            <span className="font-['Inter'] text-[12px] text-[#B9B6AF]">Performance Tracking</span>
          </span>
          <span className="bg-[#18181B] rounded-full px-4 py-2 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-[#B9B6AF]" />
            <span className="font-['Inter'] text-[12px] text-[#B9B6AF]">Mental Coaching</span>
          </span>
          <span className="bg-[#18181B] rounded-full px-4 py-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#B9B6AF]" />
            <span className="font-['Inter'] text-[12px] text-[#B9B6AF]">Smart Training</span>
          </span>
        </div>
      </div>
    );
  }

  // =========================================================
  // CONNECTED STATE — Full Dashboard (unchanged below)
  // =========================================================
  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1
            className="font-['Rajdhani'] text-[28px] font-bold"
            style={{ color: TEXT.primary }}
          >
            Welcome back, <span style={{ color: RED }}>{displayName}</span>
          </h1>
          <p className="text-sm font-['Inter'] mt-0.5" style={{ color: TEXT.label }}>
            Last synced: {relativeTime(syncData?.last_synced_at)}
          </p>
        </div>
        <button
          onClick={loadAllData}
          disabled={syncing}
          className="px-5 py-2.5 font-semibold font-['Inter'] text-sm transition-all inline-flex items-center gap-2 disabled:opacity-50 self-start"
          style={{ background: RED, color: '#FFFFFF', borderRadius: RADIUS.card, border: 'none' }}
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sync Now
        </button>
      </div>

      {/* Goal Roadmap — Hero position */}
      <div className="mb-6">
        <GoalRoadmap
          goal={primaryGoal}
          strategy={goalStrategy}
          onNavigate={onNavigate}
        />
      </div>

      {/* Section 1: Performance Momentum + PR Streak — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Performance Momentum */}
        <div>
          {loadingMomentum ? (
            <SkeletonBlock className="h-48" />
          ) : errorMomentum ? (
            <SectionError onRetry={loadMomentum} label="momentum" />
          ) : (
            <div
              className="p-5 h-full transition-all"
              style={{
                borderRadius: RADIUS.card,
                borderStyle: 'solid',
                borderWidth: '1px 1px 1px 4px',
                borderColor: `${SURFACE.cardBorder} ${SURFACE.cardBorder} ${SURFACE.cardBorder} ${momentumConfig.color}`,
                background: `linear-gradient(90deg, ${momentumConfig.color}0F, ${SURFACE.card} 60%)`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{ backgroundColor: SURFACE.iconBox, borderRadius: RADIUS.card }}
                  >
                    <momentumConfig.icon className="w-5 h-5" style={{ color: momentumConfig.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-['Rajdhani'] text-[15px] font-semibold" style={{ color: TEXT.primary }}>
                        Performance Momentum
                      </h3>
                      <span
                        className="text-[10px] font-semibold font-['Inter'] px-2 py-0.5"
                        style={{
                          backgroundColor: SURFACE.chip,
                          border: `1px solid ${momentumConfig.color}40`,
                          borderRadius: RADIUS.chip,
                          color: momentumConfig.color,
                        }}
                      >
                        {momentumConfig.label}
                      </span>
                    </div>
                    <p className="text-sm font-['JetBrains_Mono'] mt-1 font-bold" style={{ color: momentumConfig.color }}>
                      {momentumData.state === 'insufficient'
                        ? 'Gathering data...'
                        : `${momentumData.delta > 0 ? '+' : ''}${momentumData.delta}%`}
                    </p>
                  </div>
                </div>
                {momentumData.sparkline.length > 2 && (
                  <div className="hidden md:block w-24 h-[40px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={momentumData.sparkline}>
                        <defs>
                          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={momentumConfig.color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={momentumConfig.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke={momentumConfig.color} strokeWidth={2} fill="url(#sparkGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              {momentumData.state !== 'insufficient' && (
                <div className="mt-3 pt-3 space-y-0.5" style={{ borderTop: `1px solid ${SURFACE.insetBorder}` }}>
                  <p className="text-[11px] font-['Inter']" style={{ color: TEXT.label }}>{momentumContext.line1}</p>
                  <p className="text-[11px] font-['Inter']" style={{ color: TEXT.label }}>{momentumContext.line2}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PR Streak Tracker */}
        <div>
          <PRStreakTracker prData={prData} />
        </div>
      </div>

      {/* Mental Game Bar */}
      <MentalGameBar
        streakDays={profile?.checkin_streak || 0}
        onCheckin={() => onTriggerCheckin?.()}
        onNavigate={onNavigate}
      />

      {/* Section 3: Last session + vault tip — the journal core */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-7">
          <LastSessionCard
            debrief={lastDebrief}
            loading={loadingDebrief}
            onUpdateNextIntent={updateNextIntent}
            onStartTraining={goToTraining}
          />
        </div>
        <div className="lg:col-span-5">
          <VaultTipCard
            tip={vaultTip.tip}
            matchedOn={vaultTip.matchedOn}
            matchedTheme={vaultTip.matchedTheme}
            loading={vaultTip.loading}
            isEmpty={vaultTip.isEmpty}
            hasMultiple={vaultTip.hasMultiple}
            onNext={vaultTip.next}
          />
        </div>
      </div>

      {/* Section 4: Start training */}
      <div className="mb-6">
        <StartTrainingBar onStartTraining={goToTraining} />
      </div>

    </div>
  );
}
