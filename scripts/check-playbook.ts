/**
 * Prints the chapter → moment tree and the drills AimMaster will store for a
 * vault note. Reads files only; touches nothing.
 *
 *   npm run check:playbook -- "<note.md>" ["<more notes>"…]
 *
 * Uses the same builder as `sync-playbooks`, so this is the ground truth for
 * what the reader shows. Compare it with the vault's own checker
 * (`Valorant/_scripts/check_moments.py`) — the two trees must match.
 *
 * Exit code 1 when any note cannot be parsed or its frontmatter counts disagree.
 */

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { formatTimestamp as f, parseFrontmatter } from '../src/lib/playbookParser.ts'
import { buildPlaybook } from '../src/lib/playbookBuild.ts'

function check(path: string): boolean {
  const raw = readFileSync(path, 'utf8')
  console.log(`\n━━ ${basename(path)}`)

  const result = buildPlaybook(raw)
  if (!result.ok) {
    console.log(`  ✖ ${result.error}`)
    return false
  }

  const { playbook, chapters, moments, drills, warnings } = result.built
  const fm = parseFrontmatter(raw.replace(/\r\n?/g, '\n'))?.data ?? {}
  const errors: string[] = []

  console.log(`  ${playbook.title}  ·  ${playbook.slug}  ·  ${playbook.video_url ? 'video ✓' : 'video ✗'}`)
  for (const c of chapters) {
    const indent = c.depth === 2 ? '    ' : ''
    console.log(`  ${indent}${c.chapter_number} ▶ ${c.title}  ${f(c.start_seconds)}-${f(c.end_seconds)}`)
    for (const m of moments.filter(x => x.chapter_number === c.chapter_number)) {
      console.log(`  ${indent}      ↳ ${m.label}  ${f(m.start_seconds)}-${f(m.end_seconds)}`)
    }
  }

  if (drills.length) console.log('  Drills')
  for (const d of drills) {
    const source = d.source_start_seconds !== null ? `  ${f(d.source_start_seconds)}-${f(d.source_end_seconds ?? d.source_start_seconds)}` : ''
    const scenario = d.scenario ? `  ⌖ ${d.scenario}` : ''
    console.log(`      ${d.position}. ${d.title}${source}${scenario}`)
  }

  const counts: [string, number][] = [
    ['chapters', chapters.length],
    ['moments', moments.length],
    ['drills', drills.length],
  ]
  for (const [key, parsed] of counts) {
    if (fm[key] !== undefined && Number(fm[key]) !== parsed) errors.push(`frontmatter ${key}: ${fm[key]}, parsed ${parsed}`)
  }

  console.log(`  ${chapters.length} chapters · ${moments.length} moments · ${drills.length} drills`)
  for (const e of errors) console.log(`  ✖ ${e}`)
  for (const w of warnings) console.log(`  ⚠ ${w}`)
  if (!errors.length) console.log('  ✔ parses')
  return errors.length === 0
}

const files = process.argv.slice(2)
if (!files.length) {
  console.error('Usage: npm run check:playbook -- "<note.md>" ["<more notes>"…]')
  process.exit(2)
}
process.exit(files.map(check).every(Boolean) ? 0 : 1)
