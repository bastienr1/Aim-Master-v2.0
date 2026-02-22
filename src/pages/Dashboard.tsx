import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Target, BarChart3, Award, TrendingUp, BookOpen, User, LogOut,
  Calendar, Menu, X, Brain
} from 'lucide-react';
import { Home } from './tabs/Home';
import { Training } from './tabs/Training';
import { Stats } from './tabs/Stats';
import { Coach } from './tabs/Coach';
import { Goals } from './tabs/Goals';
import { Sessions } from './tabs/Sessions';
import { Profile } from './tabs/Profile';
import { MentalGame } from './MentalGame';
import { PreTrainingCheckin } from '@/components/mental-game/PreTrainingCheckin';
import { usePreTrainingGate } from '@/hooks/usePreTrainingGate';
import { useCheckinStreak } from '@/hooks/useCheckinStreak';
import { CheckinButton } from '@/components/dashboard/CheckinButton';
import { CheckinStreakCard } from '@/components/dashboard/CheckinStreakCard';
import { PostSessionDebrief } from '@/components/post-session/PostSessionDebrief';
import { WelcomeBackModal } from '@/components/post-session/WelcomeBackModal';
import { usePostSessionGate } from '@/hooks/usePostSessionGate';
import { useSessionDetection } from '@/hooks/useSessionDetection';
import type { GroupedSession } from '@/types/debrief';

type Tab = 'home' | 'training' | 'mental' | 'stats' | 'coach' | 'goals' | 'sessions' | 'profile';

