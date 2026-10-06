import { Check } from 'lucide-react';
import type { GoalCategory } from '@/types/goals';
import type { SavedDrill } from '@/types/playbook';
import { UNCATEGORISED, splitForGoal } from '@/lib/drillCategories';
import { useSavedDrills } from '@/hooks/useSavedDrills';

interface DrillPickerProps {
  goalCategory: GoalCategory | null;
  /** Saved-drill ids. */
  selected: string[];
  onChange(ids: string[]): void;
  /** Saves already attached to the goal, left out of the list. */
  excludeIds?: string[];
}

/**
 * Checkbox list of the user's saved drills, the goal's family first. Used in
 * the goal modal's details step and in the card's Add drills dialog.
 */
export function DrillPicker({ goalCategory, selected, onChange, excludeIds = [] }: DrillPickerProps) {
  const { saved, loading } = useSavedDrills();
  const excluded = new Set(excludeIds);
  const candidates = saved.filter((s) => !excluded.has(s.id));

  if (loading && saved.length === 0) {
    return <p className="text-xs font-['Inter'] text-[#5A6872] py-2">Loading saved drills…</p>;
  }

  if (candidates.length === 0) {
    return (
      <p className="text-xs font-['Inter'] text-[#5A6872] py-2">
        {saved.length === 0 ? "Bookmark a drill in a playbook's Drills tab to pick it here." : 'Every saved drill is already on this goal.'}
      </p>
    );
  }

  const { matches, others } = splitForGoal(candidates, goalCategory);
  const picked = new Set(selected);

  const toggle = (id: string) => {
    onChange(picked.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const group = (title: string, groups: Array<[string | null, SavedDrill[]]>) =>
    groups.length > 0 && (
      <div key={title} className="space-y-2">
        <p className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#9CA8B3]">{title}</p>
        {groups.map(([category, items]) => (
          <div key={category ?? '__none'} className="space-y-1">
            <p className="text-[10px] font-['JetBrains_Mono'] text-[#5A6872]">
              {category ?? UNCATEGORISED} <span className="opacity-60">{items.length}</span>
            </p>
            {items.map((item) => {
              const checked = picked.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(item.id)}
                  className={`w-full text-left rounded-lg px-3 py-2 border flex items-start gap-3 transition-all ${
                    checked ? 'bg-[#53CADC]/10 border-[#53CADC]/40' : 'bg-[#1C2B36] border-white/5 hover:border-white/15'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-4 h-4 rounded shrink-0 border flex items-center justify-center ${
                      checked ? 'bg-[#53CADC] border-[#53CADC]' : 'border-[#5A6872]'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 text-[#0F1923]" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-['Inter'] text-[#ECE8E1] leading-snug">{item.title}</span>
                    {(item.scenario || item.venue) && (
                      <span className={`block text-[11px] mt-0.5 text-[#9CA8B3] break-words ${item.scenario ? "font-['JetBrains_Mono']" : "font-['Inter']"}`}>
                        {item.scenario ?? item.venue}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );

  return (
    <div className="max-h-64 overflow-y-auto space-y-4 pr-1">
      {group('Matches this goal', matches)}
      {group(matches.length > 0 ? 'Other saved drills' : 'Saved drills', others)}
    </div>
  );
}
