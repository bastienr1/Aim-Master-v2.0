// ─── Playbooks (synced from Obsidian by scripts/sync-playbooks.ts) ───
// Row shapes of the four playbook tables, snake_case, straight from Supabase.

export interface Playbook {
  id: string;
  user_id: string;
  /** Vault-relative path. The same key `vault_tips.source_path` uses. */
  source_path: string;
  title: string;
  slug: string;
  video_url: string | null;
  video_duration_seconds: number | null;
  description: string | null;
  content_type: string | null;
  creator: string | null;
  difficulty: string | null;
  kind: 'mechanics' | 'mindset' | null;
  /** Debrief theme ids this playbook answers. */
  themes: string[];
  tags: string[];
  updated_at: string;
}

/** A playbook as listed in the library, with its row counts. */
export interface PlaybookSummary extends Playbook {
  chapter_count: number;
  moment_count: number;
}

export interface PlaybookChapter {
  id: string;
  playbook_id: string;
  chapter_number: number;
  title: string;
  start_seconds: number;
  end_seconds: number;
  /** 1 = chapter, 2 = sub-chapter of `parent_chapter_number`. */
  depth: 1 | 2;
  parent_chapter_number: number | null;
  notes_markdown: string | null;
  key_takeaways: string[];
}

export interface PlaybookMoment {
  id: string;
  playbook_id: string;
  chapter_number: number;
  position: number;
  label: string;
  start_seconds: number;
  end_seconds: number;
}

export interface PlaybookDrill {
  id: string;
  playbook_id: string;
  position: number;
  title: string;
  venue: string | null;
  /** Exact KovaaK's scenario name, when the note gives one. */
  scenario: string | null;
  cue: string | null;
  success_signal: string | null;
  source_start_seconds: number | null;
  source_end_seconds: number | null;
  target_count: number | null;
}

export interface PlaybookDetail {
  chapters: PlaybookChapter[];
  moments: PlaybookMoment[];
  drills: PlaybookDrill[];
}
