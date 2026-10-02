/**
 * One vault note → everything the playbook tables store.
 *
 * Shared by `scripts/check-playbook.ts` (prints it) and `scripts/sync-playbooks.ts`
 * (writes it), so the tree the checker shows is exactly what lands in Supabase.
 *
 * VAL Master derives moments from the chapter body at render time. AimMaster
 * stores them as rows instead, because the session loop needs to query moments
 * across playbooks (by debrief theme, by scenario) without loading every body.
 */

import { parsePlaybookMarkdown, type ParsedChapter, type ParsedPlaybook } from './playbookParser.ts'
import { extractMoments } from './playbookMoments.ts'
import { parseDrills, type ParsedDrill } from './playbookDrills.ts'

export interface BuiltMoment {
  chapter_number: number
  /** Order inside the chapter, 1-based. */
  position: number
  label: string
  start_seconds: number
  /** Closed here: an open-ended moment runs to the next one, the last to the chapter end. */
  end_seconds: number
}

export interface BuiltPlaybook {
  playbook: Omit<ParsedPlaybook, 'chapters'>
  chapters: ParsedChapter[]
  moments: BuiltMoment[]
  drills: ParsedDrill[]
  warnings: string[]
}

export type BuildResult = { ok: true; built: BuiltPlaybook } | { ok: false; error: string }

export function buildPlaybook(markdown: string): BuildResult {
  const parsed = parsePlaybookMarkdown(markdown)
  if (!parsed.ok) return parsed

  const { chapters, ...playbook } = parsed.playbook
  const warnings: string[] = []

  const moments: BuiltMoment[] = []
  for (const chapter of chapters) {
    // A parent chapter's body contains its sub-chapters' moments; they belong to the sub-chapters.
    if (chapters.some(c => c.parent_chapter_number === chapter.chapter_number)) continue

    const found = extractMoments(chapter.transcript_excerpt, chapter)
    found.forEach((moment, i) => {
      const end = moment.end_seconds ?? found[i + 1]?.start_seconds ?? chapter.end_seconds
      moments.push({
        chapter_number: chapter.chapter_number,
        position: i + 1,
        label: moment.label,
        start_seconds: moment.start_seconds,
        end_seconds: Math.max(end, moment.start_seconds + 1),
      })
    })
  }

  const { drills, warnings: drillWarnings } = parseDrills(markdown.replace(/\r\n?/g, '\n'))
  warnings.push(...drillWarnings)
  if (!playbook.video_url) warnings.push('no `video_url:` — the reader will show "No video linked"')

  return { ok: true, built: { playbook, chapters, moments, drills, warnings } }
}

/** Note-level fields the pure parser does not read (YAML lists need a real YAML parser). */
export interface PlaybookMeta {
  kind: 'mechanics' | 'mindset' | null
  themes: string[]
  tags: string[]
}

/** The jsonb arguments of the `sync_playbook` SQL function, in its column vocabulary. */
export function toSyncArgs(built: BuiltPlaybook, meta: PlaybookMeta) {
  return {
    p_playbook: { ...built.playbook, ...meta },
    p_chapters: built.chapters.map(c => ({
      chapter_number: c.chapter_number,
      title: c.title,
      start_seconds: c.start_seconds,
      end_seconds: c.end_seconds,
      depth: c.depth,
      parent_chapter_number: c.parent_chapter_number,
      notes_markdown: c.notes_markdown,
      key_takeaways: c.key_takeaways,
    })),
    p_moments: built.moments,
    p_drills: built.drills,
  }
}
