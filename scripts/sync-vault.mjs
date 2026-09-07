#!/usr/bin/env node
/**
 * Sync Obsidian vault tips into Supabase `vault_tips`.
 *
 *   npm run sync-vault                  # write changes
 *   npm run sync-vault -- --dry         # report only, touch nothing
 *   npm run sync-vault -- --prune-all   # vault has no tips: delete every row
 *
 * Picks up every note whose frontmatter carries `aimmaster: tip`:
 *
 *   ---
 *   aimmaster: tip
 *   title: Undershoot on purpose, then correct
 *   kind: mechanics            # mechanics | mindset
 *   summary: Optional. Shown on the card instead of the note's opening paragraphs.
 *   themes: [technique_question, consistency]
 *   tags: [flicking, deceleration, clicking]
 *   drill: 10 min of 1w6ts at 80% speed. Score is off-limits.
 *   ---
 *   Body of the tip. First 1-3 paragraphs are shown on the dashboard.
 *
 * Config comes from .env.local (never committed):
 *   AIMMASTER_VAULT_PATH, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AIMMASTER_USER_ID
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN = process.argv.includes('--dry');
const PRUNE_ALL = process.argv.includes('--prune-all');

/** Directories that never hold tips and can be large. */
const SKIP_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules', '.smart-env']);

/** Paragraphs of body text kept for the dashboard. */
const MAX_PARAGRAPHS = 3;

/** Character budget for the card body when falling back to the note text. */
const MAX_BODY_CHARS = 600;

// ─── Config ───────────────────────────────────────────────────────────────

/** Minimal .env reader — avoids a dependency just to read four keys. */
function loadEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

// .env.local wins; .env is the fallback so the Supabase URL need not be duplicated.
const env = {
  ...loadEnvFile(path.join(ROOT, '.env')),
  ...loadEnvFile(path.join(ROOT, '.env.local')),
  ...process.env,
};

const VAULT_PATH = env.AIMMASTER_VAULT_PATH;
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = env.AIMMASTER_USER_ID;

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const missing = [
  ['AIMMASTER_VAULT_PATH', VAULT_PATH],
  ['SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY],
  ['AIMMASTER_USER_ID', USER_ID],
].filter(([, v]) => !v).map(([k]) => k);

if (missing.length) {
  fail(`Missing in .env.local: ${missing.join(', ')}`);
}
if (!existsSync(VAULT_PATH)) {
  fail(`Vault not found at AIMMASTER_VAULT_PATH: ${VAULT_PATH}`);
}

// ─── Valid theme ids, read from the app so the two cannot drift ───────────

function loadThemeIds() {
  const file = path.join(ROOT, 'src', 'constants', 'debrief-config.ts');
  try {
    const src = readFileSync(file, 'utf8');
    const ids = [...src.matchAll(/^\s*id:\s*'([a-z_]+)',/gm)].map((m) => m[1]);
    // The emoji-reaction configs use the same `id:` shape; theme chips are the
    // ones that also carry a `kind`, so intersect on that.
    const themed = [...src.matchAll(/id:\s*'([a-z_]+)',[\s\S]*?kind:\s*'[a-z]+',/g)].map((m) => m[1]);
    return new Set(themed.length ? themed : ids);
  } catch {
    console.warn('  ! Could not read debrief-config.ts — theme ids will not be validated.');
    return null;
  }
}

const VALID_THEMES = loadThemeIds();
const VALID_KINDS = new Set(['mechanics', 'mindset']);

// ─── Vault walk ───────────────────────────────────────────────────────────

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      yield full;
    }
  }
}

// ─── Text cleanup ─────────────────────────────────────────────────────────

/** `[[Note|shown]]` and `[[Note]]` -> plain text; embeds dropped entirely. */
function stripWikilinks(text) {
  return text
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
}

/**
 * Turn a markdown block into card-ready prose, or null if it is structure
 * rather than content. Headings carry nothing on the card, and a callout's own
 * text is usually the best one-paragraph summary a note has — these notes open
 * with `> [!abstract] Essence` — so callouts are unwrapped rather than dropped.
 */
