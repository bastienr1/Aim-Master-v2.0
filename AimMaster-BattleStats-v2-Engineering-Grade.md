# AIM MASTER v2.0 — Battle Stats Dashboard Upgrade
## Claude Code Implementation Guide (Engineering-Grade)

**Date:** February 20, 2026  
**Repo:** `github.com/bastienr1/Aim-Master-v2.0` · Branch: `master`  
**Target:** `src/pages/tabs/Home.tsx` (41KB) + new component files

---

## 0. Why This Guide Exists (And Why the Bolt.DIY Version Is Wrong)

The original Battle Stats prompt was designed for Bolt.DIY — a tool that works by find-and-replace inside monolithic files. That approach is **functional but architecturally harmful**:

| Problem | Bolt.DIY approach | Proper approach |
|---------|------------------|-----------------|
| Home.tsx is already 41KB | Add more inline JSX | Extract to components |
| Data transformation in render | IIFE `(() => { ... })()` inside JSX | Custom hooks + pure components |
| Want to swap radar ↔ donut later? | Delete old code, paste new code | Props-driven, render either |
| Testing a single card | Impossible without rendering the whole page | Component-level isolation |
| Onboarding a second dev | "Read all 1000+ lines to understand the dashboard" | "Look at the components folder" |

**This guide preserves the exact same visual output** as the Bolt.DIY prompts, but implements it the way a senior engineer would — extractable components, custom hooks for data transforms, and non-destructive integration into `Home.tsx`.

---

## 1. Architecture: What We're Building

```
src/
├── pages/tabs/
│   └── Home.tsx                    ← MODIFY (import new components, replace 3 sections)
│
├── components/dashboard/           ← existing folder
│   ├── CheckinButton.tsx           ← already exists
│   ├── CheckinStreakCard.tsx        ← already exists
│   ├── SkillRadar.tsx              ← NEW
│   ├── MissionBriefing.tsx         ← NEW
│   └── MentalGameBar.tsx           ← NEW
│
└── hooks/
    └── useSkillRadarData.ts        ← NEW (data transform hook)
```

**Principle:** Home.tsx becomes a **layout orchestrator** that imports components and passes them data. Each component owns its own rendering logic, empty states, and styling. Home.tsx shrinks instead of growing.

---

## 2. File-by-File Implementation

### File 1: `src/hooks/useSkillRadarData.ts` (NEW)

**Purpose:** Transform raw `chartData.distribution` into radar-ready data. Keeps all normalization logic out of JSX.

```typescript
import { useMemo } from 'react';

export interface RadarDataPoint {
  skill: string;
  value: number;
  fullMark: number;
}

export interface SkillRadarResult {
  radarData: RadarDataPoint[];
  strongest: RadarDataPoint;
  weakest: RadarDataPoint;
  hasData: boolean;
}

/**
 * Transforms category distribution counts into a 6-axis radar chart dataset.
 * Normalizes to 0-100 scale. Derives Speed, Precision, Stability from
 * primary categories when subcategory data isn't available.
 */
export function useSkillRadarData(
  distribution: { name: string; value: number }[] | null | undefined
): SkillRadarResult {
  return useMemo(() => {
    if (!distribution?.length) {
      const empty: RadarDataPoint = { skill: 'N/A', value: 0, fullMark: 100 };
      return { radarData: [], strongest: empty, weakest: empty, hasData: false };
    }

    const total = distribution.reduce((a, b) => a + b.value, 0) || 1;

    const getCatValue = (name: string): number => {
      const found = distribution.find(d =>
        d.name.toLowerCase().includes(name.toLowerCase())
      );
      return found ? Math.round((found.value / total) * 100) : 0;
    };

    const radarData: RadarDataPoint[] = [
      { skill: 'Clicking',   value: getCatValue('click'),  fullMark: 100 },
      { skill: 'Tracking',   value: getCatValue('track'),  fullMark: 100 },
      { skill: 'Switching',  value: getCatValue('switch'), fullMark: 100 },
      { skill: 'Speed',      value: Math.min(getCatValue('speed')   || Math.round(getCatValue('click') * 0.8),  100), fullMark: 100 },
      { skill: 'Precision',  value: Math.min(getCatValue('precise') || Math.round(getCatValue('track') * 0.85), 100), fullMark: 100 },
      { skill: 'Stability',  value: Math.min(getCatValue('stab')    || Math.round(getCatValue('switch') * 0.9), 100), fullMark: 100 },
    ];

    const weakest  = radarData.reduce((a, b) => a.value < b.value ? a : b);
    const strongest = radarData.reduce((a, b) => a.value > b.value ? a : b);

    return { radarData, strongest, weakest, hasData: true };
  }, [distribution]);
}
```