const navItems: { id: Tab; label: string; icon: any }[] = [
  { id: 'home', label: 'Dashboard', icon: Target },
  { id: 'training', label: 'Training', icon: Calendar },
  { id: 'mental', label: 'Mental Game', icon: Brain },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'coach', label: 'AI Coach', icon: Award },
  { id: 'goals', label: 'Goals', icon: TrendingUp },
  { id: 'sessions', label: 'Sessions', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function Dashboard() {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    return (sessionStorage.getItem('aim-master-tab') as Tab) || 'home';
  });
  const [profile, setProfile] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Manual check-in gate (no auto-trigger — that's handled inside Training)
  const { showCheckin, triggerCheckin, dismissCheckin, completeCheckin } = usePreTrainingGate(false);

  // Streak data for the dashboard
  const streak = useCheckinStreak();

  // Post-session debrief gate and session detection
  const { showDebrief, triggerDebrief, dismissDebrief, completeDebrief, forceShowDebrief } = usePostSessionGate();
  const { sessionData, detectSession, clearSession, resetDetection, setEmptySessionData } = useSessionDetection();

  // ─── Session lifecycle state ───
  const [sessionActive, setSessionActive] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  const handleSessionStart = useCallback(() => {
    setSessionActive(true);
    setShowWelcomeBack(true);
    setShowFloatingBar(false);
    resetDetection();
  }, [resetDetection]);

  const handleSessionEnd = useCallback(() => {
    setSessionActive(false);
    setShowWelcomeBack(false);
    setShowFloatingBar(false);
  }, []);

  // CHANGE 1 — Pending intent state
  const [pendingIntent, setPendingIntent] = useState<{ intent: string; autoLoaded: boolean } | null>(null);

  // ─── Sync & Debrief handler (called by WelcomeBackModal + floating End Session) ───
  // Sync is bonus context, not a gate. Debrief ALWAYS opens.
  const handleSyncAndDebrief = useCallback(async (): Promise<boolean> => {
    console.log('[handleSyncAndDebrief] Starting...');

    // Try to detect session data (sync + score lookup) — but don't gate on it
    let session: Awaited<ReturnType<typeof detectSession>> = null;
    try {
      session = await detectSession();
      console.log('[handleSyncAndDebrief] detectSession result:', session ? 'SESSION FOUND' : 'NULL (proceeding anyway)');
    } catch (err) {
      console.error('[handleSyncAndDebrief] detectSession error (proceeding anyway):', err);
    }

    // If no session data, create a minimal empty session so debrief can still open
    if (!session) {
      const now = new Date().toISOString();
      const emptySession: GroupedSession = {
        sessionStart: now,
        sessionEnd: now,
        durationSeconds: 0,
        plays: [],
        scenarioCount: 0,
        categories: {},
        prsDetected: [],
        scoreTrajectory: [],
        scoresDeclined: false,
        hasNewScenario: false,
      };
      setEmptySessionData(emptySession);
    }

    // Always open debrief — triggerDebrief checks cooldown, force-bypass it
    setShowWelcomeBack(false);
    const triggered = await triggerDebrief();
    console.log('[handleSyncAndDebrief] triggerDebrief result:', triggered);

    if (triggered) {
      handleSessionEnd();
      return true;
    }

    // If triggerDebrief returned false (cooldown), force it open anyway during testing
    console.log('[handleSyncAndDebrief] Cooldown blocked — force-opening debrief');
    forceShowDebrief();
    handleSessionEnd();
    return true;
  }, [detectSession, triggerDebrief, handleSessionEnd, setEmptySessionData, forceShowDebrief]);

  // Focus listener: re-show Welcome Back modal on return, or fallback auto-detect
  useEffect(() => {
    const handleFocus = async () => {
      if (sessionActive) {
        // If floating bar is showing, user chose "Not done yet" — respect that choice
        // Only re-show modal if neither modal nor floating bar is visible
        if (!showFloatingBar) {
          setShowWelcomeBack(true);
        }
        return;
      }
      // No explicit session → try auto-detect debrief (original behavior)
      const session = await detectSession();
      if (session) {
        await triggerDebrief();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [sessionActive, showFloatingBar, detectSession, triggerDebrief]);

  // CHANGE 2 — Intent handlers
  const handleIntentComplete = useCallback((intent: string) => {
    setPendingIntent({ intent, autoLoaded: true });
  }, []);

  const handleSwitchToTraining = useCallback(() => {
    setActiveTab('training');
  }, []);

  useEffect(() => {
    sessionStorage.setItem('aim-master-tab', activeTab);
  }, [activeTab]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    setProfile(data);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Force home tab when profile is incomplete (new user after registration)
  useEffect(() => {
    if (profile !== null && profile !== undefined) {
      const isComplete = !!(profile?.main_game && profile?.username);
      if (!isComplete && activeTab !== 'home') {
        setActiveTab('home');
        sessionStorage.setItem('aim-master-tab', 'home');
      }
    }
  }, [profile, activeTab]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab as Tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="h-screen flex bg-[#0F1923] overflow-hidden">
      {/* Global manual check-in modal — CHANGE 3: pass intent props */}
      <PreTrainingCheckin
        isOpen={showCheckin}
        onClose={dismissCheckin}
        onComplete={completeCheckin}
        onIntentComplete={handleIntentComplete}
        onSwitchToTraining={handleSwitchToTraining}
      />

      {/* Welcome Back modal — session active confirmation + debrief trigger */}
      <WelcomeBackModal
        isOpen={showWelcomeBack && sessionActive && !showDebrief}
        onSyncAndDebrief={handleSyncAndDebrief}
        onNotDoneYet={() => {
          setShowWelcomeBack(false);
          setShowFloatingBar(true);
        }}
        onDismiss={() => {
          setShowWelcomeBack(false);
          setShowFloatingBar(true);
        }}
      />

      {/* Floating session control bar — shown when modal is dismissed */}
      {showFloatingBar && sessionActive && !showDebrief && !showWelcomeBack && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="flex items-center gap-2 bg-[#1C2B36] border border-[#53CADC]/30 rounded-2xl px-4 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
            {/* Pulse dot */}
            <div className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
              <div className="absolute w-2.5 h-2.5 rounded-full bg-[#53CADC] animate-ping opacity-40" />
              <div className="w-2 h-2 rounded-full bg-[#53CADC]" />
            </div>
            <span className="text-[#9CA8B3] text-xs font-['Inter'] font-medium whitespace-nowrap">
              Session active
            </span>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button
              onClick={() => {
                setShowFloatingBar(false);
                setShowWelcomeBack(true);
              }}
              className="text-[#53CADC] hover:text-[#53CADC]/80 text-xs font-semibold font-['Inter'] whitespace-nowrap transition-colors"
            >
              Continue Session
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={() => {
                setShowFloatingBar(false);
                handleSyncAndDebrief();
              }}
              className="text-[#FF4655] hover:text-[#FF4655]/80 text-xs font-semibold font-['Inter'] whitespace-nowrap transition-colors"
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {/* Post-session debrief modal */}
      <PostSessionDebrief
        isOpen={showDebrief}
        onClose={dismissDebrief}
        onComplete={() => {
          completeDebrief();
          clearSession();
        }}
        sessionData={sessionData}
      />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1C2B36] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF4655] to-[#FF4655]/70 flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <span className="font-['Rajdhani'] text-lg font-bold text-[#ECE8E1]">
            AIM<span className="text-[#FF4655]">MASTER</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckinButton onClick={triggerCheckin} />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#9CA8B3] hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute top-[57px] left-0 right-0 bg-[#1C2B36] border-b border-white/10 p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium font-['Inter'] transition-all ${
                  activeTab === item.id
                    ? 'bg-[#FF4655] text-white'
                    : 'text-[#9CA8B3] hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium font-['Inter'] text-[#9CA8B3] hover:bg-white/5 hover:text-[#FF4655] transition-all mt-2"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#1C2B36] border-r border-white/10 flex-col shrink-0">
        {/* Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF4655] to-[#FF4655]/70 flex items-center justify-center shadow-lg shadow-[#FF4655]/20">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-['Rajdhani'] text-xl font-bold text-[#ECE8E1] leading-none">
                AIM<span className="text-[#FF4655]">MASTER</span>
              </h1>
              <p className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-widest mt-0.5">
                Training Companion
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium font-['Inter'] transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-[#FF4655] text-white shadow-lg shadow-[#FF4655]/20'
                  : 'text-[#9CA8B3] hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Check-in button in sidebar */}
        <div className="px-3 pb-2">
          <CheckinButton onClick={triggerCheckin} />
        </div>

        {/* Sign out */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium font-['Inter'] text-[#9CA8B3] hover:bg-white/5 hover:text-[#FF4655] transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-[57px] lg:pt-0">
        <div style={{ display: activeTab === 'home' ? 'block' : 'none' }}>
          <Home profile={profile} onNavigate={handleNavigate} onRefresh={loadProfile} onTriggerCheckin={triggerCheckin} />
          {/* Streak card injected at the top of the home tab content area */}
          <div className="px-6 lg:px-8 -mt-4 mb-6">
            <CheckinStreakCard streak={streak} />
          </div>
        </div>
        {/* CHANGE 3 — Pass pendingIntent and onClearIntent to Training */}
        <div style={{ display: activeTab === 'training' ? 'block' : 'none' }}>
          <Training
            profile={profile}
            onRefresh={loadProfile}
            pendingIntent={pendingIntent}
            onClearIntent={() => setPendingIntent(null)}
            sessionActive={sessionActive}
            onSessionStart={handleSessionStart}
            onSyncAndDebrief={handleSyncAndDebrief}
            onSessionCancel={handleSessionEnd}
          />
        </div>
        <div style={{ display: activeTab === 'mental' ? 'block' : 'none' }}>
          <MentalGame onTriggerCheckin={triggerCheckin} />
        </div>
        <div style={{ display: activeTab === 'stats' ? 'block' : 'none' }}>
          <Stats />
        </div>
        <div style={{ display: activeTab === 'coach' ? 'block' : 'none' }}>
          <Coach />
        </div>
        <div style={{ display: activeTab === 'goals' ? 'block' : 'none' }}>
          <Goals />
        </div>
        <div style={{ display: activeTab === 'sessions' ? 'block' : 'none' }}>
          <Sessions />
        </div>
        <div style={{ display: activeTab === 'profile' ? 'block' : 'none' }}>
          <Profile profile={profile} onRefresh={loadProfile} />
        </div>
      </main>
    </div>
  );
}
