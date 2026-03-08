import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { relativeTime, getCategoryColor } from '@/lib/time';
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
import { SkillRadar } from '@/components/dashboard/SkillRadar';
import { MissionBriefingV2 } from '@/components/dashboard/MissionBriefingV2';
import { MentalGameBar } from '@/components/dashboard/MentalGameBar';
import { PRStreakTracker } from '@/components/dashboard/PRStreakTracker';
import { BenchmarkRadar } from '@/components/dashboard/BenchmarkRadar';
import { GoalRoadmap } from '@/components/dashboard/GoalRoadmap';
import { usePRDetection } from '@/hooks/usePRDetection';
import { useBenchmarkRadarData, BenchmarkScenarioRow } from '@/hooks/useBenchmarkRadarData';
import { useGoals } from '@/hooks/useGoals';
import { useGoalStrategy } from '@/hooks/useGoalStrategy';
import { getMomentumContext } from '@/utils/momentum-context';

interface HomeProps {
  profile: any;
  onNavigate: (tab: string) => void;
  onRefresh?: () => Promise<void>;
	onTriggerCheckin?: () => void;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#2A3A47] rounded-xl ${className || ''}`} />;
}

function SectionError({ onRetry, label }: { onRetry: () => void; label: string }) {
  return (
    <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6 text-center">
      <AlertCircle className="w-8 h-8 text-[#FF4655]/60 mx-auto mb-2" />
      <p className="text-[#9CA8B3] text-sm font-['Inter'] mb-3">Unable to load {label}</p>
      <button
        onClick={onRetry}
        className="text-[#FF4655] text-sm font-semibold font-['Inter'] hover:underline"
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


  // Charts
  const [chartData, setChartData] = useState<any>(null);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [errorCharts, setErrorCharts] = useState(false);

  // Coach
  const [coachData, setCoachData] = useState<any>(null);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [errorCoach, setErrorCoach] = useState(false);

  // Benchmark Radar
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkScenarioRow[] | null>(null);

  const [syncing, setSyncing] = useState(false);

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


  const loadCharts = useCallback(async () => {
    if (!user) return;
    setLoadingCharts(true);
    setErrorCharts(false);
    try {
      const { data: statsData, error: statsErr } = await supabase
        .from('user_scenario_stats')
        .select('scenario_id, scenarios(category)')
        .eq('user_id', user.id);
      if (statsErr) throw statsErr;

      const catCounts: Record<string, number> = {};
      (statsData || []).forEach((s: any) => {
        const cat = (s.scenarios as any)?.category || 'Other';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });
      const distribution = Object.entries(catCounts).map(([name, value]) => ({
        name,
        value,
        color: getCategoryColor(name),
      }));

      setChartData({ distribution });
    } catch {
      setErrorCharts(true);
    } finally {
      setLoadingCharts(false);
    }
  }, [user]);

  const loadCoach = useCallback(async () => {
    if (!user) return;
    setLoadingCoach(true);
    setErrorCoach(false);
    try {
      const { data: lastSession } = await supabase
        .from('score_history')
        .select('session_date')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(1);

      const lastDate = lastSession?.[0]?.session_date;
      const daysSinceLast = lastDate
        ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const { data: catStats } = await supabase
        .from('user_scenario_stats')
        .select('high_score, total_attempts, scenarios(category, name)')
        .eq('user_id', user.id);

      const catAvgs: Record<string, { total: number; count: number }> = {};
      (catStats || []).forEach((s: any) => {
        const cat = (s.scenarios as any)?.category || 'Other';
        if (!catAvgs[cat]) catAvgs[cat] = { total: 0, count: 0 };
        catAvgs[cat].total += Number(s.high_score) || 0;
        catAvgs[cat].count += 1;
      });

      const catAverages = Object.entries(catAvgs).map(([cat, v]) => ({
        category: cat,
        avg: v.count > 0 ? v.total / v.count : 0,
      }));

      let weakest = catAverages.length > 0
        ? catAverages.reduce((a, b) => (a.avg < b.avg ? a : b))
        : null;
      let strongest = catAverages.length > 0
        ? catAverages.reduce((a, b) => (a.avg > b.avg ? a : b))
        : null;

      let suggestedScenario: string | null = null;
      if (weakest) {
        const weakCatStats = (catStats || []).filter(
          (s: any) => (s.scenarios as any)?.category === weakest!.category
        );
        if (weakCatStats.length > 0) {
          const least = weakCatStats.reduce((a: any, b: any) =>
            (a.total_attempts || 0) < (b.total_attempts || 0) ? a : b
          );
          suggestedScenario = (least.scenarios as any)?.name || null;
        }
      }

      setCoachData({
        daysSinceLast,
        weakest,
        strongest,
        suggestedScenario,
        totalStats: catStats?.length || 0,
        catAverages,
      });
    } catch {
      setErrorCoach(true);
    } finally {
      setLoadingCoach(false);
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
      loadCharts(),
      loadCoach(),
      loadBenchmarkRadar(),
    ]);
    setSyncing(false);
  }, [loadSyncStatus, loadMomentum, loadCharts, loadCoach, loadBenchmarkRadar]);

  useEffect(() => {
    if (isProfileComplete) {
      loadAllData();
    }
  }, [loadAllData, isProfileComplete]);

  const getCoachState = () => {
    if (!coachData || coachData.totalStats < 3) return 'insufficient';
    if (coachData.daysSinceLast >= 3) return 'inactive';
    if (momentumData?.state === 'improving') return 'improving';
    if (momentumData?.state === 'declining') return 'declining';
    return 'steady';
  };

  const coachState = getCoachState();
  const radarResult = useBenchmarkRadarData(benchmarkData);

  // Goal-aware strategy
  const goalStrategy = useGoalStrategy(primaryGoal, radarResult.axes);
  const momentumContext = getMomentumContext(momentumData?.state, momentumData?.delta);

  const getMomentumConfig = () => {
    if (!momentumData) return { color: '#9CA8B3', icon: Minus, label: 'Loading...' };
    switch (momentumData.state) {
      case 'improving':
        return { color: '#3DD598', icon: TrendingUp, label: 'Improving' };
      case 'declining':
        return { color: '#FFCA3A', icon: TrendingDown, label: 'Declining' };
      case 'steady':
        return { color: '#9CA8B3', icon: Minus, label: 'Steady' };
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
          <h1 className="font-['Rajdhani'] text-[28px] font-bold text-[#ECE8E1]">
            Welcome to <span className="text-[#FF4655]">AIM MASTER</span>, {displayName}
          </h1>
          <p className="font-['Inter'] text-[14px] text-[#9CA8B3] mt-1">
            Your aim training companion — master the mechanics AND the mental game.
          </p>
        </div>

        {/* Two Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Card 1: Connect KovaaK's */}
          <div className="bg-[#1C2B36] border border-[#FF4655]/20 rounded-2xl p-8 flex flex-col order-2 md:order-1">
            <div className="w-12 h-12 rounded-xl bg-[#2A3A47] flex items-center justify-center mb-5">
              <Link2 className="w-6 h-6 text-[#FF4655]" />
            </div>
            <h2 className="font-['Rajdhani'] text-[20px] font-semibold text-[#ECE8E1] mb-2">
              Connect Your KovaaK's Account
            </h2>
            <p className="font-['Inter'] text-[14px] text-[#9CA8B3] mb-4">
              Link your profile to unlock personalized analytics, benchmark tracking, and performance insights.
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3DD598] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#9CA8B3]">Track benchmark progress across Voltaic & Viscose</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3DD598] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#9CA8B3]">See your aim type breakdown and weak areas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3DD598] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#9CA8B3]">Get coaching insights based on your real data</span>
              </div>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => onNavigate('profile')}
                className="w-full bg-[#FF4655] text-white rounded-xl px-6 py-3 font-['Inter'] text-[14px] font-semibold hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
              >
                Connect Now <ArrowRight className="w-4 h-4" />
              </button>
              <p className="font-['Inter'] text-[11px] text-[#5A6872] text-center mt-2">
                Requires a KovaaK's Steam account
              </p>
            </div>
          </div>

          {/* Card 2: Start Mental Game */}
          <div
            className="bg-[#1C2B36] border border-[#53CADC]/20 rounded-2xl p-8 flex flex-col order-1 md:order-2"
            style={{ animation: 'mentalGlow 4s ease-in-out infinite' }}
          >
            <div className="w-12 h-12 rounded-xl bg-[#2A3A47] flex items-center justify-center mb-5">
              <Brain className="w-6 h-6 text-[#53CADC]" />
            </div>
            <h2 className="font-['Rajdhani'] text-[20px] font-semibold text-[#ECE8E1] mb-2">
              Start Your Mental Game
            </h2>
            <p className="font-['Inter'] text-[14px] text-[#9CA8B3] mb-4">
              The best aimers train their mind, not just their mouse. Start with a 60-second readiness check-in.
            </p>
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#53CADC] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#9CA8B3]">Pre-training mental check-in (energy, focus, mood)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#53CADC] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#9CA8B3]">Track your consistency and readiness over time</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#53CADC] shrink-0" />
                <span className="font-['Inter'] text-[13px] text-[#9CA8B3]">Coaching insights based on sports psychology</span>
              </div>
            </div>
            <p className="font-['Inter'] text-[12px] text-[#5A6872] italic mb-6">
              Players who check in before training improve 23% faster.
            </p>
            <div className="mt-auto">
              <button
                onClick={() => onTriggerCheckin?.()}
                className="w-full border-2 border-[#53CADC] text-[#53CADC] bg-transparent rounded-xl px-6 py-3 font-['Inter'] text-[14px] font-semibold hover:bg-[#53CADC]/10 transition-all inline-flex items-center justify-center gap-2"
              >
                Start Check-in <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="font-['Inter'] text-[11px] text-[#3DD598]">No KovaaK's account needed</span>
                <span className="bg-[#2A3A47] text-[#9CA8B3] font-['Inter'] text-[11px] rounded-full px-2.5 py-0.5">⏱ 60 sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex justify-center gap-3 flex-wrap mt-8">
          <span className="bg-[#1C2B36] rounded-full px-4 py-2 flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-[#9CA8B3]" />
            <span className="font-['Inter'] text-[12px] text-[#9CA8B3]">Performance Tracking</span>
          </span>
          <span className="bg-[#1C2B36] rounded-full px-4 py-2 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-[#9CA8B3]" />
            <span className="font-['Inter'] text-[12px] text-[#9CA8B3]">Mental Coaching</span>
          </span>
          <span className="bg-[#1C2B36] rounded-full px-4 py-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#9CA8B3]" />
            <span className="font-['Inter'] text-[12px] text-[#9CA8B3]">Smart Training</span>
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
          <h1 className="font-['Rajdhani'] text-[28px] font-bold text-[#ECE8E1]">
            Welcome back, <span className="text-[#FF4655]">{displayName}</span>
          </h1>
          <p className="text-[#9CA8B3] text-sm font-['Inter'] mt-0.5">
            Last synced: {relativeTime(syncData?.last_synced_at)}
          </p>
        </div>
        <button
          onClick={loadAllData}
          disabled={syncing}
          className="bg-[#FF4655] text-white px-5 py-2.5 rounded-xl font-semibold font-['Inter'] text-sm hover:bg-[#FF4655]/90 transition-all shadow-lg shadow-[#FF4655]/20 inline-flex items-center gap-2 disabled:opacity-50 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sync Now
        </button>
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
              className="rounded-xl p-5 h-full bg-gradient-to-r from-[#1C2B36] to-[#2A3A47] border-l-4 transition-all"
              style={{
                borderLeftColor: momentumConfig.color,
                borderColor: `${momentumConfig.color}18`,
                border: `1px solid ${momentumConfig.color}18`,
                borderLeft: `4px solid ${momentumConfig.color}`,
                boxShadow: momentumData?.state === 'improving'
                  ? '0 0 24px rgba(61,213,152,0.04)'
                  : momentumData?.state === 'declining'
                  ? '0 0 24px rgba(255,202,58,0.04)'
                  : 'none',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${momentumConfig.color}15` }}
                  >
                    <momentumConfig.icon className="w-5 h-5" style={{ color: momentumConfig.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-['Rajdhani'] text-[15px] font-semibold text-[#ECE8E1]">
                        Performance Momentum
                      </h3>
                      <span
                        className="text-[10px] font-semibold font-['Inter'] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${momentumConfig.color}15`,
                          color: momentumConfig.color,
                        }}
                      >
                        {momentumConfig.label}
                      </span>
                    </div>
                    <p className="text-[#9CA8B3] text-sm font-['JetBrains_Mono'] mt-1 font-bold" style={{ color: momentumConfig.color }}>
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
                <div className="mt-3 pt-3 border-t border-white/5 space-y-0.5">
                  <p className="text-[#5A6872] text-[11px] font-['Inter']">{momentumContext.line1}</p>
                  <p className="text-[#5A6872] text-[11px] font-['Inter']">{momentumContext.line2}</p>
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

      {/* Goal Roadmap */}
      <div className="mb-6">
        <GoalRoadmap
          goal={primaryGoal}
          strategy={goalStrategy}
          onNavigate={onNavigate}
        />
      </div>

      {/* Mental Game Bar */}
      <MentalGameBar
        streakDays={profile?.checkin_streak || 0}
        onCheckin={() => onTriggerCheckin?.()}
        onNavigate={onNavigate}
      />

      {/* Section 3: Mission Briefing + Battle Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Mission Briefing */}
        <div>
          {loadingCoach || loadingMomentum ? (
            <SkeletonBlock className="h-96" />
          ) : errorCoach ? (
            <SectionError onRetry={loadCoach} label="coach insights" />
          ) : (
            <MissionBriefingV2
              coachState={coachState}
              coachData={coachData}
              momentumData={momentumData}
              onNavigate={onNavigate}
              goalStrategy={goalStrategy}
            />
          )}
        </div>

        {/* Battle Stats Radar */}
        <div>
          {loadingCharts ? (
            <SkeletonBlock className="h-96" />
          ) : errorCharts ? (
            <SectionError onRetry={loadCharts} label="charts" />
          ) : radarResult.hasData ? (
            <BenchmarkRadar
              axes={radarResult.axes}
              overallRank={radarResult.overallRank}
              overallPercentile={radarResult.overallPercentile}
              strongest={radarResult.strongest}
              weakest={radarResult.weakest}
            />
          ) : (
            <SkillRadar
              distribution={chartData?.distribution}
              categoryScores={coachData?.catAverages}
            />
          )}
        </div>
      </div>

    </div>
  );
}
