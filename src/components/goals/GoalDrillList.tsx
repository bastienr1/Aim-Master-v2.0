import { Crosshair, Play, X } from 'lucide-react';
import type { SavedDrill } from '@/types/playbook';
import { formatTimestamp } from '@/lib/playbookParser';

interface GoalDrillListProps {
  drills: SavedDrill[];
  /** Opens the playbook at the drill's source moment. */
  onOpen(saved: SavedDrill): void;
  onUnlink(saved: SavedDrill): void;
}

/** The drills attached to a goal, one compact row each, under the card's progress bar. */
export function GoalDrillList({ drills, onOpen, onUnlink }: GoalDrillListProps) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#5A6872] mb-1.5">
        Drills <span className="opacity-60">{drills.length}</span>
      </p>
      <ul className="space-y-1.5">
        {drills.map((drill) => {
          const canOpen = drill.playbook_id !== null && drill.source_start_seconds !== null;
          return (
            <li key={drill.id} className="flex items-start gap-2 rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2 min-w-0">
              <Crosshair className="w-3 h-3 mt-1 shrink-0 text-[#53CADC]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-['Inter'] text-[#ECE8E1] leading-snug break-words">{drill.title}</p>
                {(drill.scenario || drill.venue) && (
                  <p className={`text-[11px] text-[#9CA8B3] mt-0.5 break-words ${drill.scenario ? "font-['JetBrains_Mono']" : "font-['Inter']"}`}>
                    {drill.scenario ?? drill.venue}
                  </p>
                )}
                {drill.cue && (
                  <p className="text-[11px] font-['Inter'] text-[#5A6872] mt-0.5 break-words">
                    <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-wider mr-1.5">Watch for</span>
                    {drill.cue}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canOpen && (
                  <button
                    type="button"
                    onClick={() => onOpen(drill)}
                    title={`Open the playbook at ${formatTimestamp(drill.source_start_seconds as number)}`}
                    className="text-[#9CA8B3] hover:text-[#ECE8E1] transition-colors p-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onUnlink(drill)}
                  title="Remove from this goal"
                  className="text-[#5A6872] hover:text-[#FF4655] transition-colors p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
