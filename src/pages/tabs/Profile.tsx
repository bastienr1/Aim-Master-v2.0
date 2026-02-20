import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { relativeTime } from '@/lib/time';
import {
  User, Flame, Trophy, Clock,
  Snowflake, Gamepad2, Save, Loader2, Settings
} from 'lucide-react';
import { KovaaksConnectCard } from '@/components/KovaaksConnectCard';

interface ProfileProps {
  profile: any;
  onRefresh: () => Promise<void>;
}

export function Profile({ profile, onRefresh }: ProfileProps) {
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable fields initialized from profile prop
  const [editUsername, setEditUsername] = useState('');
  const [editMainGame, setEditMainGame] = useState('');
  const [editCurrentTier, setEditCurrentTier] = useState('');

  // Sync local state when profile prop changes
  useEffect(() => {
    setEditUsername(profile?.username || '');
    setEditMainGame(profile?.main_game || '');
    setEditCurrentTier(profile?.current_tier || '');
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await supabase
        .from('profiles')
        .update({
          username: editUsername,
          main_game: editMainGame,
          current_tier: editCurrentTier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await onRefresh();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  // Email comes from auth, NOT from profiles table
  const userEmail = user?.email || '';

  if (!profile) {
    return (
      <div className="p-6 lg:p-8 animate-slide-up">
        <div className="mb-8">
          <h1 className="font-['Rajdhani'] text-[28px] font-bold text-[#ECE8E1]">Profile</h1>
          <p className="text-[#9CA8B3] text-sm mt-1 font-['Inter']">Manage your account and integrations</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#2A3A47] rounded-xl h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      <div className="mb-8">
        <h1 className="font-['Rajdhani'] text-[28px] font-bold text-[#ECE8E1]">Profile</h1>
        <p className="text-[#9CA8B3] text-sm mt-1 font-['Inter']">Manage your account and integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── SECTION 1 — Account Info ─── */}
        <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
          <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-[#53CADC]" />
            Account Info
          </h3>

          <div className="space-y-4">
            {/* Email — read-only, from auth */}
            <div>
              <label className="text-[#9CA8B3] text-xs font-['Inter'] uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <div className="bg-[#0F1923] border border-white/5 rounded-xl px-4 py-3">
                <p className="text-lg text-[#ECE8E1] font-['Inter']">{userEmail || '—'}</p>
              </div>
              <p className="text-[#5A6872] text-[11px] font-['Inter'] mt-1">Managed by authentication — cannot be changed here</p>
            </div>

            {/* Username — editable */}
            <div>
              <label className="text-[#9CA8B3] text-xs font-['Inter'] uppercase tracking-wider block mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full bg-[#0F1923] border border-white/10 rounded-xl px-4 py-3 text-lg text-[#ECE8E1] font-['Inter'] placeholder-[#5A6872] focus:outline-none focus:border-[#FF4655]/50 focus:ring-1 focus:ring-[#FF4655]/20 transition-all"
                placeholder="Your username"
              />
            </div>

            {/* Main Game — editable */}
            <div>
              <label className="text-[#9CA8B3] text-xs font-['Inter'] uppercase tracking-wider block mb-1.5">
                Main Game
              </label>
              <input
                type="text"
                value={editMainGame}
                onChange={(e) => setEditMainGame(e.target.value)}
                className="w-full bg-[#0F1923] border border-white/10 rounded-xl px-4 py-3 text-lg text-[#ECE8E1] font-['Inter'] placeholder-[#5A6872] focus:outline-none focus:border-[#FF4655]/50 focus:ring-1 focus:ring-[#FF4655]/20 transition-all"
                placeholder="e.g. Valorant, CS2, Apex"
              />
            </div>

            {/* Current Tier — editable */}
            <div>
              <label className="text-[#9CA8B3] text-xs font-['Inter'] uppercase tracking-wider block mb-1.5">
                Current Tier
              </label>
              <input
                type="text"
                value={editCurrentTier}
                onChange={(e) => setEditCurrentTier(e.target.value)}
                className="w-full bg-[#0F1923] border border-white/10 rounded-xl px-4 py-3 text-lg text-[#ECE8E1] font-['Inter'] placeholder-[#5A6872] focus:outline-none focus:border-[#FF4655]/50 focus:ring-1 focus:ring-[#FF4655]/20 transition-all"
                placeholder="e.g. Gold, Diamond, Immortal"
              />
            </div>

            {/* Save button */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#FF4655] text-white px-6 py-2.5 rounded-xl text-sm font-semibold font-['Inter'] hover:bg-[#FF4655]/90 transition-all shadow-lg shadow-[#FF4655]/20 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saveSuccess && (
                <p className="text-[#3DD598] text-sm font-['Inter'] animate-slide-up">Profile updated!</p>
              )}
            </div>
          </div>
        </div>

        {/* ─── SECTION 2 — Training Stats ─── */}
        <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
          <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-5 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFCA3A]" />
            Training Stats
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Training Hours */}
            <div className="bg-[#0F1923] border border-white/5 rounded-xl px-4 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-[#53CADC]" />
                <span className="text-[#9CA8B3] text-xs font-['Inter'] uppercase tracking-wider">Training Hours</span>
              </div>
              <p className="text-lg text-[#ECE8E1] font-['Inter'] font-bold">
                {profile.total_training_hours != null
                  ? Number(profile.total_training_hours).toFixed(1)
                  : '0.0'}
              </p>
            </div>

            {/* Current Streak */}
            <div className="bg-[#0F1923] border border-white/5 rounded-xl px-4 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Flame className="w-3.5 h-3.5 text-[#FF4655]" />
                <span className="text-[#9CA8B3] text-xs font-['Inter'] uppercase tracking-wider">Current Streak</span>
              </div>
              <p className="text-lg text-[#ECE8E1] font-['Inter'] font-bold">
                {profile.current_streak ?? 0} <span className="text-sm text-[#5A6872] font-normal">days</span>
              </p>
            </div>

            {/* Longest Streak */}
            <div className="bg-[#0F1923] border border-white/5 rounded-xl px-4 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy className="w-3.5 h-3.5 text-[#FFCA3A]" />
                <span className="text-[#9CA8B3] text-xs font-['Inter'] uppercase tracking-wider">Longest Streak</span>
              </div>
              <p className="text-lg text-[#ECE8E1] font-['Inter'] font-bold">
                {profile.longest_streak ?? 0} <span className="text-sm text-[#5A6872] font-normal">days</span>
              </p>
            </div>

            {/* Streak Freeze */}
            <div className="bg-[#0F1923] border border-white/5 rounded-xl px-4 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Snowflake className="w-3.5 h-3.5 text-[#53CADC]" />
                <span className="text-[#9CA8B3] text-xs font-['Inter'] uppercase tracking-wider">Streak Freeze</span>
              </div>
              <p className="text-lg font-['Inter'] font-bold">
                {profile.streak_freeze_available ? (
                  <span className="text-[#3DD598]">Available</span>
                ) : (
                  <span className="text-[#5A6872]">Used</span>
                )}
              </p>
            </div>
          </div>

          {/* Last Training — full width */}
          <div className="mt-3 bg-[#0F1923] border border-white/5 rounded-xl px-4 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Gamepad2 className="w-3.5 h-3.5 text-[#3DD598]" />
              <span className="text-[#9CA8B3] text-xs font-['Inter'] uppercase tracking-wider">Last Training</span>
            </div>
            <p className="text-lg text-[#ECE8E1] font-['Inter']">
              {relativeTime(profile.last_training_date)}
            </p>
          </div>
        </div>

        {/* ─── KovaaK's Integration ─── */}
        <KovaaksConnectCard />

        {/* ─── Discover Benchmarks (temporary test button) ─── */}
        <div>
          <button
            onClick={async () => {
              const steamId = '76561198008792117';
              const testIds = [458, 459, 460, 475];
              const results: string[] = [];
              for (const id of testIds) {
                try {
                  const { data } = await supabase.functions.invoke('kovaaks-playlists', {
                    body: { action: 'get_benchmark_scores', benchmarkId: id, steamId }
                  });
                  console.log('RAW ID ' + id + ':', JSON.stringify(data).substring(0, 300));
                  if (data?.success && data?.data?.categories) {
                    const cats = data.data.categories;
                    const firstScenario = (Object.values(cats) as any[]).find((c: any) => c.scenarios)?.scenarios;
                    const name = firstScenario ? Object.keys(firstScenario)[0] : 'no scenarios';
                    results.push(id + ': rank=' + data.data.overall_rank + ' -> ' + name);
                  } else {
                    results.push(id + ': ' + JSON.stringify(data).substring(0, 100));
                  }
                } catch (e) {
                  results.push(id + ': ERROR ' + e);
                }
              }
              alert(results.join('\n'));
            }}
            className="bg-[#53CADC] hover:bg-[#53CADC]/90 text-white rounded-lg px-4 py-2 text-sm font-semibold font-['Inter'] mt-4 w-full"
          >
            Discover Benchmarks
          </button>
        </div>

        {/* ─── Preferences placeholder ─── */}
        <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
          <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#FFCA3A]" />
            Preferences
          </h3>
          <p className="text-[#5A6872] text-sm font-['Inter']">
            Notification settings, theme preferences, and more coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
