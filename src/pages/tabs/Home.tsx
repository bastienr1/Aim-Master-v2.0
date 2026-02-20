import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { relativeTime, getCategoryColor } from '@/lib/time';
import {
  RefreshCw, Crosshair, Star, CalendarDays, FileText,
  TrendingUp, TrendingDown, Minus, ArrowRight, Brain,
  Sparkles, AlertCircle, Link2
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
import { ProfileOnboarding } from '@/components/onboarding/ProfileOnboarding';

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

  // Quick stats
  const [quickStats, setQuickStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(false);

  // Activity
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [errorActivity, setErrorActivity] = useState(false);

  // Charts
  const [chartData, setChartData] = useState<any>(null);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [errorCharts, setErrorCharts] = useState(false);

  // Coach
  const [coachData, setCoachData] = useState<any>(null);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [errorCoach, setErrorCoach] = useState(false);

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

  const loadQuickStats = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);
    setErrorStats(false);
    try {
      const { data: kp } = await supabase
        .from('kovaaks_profiles')
        .select('scenarios_played_count')
        .eq('user_id', user.id)
        .maybeSingle();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: recentCount } = await supabase
        .from('score_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('session_date', thirtyDaysAgo.toISOString());

      const { count: favCount } = await supabase
        .from('user_scenario_stats')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_favorite', true);

      const { data: allScores } = await supabase
        .from('score_history')
        .select('session_date')
        .eq('user_id', user.id);

      const uniqueDays = new Set(
        (allScores || []).map((s: any) => s.session_date?.split('T')[0]).filter(Boolean)
      );

      setQuickStats({
        scenariosPlayed: parseInt(String(kp?.scenarios_played_count || 0), 10),
        recentScores: recentCount || 0,
        favorites: favCount || 0,
        trainingDays: uniqueDays.size,
      });
    } catch {
      setErrorStats(true);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  const loadActivity = useCallback(async () => {
    if (!user) return;
    setLoadingActivity(true);
    setErrorActivity(false);
    try {
      const { data, error } = await supabase
        .from('score_history')
        .select('id, score, session_date, score_type, scenarios(name, category)')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      setActivityData(data || []);
    } catch {
      setErrorActivity(true);
    } finally {
      setLoadingActivity(false);
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

      const { data: topData, error: topErr } = await supabase
        .from('user_scenario_stats')
        .select('total_attempts, scenarios(name)')
        .eq('user_id', user.id)
        .order('total_attempts', { ascending: false })
        .limit(5);
      if (topErr) throw topErr;

      const topPlayed = (topData || []).map((t: any) => ({
        name: ((t.scenarios as any)?.name || 'Unknown').substring(0, 20),
        attempts: t.total_attempts || 0,
      }));

      setChartData({ distribution, topPlayed });
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
        .select('average_score, total_attempts, scenarios(category, name)')
        .eq('user_id', user.id);

      const catAvgs: Record<string, { total: number; count: number }> = {};
      (catStats || []).forEach((s: any) => {
        const cat = (s.scenarios as any)?.category || 'Other';
        if (!catAvgs[cat]) catAvgs[cat] = { total: 0, count: 0 };
        catAvgs[cat].total += Number(s.average_score) || 0;
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
      });
    } catch {
      setErrorCoach(true);
    } finally {
      setLoadingCoach(false);
    }
  }, [user]);

  const loadAllData = useCallback(async () => {
    setSyncing(true);
    await Promise.all([
      loadSyncStatus(),
      loadMomentum(),
      loadQuickStats(),
      loadActivity(),
      loadCharts(),
      loadCoach(),
    ]);
    setSyncing(false);
  }, [loadSyncStatus, loadMomentum, loadQuickStats, loadActivity, loadCharts, loadCoach]);

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

      {/* Section 1: Performance Momentum */}
      {loadingMomentum ? (
        <SkeletonBlock className="h-28 mb-6" />
      ) : errorMomentum ? (
        <div className="mb-6"><SectionError onRetry={loadMomentum} label="momentum" /></div>
      ) : (
        <div
          className="rounded-xl p-5 mb-6 bg-gradient-to-r from-[#1C2B36] to-[#2A3A47] border-l-4 transition-all"
          style={{ borderLeftColor: momentumConfig.color }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${momentumConfig.color}15` }}
              >
                <momentumConfig.icon className="w-6 h-6" style={{ color: momentumConfig.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
                    Performance Momentum
                  </h3>
                  <span
                    className="text-xs font-semibold font-['Inter'] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${momentumConfig.color}15`,
                      color: momentumConfig.color,
                    }}
                  >
                    {momentumConfig.label}
                  </span>
                </div>
                <p className="text-[#9CA8B3] text-sm font-['Inter'] mt-0.5">
                  {momentumData.state === 'insufficient'
                    ? `${momentumData.dataPoints} data points — need at least 3 for analysis`
                    : `${momentumData.delta > 0 ? '+' : ''}${momentumData.delta}% vs previous period`}
                </p>
              </div>
            </div>
            {momentumData.sparkline.length > 2 && (
              <div className="hidden md:block w-32 h-[60px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={momentumData.sparkline}>
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={momentumConfig.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={momentumConfig.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={momentumConfig.color}
                      strokeWidth={2}
                      fill="url(#sparkGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Quick Stats */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-28" />)}
        </div>
      ) : errorStats ? (
        <div className="mb-6"><SectionError onRetry={loadQuickStats} label="stats" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Scenarios Played', value: quickStats?.scenariosPlayed ?? 0, icon: Crosshair, color: '#53CADC' },
            { label: 'Recent Scores', value: quickStats?.recentScores ?? 0, icon: FileText, color: '#FF4655' },
            { label: 'Favorites', value: quickStats?.favorites ?? 0, icon: Star, color: '#FFCA3A' },
            { label: 'Training Days', value: quickStats?.trainingDays ?? 0, icon: CalendarDays, color: '#3DD598' },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-[#2A3A47] border border-white/10 rounded-xl p-5 hover:border-[#FF4655]/30 hover:shadow-lg hover:shadow-[#FF4655]/10 hover:-translate-y-0.5 transition-all duration-200 group cursor-default"
            >
              <div className="flex items-center gap-2 mb-3">
                <stat.icon
                  className="w-5 h-5 transition-colors duration-200 group-hover:!text-[#FF4655]"
                  style={{ color: stat.color }}
                />
                <span className="text-[#5A6872] text-xs font-['Inter'] uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="font-['JetBrains_Mono'] text-[32px] font-bold text-[#ECE8E1] leading-none group-hover:scale-105 transition-transform origin-left">
                {stat.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Section 3: Activity + Coach */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Activity */}
        <div>
          {loadingActivity ? (
            <SkeletonBlock className="h-96" />
          ) : errorActivity ? (
            <SectionError onRetry={loadActivity} label="activity" />
          ) : (
            <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6 h-full">
              <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-4">
                Recent Activity
              </h3>
              {activityData.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-[#5A6872] mx-auto mb-2" />
                  <p className="text-[#5A6872] text-sm font-['Inter']">No recent scores recorded</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activityData.map((item: any) => {
                    const scenarioName = (item.scenarios as any)?.name || 'Unknown';
                    const category = (item.scenarios as any)?.category || '';
                    const catColor = getCategoryColor(category);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group/row border-l-2 border-transparent hover:border-l-2"
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderLeftColor = catColor;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent';
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: catColor }}
                        />
                        <span className="text-[#ECE8E1] text-sm font-['Inter'] truncate flex-1">
                          {scenarioName}
                        </span>
                        <span className="font-['JetBrains_Mono'] text-sm font-semibold text-[#ECE8E1] shrink-0">
                          {Math.round(Number(item.score) || 0).toLocaleString()}
                        </span>
                        <span className="text-[#5A6872] text-xs font-['Inter'] shrink-0 hidden sm:block w-20 text-right">
                          {relativeTime(item.session_date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Coach Card */}
        <div>
          {loadingCoach || loadingMomentum ? (
            <SkeletonBlock className="h-96" />
          ) : errorCoach ? (
            <SectionError onRetry={loadCoach} label="coach insights" />
          ) : (
            <div className="bg-gradient-to-br from-[#1C2B36] to-[#2A3A47] border border-[#53CADC]/20 rounded-xl p-6 h-full breathing-border">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#53CADC]/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-[#53CADC]" />
                </div>
                <div>
                  <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">AI Coach</h3>
                  <p className="text-[#5A6872] text-xs font-['Inter']">Personalized insights</p>
                </div>
              </div>

              {coachState === 'improving' && (
                <div className="space-y-4">
                  <div className="bg-[#3DD598]/10 border border-[#3DD598]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-[#3DD598]" />
                      <span className="font-['Rajdhani'] font-semibold text-[#3DD598]">You're in the zone!</span>
                    </div>
                    <p className="text-[#9CA8B3] text-sm font-['Inter']">
                      Your scores are trending up. Keep pushing for new personal records!
                    </p>
                  </div>
                  {coachData?.strongest && (
                    <div className="bg-[#0F1923] rounded-xl p-4">
                      <span className="text-[#5A6872] text-xs font-['Inter'] uppercase tracking-wider">Strongest Area</span>
                      <p className="text-[#ECE8E1] text-sm font-['Inter'] mt-1">{coachData.strongest.category}</p>
                    </div>
                  )}
                </div>
              )}

              {coachState === 'declining' && (
                <div className="space-y-4">
                  <div className="bg-[#FFCA3A]/10 border border-[#FFCA3A]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-[#FFCA3A]" />
                      <span className="font-['Rajdhani'] font-semibold text-[#FFCA3A]">Time to recalibrate</span>
                    </div>
                    <p className="text-[#9CA8B3] text-sm font-['Inter']">
                      Scores are dipping. Consider focusing on your weakest area.
                    </p>
                  </div>
                  {coachData?.weakest && (
                    <div className="bg-[#0F1923] rounded-xl p-4">
                      <span className="text-[#5A6872] text-xs font-['Inter'] uppercase tracking-wider">Focus Area</span>
                      <p className="text-[#ECE8E1] text-sm font-['Inter'] mt-1">{coachData.weakest.category}</p>
                    </div>
                  )}
                  {coachData?.suggestedScenario && (
                    <div className="bg-[#0F1923] rounded-xl p-4">
                      <span className="text-[#5A6872] text-xs font-['Inter'] uppercase tracking-wider">Try This Scenario</span>
                      <p className="text-[#53CADC] text-sm font-['Inter'] mt-1">{coachData.suggestedScenario}</p>
                    </div>
                  )}
                </div>
              )}

              {coachState === 'inactive' && (
                <div className="space-y-4">
                  <div className="bg-[#9CA8B3]/10 border border-[#9CA8B3]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Crosshair className="w-4 h-4 text-[#9CA8B3]" />
                      <span className="font-['Rajdhani'] font-semibold text-[#9CA8B3]">Your aim is waiting</span>
                    </div>
                    <p className="text-[#9CA8B3] text-sm font-['Inter']">
                      It's been {coachData?.daysSinceLast} days since your last session. Jump back in to maintain your skills!
                    </p>
                  </div>
                </div>
              )}

              {coachState === 'insufficient' && (
                <div className="space-y-4">
                  <div className="bg-[#53CADC]/10 border border-[#53CADC]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-4 h-4 text-[#53CADC]" />
                      <span className="font-['Rajdhani'] font-semibold text-[#53CADC]">Getting to know your game</span>
                    </div>
                    <p className="text-[#9CA8B3] text-sm font-['Inter']">
                      Keep training! The AI coach needs more data to provide personalized insights.
                    </p>
                  </div>
                </div>
              )}

              {coachState === 'steady' && (
                <div className="space-y-4">
                  <div className="bg-[#9CA8B3]/10 border border-[#9CA8B3]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Minus className="w-4 h-4 text-[#9CA8B3]" />
                      <span className="font-['Rajdhani'] font-semibold text-[#9CA8B3]">Holding steady</span>
                    </div>
                    <p className="text-[#9CA8B3] text-sm font-['Inter']">
                      Your performance is consistent. Try pushing into new scenarios to break through plateaus.
                    </p>
                  </div>
                  {coachData?.weakest && (
                    <div className="bg-[#0F1923] rounded-xl p-4">
                      <span className="text-[#5A6872] text-xs font-['Inter'] uppercase tracking-wider">Weakest Area</span>
                      <p className="text-[#ECE8E1] text-sm font-['Inter'] mt-1">{coachData.weakest.category}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aim Type Distribution */}
        <div>
          {loadingCharts ? (
            <SkeletonBlock className="h-80" />
          ) : errorCharts ? (
            <SectionError onRetry={loadCharts} label="charts" />
          ) : (
            <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
              <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-4">
                Aim Type Distribution
              </h3>
              {!chartData?.distribution?.length ? (
                <div className="text-center py-8">
                  <p className="text-[#5A6872] text-sm font-['Inter']">No scenario data yet</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-full h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.distribution.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-['JetBrains_Mono'] text-2xl font-bold text-[#ECE8E1]">
                        {chartData.distribution.reduce((a: number, b: any) => a + b.value, 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {chartData.distribution.map((entry: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[#9CA8B3] text-xs font-['Inter']">
                          {entry.name} ({entry.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top 5 Most Played */}
        <div>
          {loadingCharts ? (
            <SkeletonBlock className="h-80" />
          ) : errorCharts ? (
            <SectionError onRetry={loadCharts} label="charts" />
          ) : (
            <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
              <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-4">
                Top 5 Most Played
              </h3>
              {!chartData?.topPlayed?.length ? (
                <div className="text-center py-8">
                  <p className="text-[#5A6872] text-sm font-['Inter']">No scenario data yet</p>
                </div>
              ) : (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.topPlayed}
                      layout="vertical"
                      margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#FF4655" />
                          <stop offset="100%" stopColor="#53CADC" />
                        </linearGradient>
                      </defs>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fill: '#9CA8B3', fontSize: 11, fontFamily: 'Inter' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1C2B36',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: '#ECE8E1',
                          fontFamily: 'Inter',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => [`${value} attempts`, 'Plays']}
                      />
                      <Bar
                        dataKey="attempts"
                        fill="url(#barGrad)"
                        radius={[0, 6, 6, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
