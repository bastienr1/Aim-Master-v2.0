/**
 * Sync Obsidian vault playbooks into Supabase (`playbooks` + chapters, moments, drills).
 *
 *   npm run sync-playbooks                  # write changes
 *   npm run sync-playbooks -- --dry         # report only, touch nothing
 *   npm run sync-playbooks -- --prune-all   # vault has no playbooks: delete every row
 *
 * A note is a playbook when its frontmatter says `aimmaster: tip` or
 * `aimmaster: playbook` AND its body carries at least one timed chapter:
 *
 *   ---
 *   aimmaster: tip                 # tip + playbook; or `playbook` for a playbook that is not a tip
 *   title: MattyOw — Static Dots Tutorial
 *   video_url: https://www.youtube.com/watch?v=…
 *   kind: mechanics
 *   themes: [technique_question, consistency]
 *   ---
 *   ## Core Breakdown
 *   ### Mistake 1 — sauntering instead of flicking `[02:18–04:14]`
 *   #### Bardoz method: fast flick, slow micro `[02:50–03:09]`
 *
 * A tip without timed chapters is simply not a playbook (most tips are not).
 *
 * Config comes from .env.local, same keys as sync-vault:
 *   AIMMASTER_VAULT_PATH, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AIMMASTER_USER_ID
 */

import { readFile, readdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import { createClient } from '@supabase/supabase-js'
import { PARSER_VERSION } from '../src/lib/playbookParser.ts'
import { buildPlaybook, toSyncArgs, type BuiltPlaybook, type PlaybookMeta } from '../src/lib/playbookBuild.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DRY_RUN = process.argv.includes('--dry')
const PRUNE_ALL = process.argv.includes('--prune-all')

/** Directories that never hold playbooks and can be large. */
const SKIP_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules', '.smart-env'])
const VALID_KINDS = new Set(['mechanics', 'mindset'])

// ─── Config ───────────────────────────────────────────────────────────────

/** Minimal .env reader — same behaviour as scripts/sync-vault.mjs. */
function loadEnvFile(file: string): Record<string, string> {
  if (!existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[line.slice(0, eq).trim()] = value
  }
  return out
}

// .env.local wins; .env is the fallback so the Supabase URL need not be duplicated.
const env: Record<string, string | undefined> = {
  ...loadEnvFile(path.join(ROOT, '.env')),
  ...loadEnvFile(path.join(ROOT, '.env.local')),
  ...process.env,
}

const VAULT_PATH = env.AIMMASTER_VAULT_PATH ?? ''
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || ''
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const USER_ID = env.AIMMASTER_USER_ID ?? ''

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`)
  process.exit(1)
}

const missing = (
  [
    ['AIMMASTER_VAULT_PATH', VAULT_PATH],
    ['SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY],
    ['AIMMASTER_USER_ID', USER_ID],
  ] as const
)
  .filter(([, v]) => !v)
  .map(([k]) => k)

// A dry run only reads the vault, so it needs nothing but the vault path.
if (DRY_RUN ? !VAULT_PATH : missing.length) {
  fail(`Missing in .env.local: ${DRY_RUN ? 'AIMMASTER_VAULT_PATH' : missing.join(', ')}`)
}
if (!existsSync(VAULT_PATH)) fail(`Vault not found at AIMMASTER_VAULT_PATH: ${VAULT_PATH}`)

// ─── Valid theme ids, read from the app so the two cannot drift ───────────

function loadThemeIds(): Set<string> | null {
  try {
    const src = readFileSync(path.join(ROOT, 'src', 'constants', 'debrief-config.ts'), 'utf8')
    const themed = [...src.matchAll(/id:\s*'([a-z_]+)',[\s\S]*?kind:\s*'[a-z]+',/g)].map(m => m[1])
    return themed.length ? new Set(themed) : null
  } catch {
    console.warn('  ! Could not read debrief-config.ts — theme ids will not be validated.')
    return null
  }
}

const VALID_THEMES = loadThemeIds()

// ─── Vault walk ───────────────────────────────────────────────────────────

async function* walk(dir: string): AsyncGenerator<string> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      yield* walk(full)
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      yield full
    }
  }
}

/** Frontmatter lists may be a YAML array or a comma-separated string. */
function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean)
  return []
}

// ─── Collect ──────────────────────────────────────────────────────────────

interface Collected {
  source_path: string
  content_hash: string
  built: BuiltPlaybook
  meta: PlaybookMeta
}

const playbooks: Collected[] = []
const warnings: string[] = []
let scanned = 0
let tipsWithoutChapters = 0

for await (const file of walk(VAULT_PATH)) {
  scanned++
  const relPath = path.relative(VAULT_PATH, file).split(path.sep).join('/')
  const raw = await readFile(file, 'utf8')

  let fm: Record<string, unknown>
  try {
    fm = matter(raw).data || {}
  } catch (err) {
    // sync-vault reports these too; only repeat it for notes that look like ours.
    if (/^aimmaster:\s*(tip|playbook)\s*$/m.test(raw)) {
      warnings.push(`${relPath}: unreadable frontmatter (${(err as Error).message})`)
    }
    continue
  }

  const marker = String(fm.aimmaster ?? '').trim()
  if (marker !== 'tip' && marker !== 'playbook') continue

  const result = buildPlaybook(raw)
  if (!result.ok) {
    if (marker === 'playbook') warnings.push(`${relPath}: tagged \`aimmaster: playbook\` but ${result.error}`)
    else tipsWithoutChapters++
    continue
  }

  const themes = toList(fm.themes)
  if (VALID_THEMES) {
    for (const t of themes) {
      if (!VALID_THEMES.has(t)) warnings.push(`${relPath}: unknown theme id "${t}" — it will never match a debrief`)
    }
  }

  let kind = fm.kind ? String(fm.kind).trim() : null
  if (kind && !VALID_KINDS.has(kind)) {
    warnings.push(`${relPath}: kind "${kind}" is not mechanics|mindset — storing null`)
    kind = null
  }

  for (const w of result.built.warnings) warnings.push(`${relPath}: ${w}`)

  playbooks.push({
    source_path: relPath,
    // The parser version joins the hash, so a parser change re-syncs every
    // playbook once instead of no-opping on an unchanged note.
    content_hash: createHash('sha256').update(`v${PARSER_VERSION}\n${raw}`).digest('base64'),
    built: result.built,
    meta: { kind: kind as PlaybookMeta['kind'], themes, tags: toList(fm.tags) },
  })
}

