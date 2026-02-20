import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  KovaaksService,
  KovaaksProfile,
  SyncResults,
} from '../services/KovaaksService';
import {
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Gamepad2,
  Globe,
  Star,
  Unlink,
} from 'lucide-react';
import { relativeTime } from '../lib/time';

type CardState = 'loading' | 'not-connected' | 'syncing' | 'connected';

export function KovaaksConnectCard() {
  const { user } = useAuth();

  const [cardState, setCardState] = useState<CardState>('loading');
  const [usernameInput, setUsernameInput] = useState('');
  const [validatedProfile, setValidatedProfile] = useState<KovaaksProfile | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!user) return;
    try {
      const status = await KovaaksService.getSyncStatus(user.id);
      if (status.connected) {
        setConnectedUsername(status.username);
        setLastSynced(status.lastSynced);
        setSyncStatus(status.syncStatus);
        setCardState('connected');
      } else {
        setCardState('not-connected');
      }
    } catch {
      setCardState('not-connected');
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleValidate = async () => {
    if (!usernameInput.trim()) return;
    setIsValidating(true);
    setError(null);
    setValidatedProfile(null);

    const result = await KovaaksService.validateUsername(usernameInput.trim());

    if (result.valid && result.profile) {
      setValidatedProfile(result.profile);
    } else {
      setError(result.error || 'Username not found on KovaaK\'s. Check spelling and try again.');
    }
    setIsValidating(false);
  };

  const handleConnectAndSync = async () => {
    if (!validatedProfile) return;
    setCardState('syncing');
    setIsSyncing(true);
    setError(null);
    setSyncResults(null);

    const result = await KovaaksService.fullSync(usernameInput.trim());

    if (result.success && result.results) {
      setSyncResults(result.results);
      setConnectedUsername(usernameInput.trim());
      setLastSynced(new Date().toISOString());
      setSyncStatus('synced');
      setCardState('connected');
    } else {
      setError(result.error || 'Sync failed. Please try again.');
      setCardState('not-connected');
    }
    setIsSyncing(false);
  };

  const handleResync = async () => {
    if (!connectedUsername) return;
    setCardState('syncing');
    setIsSyncing(true);
    setError(null);
    setSyncResults(null);

    const result = await KovaaksService.fullSync(connectedUsername);

    if (result.success && result.results) {
      setSyncResults(result.results);
      setLastSynced(new Date().toISOString());
      setSyncStatus('synced');
      setCardState('connected');
    } else {
      setError(result.error || 'Re-sync failed. Please try again.');
      setCardState('connected');
    }
    setIsSyncing(false);
  };

  const handleDisconnect = () => {
    setCardState('not-connected');
    setConnectedUsername(null);
    setLastSynced(null);
    setSyncStatus(null);
    setValidatedProfile(null);
    setSyncResults(null);
    setUsernameInput('');
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating && usernameInput.trim()) {
      handleValidate();
    }
  };

  // Loading state
  if (cardState === 'loading') {
    return (
      <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-[#1C2B36] rounded w-48 mb-4" />
        <div className="h-4 bg-[#1C2B36] rounded w-64 mb-3" />
        <div className="h-12 bg-[#1C2B36] rounded mb-3" />
        <div className="h-10 bg-[#1C2B36] rounded w-32" />
      </div>
    );
  }

  // STATE 2 — Syncing
  if (cardState === 'syncing') {
    return (
      <div className="bg-[#2A3A47] border border-[#53CADC]/30 rounded-xl p-8 text-center breathing-border">
        <div className="w-16 h-16 rounded-2xl bg-[#53CADC]/10 flex items-center justify-center mx-auto mb-5">
          <Loader2 className="w-8 h-8 text-[#53CADC] animate-spin" />
        </div>
        <h3 className="font-['Rajdhani'] text-xl font-bold text-[#ECE8E1] mb-2">
          Syncing your KovaaK's data...
        </h3>
        <p className="text-[#9CA8B3] text-sm font-['Inter']">
          This may take a minute
        </p>
      </div>
    );
  }

  // STATE 3 — Connected
  if (cardState === 'connected') {
    return (
      <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6 border-l-4 border-l-[#3DD598] transition-all duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-['Rajdhani'] text-xl font-bold text-[#ECE8E1] flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[#3DD598]" />
            KovaaK's Integration
          </h3>
          <span className="inline-flex items-center gap-1.5 bg-[#3DD598]/10 text-[#3DD598] text-xs font-semibold font-['Inter'] px-3 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Connected
          </span>
        </div>

        <div className="space-y-3 mb-5">
          <div className="bg-[#0F1923] rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-[#5A6872] text-xs font-['Inter'] uppercase tracking-wider block mb-0.5">
                Username
              </span>
              <span className="font-['JetBrains_Mono'] text-sm font-semibold text-[#ECE8E1]">
                {connectedUsername}
              </span>
            </div>
            <User className="w-4 h-4 text-[#53CADC]" />
          </div>

          <div className="bg-[#0F1923] rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-[#5A6872] text-xs font-['Inter'] uppercase tracking-wider block mb-0.5">
                Last Synced
              </span>
              <span className="text-[#9CA8B3] text-sm font-['Inter']">
                {relativeTime(lastSynced)}
              </span>
            </div>
            <RefreshCw className="w-4 h-4 text-[#53CADC]" />
          </div>

          {syncStatus && (
            <div className="bg-[#0F1923] rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-[#5A6872] text-xs font-['Inter'] uppercase tracking-wider block mb-0.5">
                  Status
                </span>
                <span className={`text-sm font-['Inter'] font-medium ${
                  syncStatus === 'synced' ? 'text-[#3DD598]' :
                  syncStatus === 'syncing' ? 'text-[#53CADC]' :
                  syncStatus === 'error' ? 'text-[#FF4655]' :
                  'text-[#9CA8B3]'
                }`}>
                  {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
                </span>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${
                syncStatus === 'synced' ? 'bg-[#3DD598]' :
                syncStatus === 'syncing' ? 'bg-[#53CADC] animate-pulse' :
                syncStatus === 'error' ? 'bg-[#FF4655]' :
                'bg-[#9CA8B3]'
              }`} />
            </div>
          )}
        </div>

        {/* Sync results banner */}
        {syncResults && (
          <div className="bg-[#3DD598]/10 border border-[#3DD598]/20 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#3DD598]" />
              <span className="font-['Rajdhani'] font-semibold text-[#3DD598] text-sm">
                Sync Complete
              </span>
            </div>
            <p className="text-[#9CA8B3] text-sm font-['Inter']">
              <span className="font-['JetBrains_Mono'] text-[#ECE8E1] font-semibold">{syncResults.recentScores}</span> scores,{' '}
              <span className="font-['JetBrains_Mono'] text-[#ECE8E1] font-semibold">{syncResults.favorites}</span> favorites,{' '}
              <span className="font-['JetBrains_Mono'] text-[#ECE8E1] font-semibold">{syncResults.scenariosPlayed}</span> scenarios synced
            </p>
          </div>
        )}

        {error && (
          <div className="bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-[#FF4655]" />
              <span className="text-[#FF4655] text-sm font-['Inter']">{error}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleResync}
            disabled={isSyncing}
            className="border border-[#53CADC] text-[#53CADC] rounded-lg px-4 py-2 text-sm font-semibold font-['Inter'] hover:bg-[#53CADC]/10 transition-all duration-200 inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Re-sync
          </button>
          <button
            onClick={handleDisconnect}
            className="text-[#9CA8B3] text-sm font-['Inter'] hover:text-[#FF4655] transition-colors duration-200 inline-flex items-center gap-1.5"
          >
            <Unlink className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // STATE 1 — Not Connected
  return (
    <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6 transition-all duration-200">
      <h3 className="font-['Rajdhani'] text-xl font-bold text-[#ECE8E1] mb-2 flex items-center gap-2">
        <Gamepad2 className="w-5 h-5 text-[#FF4655]" />
        Connect KovaaK's Account
      </h3>
      <p className="text-[#9CA8B3] text-sm font-['Inter'] mb-5">
        Enter your KovaaK's username to sync your training data
      </p>

      {/* Username input */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={usernameInput}
          onChange={(e) => {
            setUsernameInput(e.target.value);
            setError(null);
            setValidatedProfile(null);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-[#1C2B36] border border-white/10 rounded-lg px-4 py-3 text-[#ECE8E1] text-sm font-['Inter'] placeholder-[#5A6872] focus:outline-none focus:border-[#FF4655]/50 focus:ring-1 focus:ring-[#FF4655]/20 transition-all duration-200"
          placeholder="Enter your KovaaK's username"
          disabled={isValidating}
        />
        <button
          onClick={handleValidate}
          disabled={isValidating || !usernameInput.trim()}
          className="bg-[#FF4655] text-white rounded-lg px-6 py-3 text-sm font-semibold font-['Inter'] hover:bg-[#FF4655]/90 transition-all duration-200 shadow-lg shadow-[#FF4655]/20 inline-flex items-center gap-2 disabled:opacity-50 shrink-0"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validating...
            </>
          ) : (
            'Validate'
          )}
        </button>
      </div>

      {/* Validation error */}
      {error && !validatedProfile && (
        <div className="bg-[#FF4655]/10 border border-[#FF4655]/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-[#FF4655] shrink-0" />
            <span className="text-[#FF4655] text-sm font-['Inter']">{error}</span>
          </div>
        </div>
      )}

      {/* Validated profile info */}
      {validatedProfile && (
        <div className="bg-[#0F1923] border border-[#3DD598]/20 rounded-xl p-5 mb-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-[#3DD598]" />
            <span className="text-[#3DD598] text-sm font-semibold font-['Inter']">Username verified</span>
          </div>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            {validatedProfile.avatar ? (
              <img
                src={validatedProfile.avatar}
                alt={validatedProfile.username}
                className="w-14 h-14 rounded-xl object-cover border-2 border-white/10"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#2A3A47] flex items-center justify-center border-2 border-white/10">
                <User className="w-6 h-6 text-[#5A6872]" />
              </div>
            )}

            {/* Info grid */}
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2">
              {validatedProfile.steamName && (
                <div>
                  <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider block">
                    Steam Name
                  </span>
                  <span className="text-[#ECE8E1] text-sm font-['Inter']">
                    {validatedProfile.steamName}
                  </span>
                </div>
              )}
              {validatedProfile.country && (
                <div>
                  <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider block">
                    Country
                  </span>
                  <span className="text-[#ECE8E1] text-sm font-['Inter'] flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[#53CADC]" />
                    {validatedProfile.country}
                  </span>
                </div>
              )}
              {validatedProfile.scenariosPlayed && (
                <div>
                  <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider block">
                    Scenarios Played
                  </span>
                  <span className="font-['JetBrains_Mono'] text-sm font-semibold text-[#ECE8E1]">
                    {validatedProfile.scenariosPlayed}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider block">
                  KovaaK's Plus
                </span>
                <span className={`text-sm font-['Inter'] font-medium ${
                  validatedProfile.kovaaksPlus ? 'text-[#FFCA3A]' : 'text-[#5A6872]'
                }`}>
                  {validatedProfile.kovaaksPlus ? (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    'Inactive'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Connect & Sync button */}
          <button
            onClick={handleConnectAndSync}
            className="mt-5 w-full bg-[#3DD598] text-white rounded-lg px-6 py-3 text-sm font-semibold font-['Inter'] hover:bg-[#3DD598]/90 transition-all duration-200 shadow-lg shadow-[#3DD598]/20 inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Connect & Sync
          </button>
        </div>
      )}
    </div>
  );
}