**Why this matters:** If you later swap to real Voltaic benchmark scores (roadmap item #1), you only change this hook. Zero UI changes needed.

---

### File 2: `src/components/dashboard/SkillRadar.tsx` (NEW)

**Purpose:** Self-contained radar chart component with empty state. Replaces the donut chart.

```typescript
import { Crosshair, TrendingUp, AlertCircle } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer
} from 'recharts';
import { useSkillRadarData } from '@/hooks/useSkillRadarData';

interface SkillRadarProps {
  distribution: { name: string; value: number }[] | null | undefined;
}

export function SkillRadar({ distribution }: SkillRadarProps) {
  const { radarData, strongest, weakest, hasData } = useSkillRadarData(distribution);

  return (
    <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
          Battle Stats
        </h3>
        <span className="text-[11px] font-['Inter'] text-[#5A6872] bg-[#0F1923] px-2 py-1 rounded-full">
          Based on synced data
        </span>
      </div>

      {!hasData ? (
        <div className="text-center py-8">
          <Crosshair className="w-8 h-8 text-[#5A6872] mx-auto mb-2" />
          <p className="text-[#5A6872] text-sm font-['Inter']">
            Sync your scores to unlock Battle Stats
          </p>
        </div>
      ) : (
        <>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="#2A3A47" strokeWidth={1} />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: '#9CA8B3', fontSize: 11, fontFamily: 'Inter' }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Your Stats"
                  dataKey="value"
                  stroke="#FF4655"
                  fill="#FF4655"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#FF4655', stroke: '#FF4655' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Strength / Weakness callout */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-[#0F1923] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#3DD598]" />
                <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider">
                  Strongest
                </span>
              </div>
              <p className="text-[#ECE8E1] text-sm font-['Inter'] font-medium">
                {strongest.skill}
              </p>
            </div>
            <div className="bg-[#0F1923] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-[#FFCA3A]" />
                <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider">
                  Focus Area
                </span>
              </div>
              <p className="text-[#ECE8E1] text-sm font-['Inter'] font-medium">
                {weakest.skill}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### File 3: `src/components/dashboard/MissionBriefing.tsx` (NEW)

**Purpose:** Replaces the AI Coach card. State-driven coaching with 5 dynamic views.

```typescript
import { Sparkles, AlertCircle, Crosshair, Brain, Target, ArrowRight } from 'lucide-react';

type CoachState = 'improving' | 'declining' | 'inactive' | 'steady' | 'insufficient';

interface MissionBriefingProps {
  coachState: CoachState;
  coachData: {
    weakest?: { category: string };
    strongest?: { category: string };
    daysSinceLast?: number;
    suggestedScenario?: string;
  } | null;
  momentumData: {
    delta?: number;
  } | null;
  onNavigate: (tab: string) => void;
}

const STATE_CONFIG: Record<CoachState, {
  color: string; glow: string; icon: any; label: string;
}> = {
  improving:    { color: '#3DD598', glow: '#3DD59850', icon: Sparkles,    label: "You're in the zone" },
  declining:    { color: '#FFCA3A', glow: '#FFCA3A50', icon: AlertCircle, label: 'Time to recalibrate' },
  inactive:     { color: '#FF4655', glow: '#FF465550', icon: Crosshair,   label: 'Your aim is waiting' },
  steady:       { color: '#53CADC', glow: '#53CADC50', icon: Brain,       label: 'Holding steady' },
  insufficient: { color: '#53CADC', glow: '#53CADC50', icon: Brain,       label: 'Building your profile' },
};

export function MissionBriefing({ coachState, coachData, momentumData, onNavigate }: MissionBriefingProps) {
  const config = STATE_CONFIG[coachState];
  const Icon = config.icon;

  return (
    <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
          Mission Briefing
        </h3>
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: config.color,
            boxShadow: `0 0 8px ${config.glow}`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* State-specific content */}
      <div className="flex-1 space-y-4">
        <MissionContent
          coachState={coachState}
          config={config}
          Icon={Icon}
          coachData={coachData}
          momentumData={momentumData}
        />
      </div>

      {/* CTA */}
      <button
        onClick={() => onNavigate('training')}
        className="mt-4 w-full bg-[#FF4655]/10 border border-[#FF4655]/30 text-[#FF4655] rounded-xl px-4 py-2.5 font-['Inter'] text-[13px] font-semibold hover:bg-[#FF4655]/20 transition-all inline-flex items-center justify-center gap-2"
      >
        Start Training <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Inner component — keeps the parent clean */
function MissionContent({
  coachState, config, Icon, coachData, momentumData
}: {
  coachState: CoachState;
  config: typeof STATE_CONFIG[CoachState];
  Icon: any;
  coachData: MissionBriefingProps['coachData'];
  momentumData: MissionBriefingProps['momentumData'];
}) {
  const delta = momentumData?.delta;
  const deltaStr = delta ? ` ${delta > 0 ? '+' : ''}${delta}%` : '';
  const weakCat = coachData?.weakest?.category;
  const strongCat = coachData?.strongest?.category;
  const scenario = coachData?.suggestedScenario;

  const messages: Record<CoachState, { body: string; mission: string | null }> = {
    improving: {
      body: `Momentum is up${deltaStr} — this is the time to push boundaries, not coast.`,
      mission: weakCat
        ? `Push into ${weakCat} scenarios — your ${strongCat || 'strengths'} can carry. Growth lives in the discomfort.`
        : 'Keep the streak alive. Focus on scenarios that challenge you.',
    },
    declining: {
      body: `Scores dipped${deltaStr} — this is normal. Plateaus and dips are part of the process.`,
      mission: weakCat
        ? `Short focused session on ${weakCat}. Quality over quantity — 15 mindful minutes beats 60 on autopilot.`
        : 'Take a focused 15-minute session. Deliberate reps, full attention.',
    },
    inactive: {
      body: `${coachData?.daysSinceLast || '?'} days since your last session. Muscle memory peaks at 48-72 hours between sessions.`,
      mission: 'A quick 10-minute warmup routine will protect your gains. Just showing up matters more than intensity today.',
    },
    steady: {
      body: 'Consistent performance is the foundation. Try pushing into scenarios that challenge you to break through.',
      mission: weakCat ? `${weakCat} — your biggest growth opportunity` : null,
    },
    insufficient: {
      body: 'Keep training — the coach needs more data to provide personalized missions.',
      mission: null,
    },
  };

  const msg = messages[coachState];

  return (
    <>
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: `${config.color}08`,
          border: `1px solid ${config.color}33`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: config.color }} />
          <span className="font-['Rajdhani'] font-semibold text-sm" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
        <p className="text-[#9CA8B3] text-[13px] font-['Inter'] leading-relaxed">{msg.body}</p>
      </div>

      {msg.mission && (
        <div className="bg-[#0F1923] rounded-xl p-4">
          <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider">
            {coachState === 'steady' ? 'Suggested Focus' : "Today's Mission"}
          </span>
          <p className="text-[#ECE8E1] text-sm font-['Inter'] mt-1.5 leading-relaxed">{msg.mission}</p>
          {scenario && (
            <div className="mt-2 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" style={{ color: config.color }} />
              <span className="text-xs font-['Inter'] font-medium" style={{ color: config.color }}>
                {scenario}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
```

**Why this is better than the Bolt.DIY version:** The 5 coach states are defined as a data structure (`STATE_CONFIG` + `messages` object), not 5 separate JSX blocks with duplicated markup. Adding a 6th state (e.g., `streak_hot`) is one object entry, not 30 lines of copy-pasted JSX.

---

### File 4: `src/components/dashboard/MentalGameBar.tsx` (NEW)

**Purpose:** Check-in streak nudge bar. Inserted between KPIs and Activity.

```typescript
import { Brain, Sparkles, ArrowRight } from 'lucide-react';

interface MentalGameBarProps {
  streakDays: number;
  onCheckin: () => void;
  onNavigate: (tab: string) => void;
}

export function MentalGameBar({ streakDays, onCheckin, onNavigate }: MentalGameBarProps) {
  return (
    <div
      className="bg-gradient-to-r from-[#1C2B36] to-[#1C2B36] border border-[#53CADC]/15 rounded-xl p-5 mb-6 hover:border-[#53CADC]/30 transition-all cursor-pointer group"
      onClick={() => onNavigate('mental')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#53CADC]/10 flex items-center justify-center group-hover:bg-[#53CADC]/15 transition-colors">
            <Brain className="w-5 h-5 text-[#53CADC]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-['Rajdhani'] text-[15px] font-semibold text-[#ECE8E1]">
                Mental Game
              </h3>
              <span className="bg-[#53CADC]/10 text-[#53CADC] text-[10px] font-['Inter'] font-semibold px-2 py-0.5 rounded-full">
                {streakDays} day streak
              </span>
            </div>
            <p className="text-[#9CA8B3] text-[12px] font-['Inter'] mt-0.5">
              Pre-training check-ins build consistency — the #1 predictor of improvement.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onCheckin(); }}
            className="hidden sm:flex bg-[#53CADC]/10 border border-[#53CADC]/30 text-[#53CADC] rounded-lg px-3 py-1.5 text-[12px] font-['Inter'] font-medium hover:bg-[#53CADC]/20 transition-all items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" /> Check-in
          </button>
          <ArrowRight className="w-4 h-4 text-[#5A6872] group-hover:text-[#53CADC] transition-colors" />
        </div>
      </div>
    </div>
  );
}
```

---

### File 5: Modifications to `Home.tsx`

**This is where the non-destructive approach pays off.** Instead of replacing 200+ lines of JSX inline, `Home.tsx` gets *smaller*:

#### Step 1 — Add imports (top of file)

Add these lines to the existing imports:

```typescript
// New Battle Stats components
import { SkillRadar } from '@/components/dashboard/SkillRadar';
import { MissionBriefing } from '@/components/dashboard/MissionBriefing';
import { MentalGameBar } from '@/components/dashboard/MentalGameBar';
```

No changes to the recharts import line — the new components import their own chart dependencies.

#### Step 2 — Add CSS keyframes (inside connected dashboard return)

At the top of the connected dashboard return, just inside the outer `<div>`:

```html
<style>{`
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes prBadgePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
`}</style>
```

#### Step 3 — Insert MentalGameBar (before Section 3)

Find `{/* Section 3: Activity + Coach */}` and insert before it:

```jsx
{/* Section 2.5: Mental Game Status */}
<MentalGameBar
  streakDays={profile?.checkin_streak || 0}
  onCheckin={() => onTriggerCheckin?.()}
  onNavigate={onNavigate}
/>
```

**One line of JSX** instead of 30+ lines of inline markup.

#### Step 4 — Replace AI Coach card with MissionBriefing (Section 3, right column)

Find the AI Coach card div in Section 3 right column. Replace the entire card with:

```jsx
<MissionBriefing
  coachState={coachState}
  coachData={coachData}
  momentumData={momentumData}
  onNavigate={onNavigate}
/>
```

**One line of JSX** instead of 130+ lines of inline conditional rendering.

#### Step 5 — Replace Donut Chart with SkillRadar (Section 4, left column)

Find the "Aim Type Distribution" card. Replace the entire card with:

```jsx
<SkillRadar distribution={chartData?.distribution} />
```

**One line of JSX** instead of 80+ lines of inline chart + IIFE.

#### Step 6 — Performance Momentum glow (Section 1)

Find the Performance Momentum card's `style` prop. Add `boxShadow`:

```typescript
boxShadow: momentumData?.state === 'improving'
  ? '0 0 30px rgba(61,213,152,0.06)'
  : momentumData?.state === 'declining'
  ? '0 0 30px rgba(255,202,58,0.06)'
  : 'none',
```

---

## 3. What This Approach Gives You That Bolt.DIY Doesn't

| Benefit | Detail |
|---------|--------|
| **Reversibility** | Want the donut chart back? Change one import. The component still exists. |
| **Testability** | Each component can be rendered in isolation with Storybook or a test harness. |
| **Home.tsx gets smaller** | Net effect: ~200 lines removed, ~10 lines added (imports + component tags). |
| **Data layer separation** | `useSkillRadarData` can be swapped to real Voltaic scores without touching UI. |
| **Reusability** | `MissionBriefing` can appear on a mobile landing screen, in a notification, or in a widget — it's not welded to Home.tsx. |
| **Onboarding** | A new dev reads `<SkillRadar distribution={chartData?.distribution} />` and immediately knows what it does. |

---

## 4. Implementation Order for Claude Code

| Step | Action | Commit message |
|------|--------|----------------|
| 1 | Create `src/hooks/useSkillRadarData.ts` | `feat: add skill radar data transform hook` |
| 2 | Create `src/components/dashboard/SkillRadar.tsx` | `feat: add SkillRadar component` |
| 3 | Create `src/components/dashboard/MissionBriefing.tsx` | `feat: add MissionBriefing component` |
| 4 | Create `src/components/dashboard/MentalGameBar.tsx` | `feat: add MentalGameBar component` |
| 5 | Modify `Home.tsx`: add imports, keyframes, insert components, add glow | `feat: integrate Battle Stats into dashboard` |
| 6 | Run `tsc --noEmit` and verify zero errors | `chore: verify TypeScript` |

---

## 5. Critical Constraints

| 🔴 DO NOT | 🟢 DO |
|-----------|-------|
| Rewrite Home.tsx from scratch | Add imports + swap 3 sections with component tags |
| Put data transformation in JSX | Use `useSkillRadarData` hook |
| Duplicate JSX for 5 coach states | Use config objects + message maps |
| Modify Dashboard.tsx, loading skeleton, ProfileOnboarding, Welcome Hub | Only touch connected dashboard section (~line 555+) |
| Add new Supabase queries | Use existing: `chartData`, `coachData`, `coachState`, `momentumData`, `profile` |

---

## 6. Data Dependencies (Unchanged)

Every new component uses data already fetched in `Home.tsx`. No new queries.

| Component | Props received | Original data source |
|-----------|---------------|---------------------|
| `SkillRadar` | `distribution` | `chartData.distribution` from `loadCharts()` |
| `MissionBriefing` | `coachState`, `coachData`, `momentumData` | `loadCoach()` + `loadMomentum()` |
| `MentalGameBar` | `streakDays` | `profile.checkin_streak` passed from Dashboard.tsx |

---

## 7. Post-Build Checklist

- [ ] `useSkillRadarData` returns correct strongest/weakest for test data
- [ ] Radar chart renders 6 axes (Clicking, Tracking, Switching, Speed, Precision, Stability)
- [ ] Radar shows Strongest / Focus Area callouts
- [ ] Mission Briefing renders all 5 states correctly
- [ ] Mission Briefing scenario suggestion appears when available
- [ ] "Start Training" navigates to Training tab
- [ ] Mental Game bar appears between KPIs and Activity row
- [ ] Check-in button triggers PreTrainingCheckin modal
- [ ] Mental Game bar click navigates to Mental tab
- [ ] Momentum card has state-based glow
- [ ] Pulse animation on Mission Briefing dot
- [ ] Mobile: everything stacks, no horizontal scroll
- [ ] `tsc --noEmit` passes with zero errors
- [ ] **Home.tsx is net-smaller than before** (the real test of good architecture)

---

## 8. Roadmap After Battle Stats v1

1. **Real Voltaic Scores in Radar** — Swap `useSkillRadarData` input from category counts to `get_benchmark_scores` endpoint. UI components unchanged.
2. **PR Streak Tracker** — New component: `PRStreak.tsx`. Chain visualization with celebration animations.
3. **Session Timer + Logging** — Wire Training tab timer to `program_session_logs`.
4. **Post-Session Reflection Journal** — Premium paywall feature. A'ZONE methodology.
5. **Plateau Detection** — Query `score_history` for flat patterns, surface in `MissionBriefing` as a 6th state.

---

*Source: `AimMaster-BattleStats-BoltDIY-Prompt.md` · Upgraded to component architecture Feb 20, 2026*