// ─── Report ───────────────────────────────────────────────────────────────

console.log(`\n  Vault:     ${VAULT_PATH}`)
console.log(`  Scanned:   ${scanned} markdown files`)
console.log(`  Playbooks: ${playbooks.length} (plus ${tipsWithoutChapters} tips with no timed chapters — not playbooks)`)

for (const p of playbooks) {
  const { built } = p
  const scenarios = built.drills.filter(d => d.scenario).length
  const bits = [
    `${built.chapters.length} chapters`,
    `${built.moments.length} moments`,
    `${built.drills.length} drills${scenarios ? ` (${scenarios} with a scenario)` : ''}`,
    built.playbook.video_url ? 'video ✓' : 'video ✗',
  ]
  console.log(`    · ${built.playbook.title}  (${bits.join(' | ')})`)
  console.log(`      ${p.source_path}`)
}

if (warnings.length) {
  console.log(`\n  Warnings (${warnings.length}):`)
  for (const w of warnings) console.log(`    ! ${w}`)
}

if (DRY_RUN) {
  console.log('\n  --dry: nothing written.\n')
} else {
  await sync()
}

// ─── Write ────────────────────────────────────────────────────────────────
//
// Returns rather than calling process.exit(): exiting while the Supabase client
// still holds open handles trips a libuv assertion on Windows after the output
// has printed (see the same note in sync-vault.mjs).

async function sync() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: existing, error: readError } = await supabase
    .from('playbooks')
    .select('id, source_path')
    .eq('user_id', USER_ID)
  if (readError) fail(`Could not read playbooks: ${readError.message} — has the 20261002_playbooks.sql migration been run?`)

  // A vault that yields no playbooks is ambiguous: either every note was
  // untagged on purpose, or AIMMASTER_VAULT_PATH points somewhere wrong.
  if (playbooks.length === 0) {
    if (!existing?.length) {
      console.log('\n  Nothing to sync. A playbook is an `aimmaster: tip|playbook` note with timed ### chapters.\n')
      return
    }
    if (!PRUNE_ALL) {
      console.log(`\n  No playbooks found in the vault, but ${existing.length} already exist.`)
      console.log('  Left untouched — check AIMMASTER_VAULT_PATH is correct.')
      console.log('  If you really did remove them all: npm run sync-playbooks -- --prune-all\n')
      return
    }
  }

  const counts: Record<string, number> = { created: 0, updated: 0, unchanged: 0 }
  for (const p of playbooks) {
    const { data, error } = await supabase.rpc('sync_playbook', {
      p_user_id: USER_ID,
      p_source_path: p.source_path,
      p_content_hash: p.content_hash,
      ...toSyncArgs(p.built, p.meta),
    })
    if (error) fail(`${p.source_path}: ${error.message}`)
    const action = (data as { action: string }).action
    counts[action] = (counts[action] ?? 0) + 1
  }

  // Drop playbooks whose note is gone or no longer qualifies. Children cascade.
  const live = new Set(playbooks.map(p => p.source_path))
  const stale = (existing ?? []).filter(row => !live.has(row.source_path))
  if (stale.length) {
    const { error } = await supabase.from('playbooks').delete().in('id', stale.map(r => r.id))
    if (error) fail(`Delete of stale playbooks failed: ${error.message}`)
  }

  console.log(`\n  ✓ Synced ${playbooks.length}: ${counts.created} created, ${counts.updated} updated, ${counts.unchanged} unchanged.`)
  if (stale.length) {
    console.log(`  ✓ Removed ${stale.length} stale:`)
    for (const row of stale) console.log(`      - ${row.source_path}`)
  }
  console.log('')
}