function blockToProse(block) {
  const lines = block.split('\n');

  // Heading-only block.
  if (lines.every((l) => /^\s*#{1,6}\s/.test(l) || !l.trim())) return null;

  // Callout: strip the `>` markers and the `[!type] Title` line.
  if (lines[0].trimStart().startsWith('>')) {
    const text = lines
      .map((l) => l.replace(/^\s*>\s?/, ''))
      .filter((l) => !/^\[![a-z]+\]/i.test(l.trim()))
      .join('\n')
      .trim();
    return text || null;
  }

  // A bullet or numbered list is structure; the card wants prose.
  const content = lines.filter((l) => l.trim());
  if (content.length && content.every((l) => /^\s*([-*+]|\d+\.)\s/.test(l))) return null;

  // Heading followed by prose in the same block: keep the prose.
  const body = lines.filter((l) => !/^\s*#{1,6}\s/.test(l)).join('\n').trim();
  return body || null;
}

function firstParagraphs(body, limit = MAX_PARAGRAPHS) {
  const blocks = stripWikilinks(body)
    .split(/\n\s*\n/)
    .map((b) => blockToProse(b.trim()))
    .filter(Boolean);

  // Stop on paragraph count or character budget, whichever comes first — a
  // long note should not push a wall of text into a card sized for a few lines.
  const kept = [];
  let used = 0;
  for (const block of blocks.slice(0, limit)) {
    if (kept.length && used + block.length > MAX_BODY_CHARS) break;
    kept.push(block);
    used += block.length;
  }

  return kept.join('\n\n').trim();
}

/** Frontmatter lists may be a YAML array or a comma-separated string. */
function toList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
}

// ─── Collect ──────────────────────────────────────────────────────────────

const tips = [];
const warnings = [];
let scanned = 0;

for await (const file of walk(VAULT_PATH)) {
  scanned++;
  let parsed;
  try {
    parsed = matter(await readFile(file, 'utf8'));
  } catch (err) {
    warnings.push(`${path.relative(VAULT_PATH, file)}: unreadable frontmatter (${err.message})`);
    continue;
  }

  const fm = parsed.data || {};
  if (String(fm.aimmaster ?? '').trim() !== 'tip') continue;

  const relPath = path.relative(VAULT_PATH, file).split(path.sep).join('/');
  const title = String(fm.title || path.basename(file, '.md')).trim();

  // A `summary:` wins over the note body. Long reference notes (transcripts,
  // guides) open with headings and callouts, so their first paragraphs make a
  // poor card; this lets them serve as tips without being rewritten.
  const body = fm.summary
    ? stripWikilinks(String(fm.summary)).trim()
    : firstParagraphs(parsed.content || '');

  if (!body) {
    warnings.push(`${relPath}: tagged as a tip but has no body text — add a \`summary:\` or body text`);
    continue;
  }

  const themes = toList(fm.themes);
  if (VALID_THEMES) {
    for (const t of themes) {
      if (!VALID_THEMES.has(t)) {
        warnings.push(`${relPath}: unknown theme id "${t}" — it will never match a debrief`);
      }
    }
  }

  let kind = fm.kind ? String(fm.kind).trim() : null;
  if (kind && !VALID_KINDS.has(kind)) {
    warnings.push(`${relPath}: kind "${kind}" is not mechanics|mindset — storing null`);
    kind = null;
  }

  tips.push({
    user_id: USER_ID,
    source_path: relPath,
    title,
    body,
    drill: fm.drill ? stripWikilinks(String(fm.drill)).trim() : null,
    themes,
    tags: toList(fm.tags),
    kind,
    updated_at: new Date().toISOString(),
  });
}

// ─── Report ───────────────────────────────────────────────────────────────

console.log(`\n  Vault:   ${VAULT_PATH}`);
console.log(`  Scanned: ${scanned} markdown files`);
console.log(`  Tips:    ${tips.length} tagged \`aimmaster: tip\``);

for (const tip of tips) {
  const bits = [tip.kind || 'no kind'];
  if (tip.themes.length) bits.push(`themes: ${tip.themes.join(', ')}`);
  if (tip.drill) bits.push('has drill');
  console.log(`    · ${tip.title}  (${bits.join(' | ')})`);
  console.log(`      ${tip.source_path}`);
}

if (warnings.length) {
  console.log(`\n  Warnings (${warnings.length}):`);
  for (const w of warnings) console.log(`    ! ${w}`);
}

if (DRY_RUN) {
  console.log('\n  --dry: nothing written.\n');
  process.exit(0);
}

// ─── Write ────────────────────────────────────────────────────────────────
//
// Everything past this point runs inside sync() rather than at module top
// level. Calling process.exit() while the Supabase client still holds open
// handles trips a libuv assertion on Windows ("UV_HANDLE_CLOSING", async.c:76)
// after the output has already printed — a clean run that looks like a crash.
// Returning instead lets the event loop drain on its own.

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sync() {
  // A vault that yields no tips is ambiguous: either everything was untagged on
  // purpose, or AIMMASTER_VAULT_PATH points somewhere wrong. Pruning on that
  // guess could wipe the table, so clearing it has to be asked for explicitly.
  if (tips.length === 0) {
    const { count } = await supabase
      .from('vault_tips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', USER_ID);

    if (!count) {
      console.log(
        '\n  Nothing to sync. Add `aimmaster: tip` to a note\'s frontmatter and run again.\n'
      );
      return;
    }

    if (!PRUNE_ALL) {
      console.log(`\n  No tips found in the vault, but ${count} row${count === 1 ? '' : 's'} already exist.`);
      console.log('  Left untouched — check AIMMASTER_VAULT_PATH is correct.');
      console.log('  If you really did untag everything: npm run sync-vault -- --prune-all\n');
      return;
    }

    const { error: pruneError } = await supabase
      .from('vault_tips')
      .delete()
      .eq('user_id', USER_ID);

    if (pruneError) fail(`--prune-all failed: ${pruneError.message}`);
    console.log(`\n  ✓ Removed all ${count} tip${count === 1 ? '' : 's'}.\n`);
    return;
  }

  await writeTips();
}

async function writeTips() {
const { error: upsertError } = await supabase
  .from('vault_tips')
  .upsert(tips, { onConflict: 'user_id,source_path' });

if (upsertError) {
  fail(`Upsert failed: ${upsertError.message}`);
}

// Drop rows whose note no longer exists or lost its `aimmaster: tip` tag.
const { data: existing, error: readError } = await supabase
  .from('vault_tips')
  .select('id, source_path')
  .eq('user_id', USER_ID);

if (readError) {
  fail(`Could not read back tips to prune: ${readError.message}`);
}

const live = new Set(tips.map((t) => t.source_path));
const stale = (existing || []).filter((row) => !live.has(row.source_path));

if (stale.length) {
  const { error: deleteError } = await supabase
    .from('vault_tips')
    .delete()
    .in('id', stale.map((r) => r.id));

  if (deleteError) {
    fail(`Delete of stale tips failed: ${deleteError.message}`);
  }
}

console.log(`\n  ✓ Synced ${tips.length} tip${tips.length === 1 ? '' : 's'}.`);
if (stale.length) {
  console.log(`  ✓ Removed ${stale.length} stale row${stale.length === 1 ? '' : 's'}:`);
  for (const row of stale) console.log(`      - ${row.source_path}`);
}
console.log('');
}

await sync();
