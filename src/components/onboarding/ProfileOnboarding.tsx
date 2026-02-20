import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Crosshair, ChevronRight, Gamepad2 } from 'lucide-react';

interface ProfileOnboardingProps {
  onComplete: () => void;
}

const GAMES = [
  { id: 'valorant', name: 'Valorant', icon: '🎯' },
  { id: 'cs2', name: 'Counter-Strike 2', icon: '💣' },
  { id: 'apex', name: 'Apex Legends', icon: '⚡' },
  { id: 'overwatch2', name: 'Overwatch 2', icon: '🛡️' },
  { id: 'fortnite', name: 'Fortnite', icon: '🔨' },
  { id: 'other', name: 'Other', icon: '🎮' },
];

const RANKS: Record<string, { id: string; name: string }[]> = {
  valorant: [
    { id: 'Iron', name: 'Iron' },
    { id: 'Bronze', name: 'Bronze' },
    { id: 'Silver', name: 'Silver' },
    { id: 'Gold', name: 'Gold' },
    { id: 'Platinum', name: 'Platinum' },
    { id: 'Diamond', name: 'Diamond' },
    { id: 'Ascendant', name: 'Ascendant' },
    { id: 'Immortal', name: 'Immortal' },
    { id: 'Radiant', name: 'Radiant' },
  ],
  cs2: [
    { id: 'Silver', name: 'Silver' },
    { id: 'Gold Nova', name: 'Gold Nova' },
    { id: 'Master Guardian', name: 'Master Guardian' },
    { id: 'Legendary Eagle', name: 'Legendary Eagle' },
    { id: 'Supreme', name: 'Supreme' },
    { id: 'Global Elite', name: 'Global Elite' },
  ],
  apex: [
    { id: 'Bronze', name: 'Bronze' },
    { id: 'Silver', name: 'Silver' },
    { id: 'Gold', name: 'Gold' },
    { id: 'Platinum', name: 'Platinum' },
    { id: 'Diamond', name: 'Diamond' },
    { id: 'Masters', name: 'Masters' },
    { id: 'Predator', name: 'Predator' },
  ],
  overwatch2: [
    { id: 'Bronze', name: 'Bronze' },
    { id: 'Silver', name: 'Silver' },
    { id: 'Gold', name: 'Gold' },
    { id: 'Platinum', name: 'Platinum' },
    { id: 'Diamond', name: 'Diamond' },
    { id: 'Masters', name: 'Masters' },
    { id: 'Grandmaster', name: 'Grandmaster' },
    { id: 'Champion', name: 'Champion' },
  ],
  fortnite: [
    { id: 'Open', name: 'Open League' },
    { id: 'Contender', name: 'Contender League' },
    { id: 'Champion', name: 'Champion League' },
    { id: 'Unreal', name: 'Unreal' },
  ],
  other: [
    { id: 'Beginner', name: 'Beginner' },
    { id: 'Intermediate', name: 'Intermediate' },
    { id: 'Advanced', name: 'Advanced' },
    { id: 'Expert', name: 'Expert' },
  ],
};

export function ProfileOnboarding({ onComplete }: ProfileOnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedRank, setSelectedRank] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          main_game: selectedGame,
          current_tier: selectedRank,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0F1923' }}>
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#FF4655]/10 flex items-center justify-center mx-auto mb-4">
            <Crosshair className="w-8 h-8 text-[#FF4655]" />
          </div>
          <h1 className="font-['Rajdhani'] text-[32px] font-bold text-[#ECE8E1]">
            Set Up Your Profile
          </h1>
          <p className="font-['Inter'] text-[14px] text-[#9CA8B3] mt-1">
            Quick setup so we can personalize your training.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: step === i ? '32px' : '8px',
                backgroundColor: step >= i ? '#FF4655' : '#2A3A47',
              }}
            />
          ))}
        </div>

        {/* Step 0: Username */}
        {step === 0 && (
          <div className="animate-slide-up">
            <div className="bg-[#1C2B36] border border-white/10 rounded-2xl p-8">
              <label className="block font-['Inter'] text-[12px] text-[#9CA8B3] uppercase tracking-wider mb-3">
                What should we call you?
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your gaming alias"
                maxLength={24}
                className="w-full bg-[#0F1923] border border-white/10 rounded-xl px-4 py-3 text-[#ECE8E1] font-['Inter'] text-[16px] placeholder-[#5A6872] focus:outline-none focus:border-[#FF4655]/50 transition-colors"
                autoFocus
              />
              <p className="font-['Inter'] text-[11px] text-[#5A6872] mt-2">
                This is how you'll appear in AIM MASTER.
              </p>
            </div>
            <button
              onClick={() => {
                if (username.trim().length >= 2) setStep(1);
              }}
              disabled={username.trim().length < 2}
              className="w-full mt-6 bg-[#FF4655] text-white rounded-xl px-6 py-3.5 font-['Inter'] text-[14px] font-semibold hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Game Selection */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div className="bg-[#1C2B36] border border-white/10 rounded-2xl p-8">
              <label className="block font-['Inter'] text-[12px] text-[#9CA8B3] uppercase tracking-wider mb-4">
                What's your main game?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {GAMES.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => {
                      setSelectedGame(game.id);
                      setSelectedRank('');
                    }}
                    className="flex items-center gap-3 p-4 rounded-xl border transition-all text-left"
                    style={{
                      backgroundColor: selectedGame === game.id ? 'rgba(255,70,85,0.1)' : '#0F1923',
                      borderColor: selectedGame === game.id ? 'rgba(255,70,85,0.4)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <span className="text-xl">{game.icon}</span>
                    <span className="font-['Inter'] text-[13px] text-[#ECE8E1]">{game.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(0)}
                className="flex-1 border border-white/10 text-[#9CA8B3] rounded-xl px-6 py-3.5 font-['Inter'] text-[14px] font-semibold hover:bg-white/5 transition-all"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (selectedGame) setStep(2);
                }}
                disabled={!selectedGame}
                className="flex-1 bg-[#FF4655] text-white rounded-xl px-6 py-3.5 font-['Inter'] text-[14px] font-semibold hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Rank Selection */}
        {step === 2 && (
          <div className="animate-slide-up">
            <div className="bg-[#1C2B36] border border-white/10 rounded-2xl p-8">
              <label className="block font-['Inter'] text-[12px] text-[#9CA8B3] uppercase tracking-wider mb-4">
                What's your current rank in {GAMES.find(g => g.id === selectedGame)?.name}?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(RANKS[selectedGame] || RANKS.other).map((rank) => (
                  <button
                    key={rank.id}
                    onClick={() => setSelectedRank(rank.id)}
                    className="p-3 rounded-xl border transition-all text-center"
                    style={{
                      backgroundColor: selectedRank === rank.id ? 'rgba(255,70,85,0.1)' : '#0F1923',
                      borderColor: selectedRank === rank.id ? 'rgba(255,70,85,0.4)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <span className="font-['Inter'] text-[13px] text-[#ECE8E1]">{rank.name}</span>
                  </button>
                ))}
              </div>
              <p className="font-['Inter'] text-[11px] text-[#5A6872] mt-3">
                This helps us calibrate your training recommendations.
              </p>
            </div>

            {error && (
              <div className="mt-4 bg-[#FF4655]/10 border border-[#FF4655]/30 rounded-xl px-4 py-3">
                <p className="font-['Inter'] text-[13px] text-[#FF4655]">{error}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-white/10 text-[#9CA8B3] rounded-xl px-6 py-3.5 font-['Inter'] text-[14px] font-semibold hover:bg-white/5 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedRank || saving}
                className="flex-1 bg-[#FF4655] text-white rounded-xl px-6 py-3.5 font-['Inter'] text-[14px] font-semibold hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Let's Go <Gamepad2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
