/**
 * Unit tests for the KovaaK's stats-folder parsers (`npm test`).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { localPartsToDate, localRunFromStats, parseStatsCsv, parseStatsFilename } from './kovaaksStats.ts'

const CHALLENGE_CSV = [
  'Kill #,Timestamp,Bot,Weapon,TTK,Shots,Hits,Accuracy,Damage Done,Damage Possible,Efficiency,Cheated,OverShots',
  '1,05:08:01.032,Quaker Bot,pistol,0.000000s,1,1,1.000000,100.000000,100.000000,1.000000,0,0',
  '',
  'Kills:,108',
  'Deaths:,0',
  'Hit Count:,108',
  'Miss Count:,5',
  'Score:,108.0',
  'Scenario:,1w3ts reload',
  'Hash:,81a95f54261c31930abead90b6ad60eb',
  'Game Version:,3.9.12.2026-10-29-17-41-55-50e64693faaa',
  'Challenge Start:,05:08:00.818',
  'Resolution:,1920x1080',
].join('\r\n')

const FREEPLAY_CSV = [
  'Kill #,Timestamp,Bot,Weapon,TTK,Shots,Hits,Accuracy,Damage Done,Damage Possible,Efficiency,Cheated,OverShots',
  'Kills:,12',
  'Hit Count:,269',
  'Miss Count:,407',
  'Score:,13.45',
  'Scenario:,',
  'Hash:,',
  'Challenge Start:,21:27:16.167',
].join('\n')

test('parseStatsFilename reads a challenge run, including scenario names with " - "', () => {
  const parsed = parseStatsFilename('4BK - Reflex Arc Click Adapt - Challenge - 2026.11.02-05.17.14 Stats.csv')
  assert.ok(parsed)
  assert.equal(parsed.scenarioName, '4BK - Reflex Arc Click Adapt')
  assert.equal(parsed.isChallenge, true)
  assert.deepEqual(parsed.local, { year: 2026, month: 11, day: 2, hour: 5, minute: 17, second: 14 })
  // The stamp is local machine time; the ISO value follows this machine's zone.
  assert.equal(parsed.playedAt, new Date(2026, 10, 2, 5, 17, 14).toISOString())
  assert.equal(parsed.playedAtMs, localPartsToDate(parsed.local).getTime())
})

test('parseStatsFilename marks a file without "Challenge" as freeplay', () => {
  const parsed = parseStatsFilename('4BK - rx Reflex Flick Adapt - 2026.11.02-05.19.52 Stats.csv')
  assert.ok(parsed)
  assert.equal(parsed.scenarioName, '4BK - rx Reflex Flick Adapt')
  assert.equal(parsed.isChallenge, false)
})

test('parseStatsFilename rejects anything that is not a stats file', () => {
  assert.equal(parseStatsFilename('desktop.ini'), null)
  assert.equal(parseStatsFilename('1w3ts reload - Challenge - 2026.11.02 Stats.csv'), null)
  assert.equal(parseStatsFilename(' - Challenge - 2026.11.02-05.17.14 Stats.csv'), null)
  assert.equal(parseStatsFilename('1w3ts reload - Challenge - 2026.11.02-05.17.14 Stats.txt'), null)
})

test('parseStatsCsv reads the summary block (CRLF, BOM) from the end of the file', () => {
  const summary = parseStatsCsv('﻿' + CHALLENGE_CSV)
  assert.equal(summary.score, 108)
  assert.equal(summary.scenario, '1w3ts reload')
  assert.equal(summary.hash, '81a95f54261c31930abead90b6ad60eb')
  assert.equal(summary.challengeStart, '05:08:00.818')
  assert.equal(summary.kills, 108)
  assert.equal(summary.hitCount, 108)
  assert.equal(summary.missCount, 5)
})

test('parseStatsCsv returns nulls for an empty Scenario / Hash and a missing Score', () => {
  const summary = parseStatsCsv(FREEPLAY_CSV)
  assert.equal(summary.score, 13.45)
  assert.equal(summary.scenario, null)
  assert.equal(summary.hash, null)
  assert.equal(parseStatsCsv('Kills:,3\nScenario:,x').score, null)
})

test('localRunFromStats builds a challenge run from name + contents', () => {
  const run = localRunFromStats('1w3ts reload - Challenge - 2026.11.02-05.09.00 Stats.csv', CHALLENGE_CSV)
  assert.deepEqual(run, {
    scenarioName: '1w3ts reload',
    score: 108,
    playedAt: new Date(2026, 10, 2, 5, 9, 0).toISOString(),
    hash: '81a95f54261c31930abead90b6ad60eb',
    isChallenge: true,
  })
})

test('localRunFromStats keeps a freeplay run but never calls it a challenge', () => {
  const fromName = localRunFromStats('beanTS - 2026.11.02-04.53.14 Stats.csv', FREEPLAY_CSV)
  assert.ok(fromName)
  assert.equal(fromName.scenarioName, 'beanTS')
  assert.equal(fromName.isChallenge, false)
  // "Challenge" in the name but an empty Scenario: line is an aborted run.
  const aborted = localRunFromStats('beanTS - Challenge - 2026.11.02-04.53.14 Stats.csv', FREEPLAY_CSV)
  assert.ok(aborted)
  assert.equal(aborted.isChallenge, false)
})

test('localRunFromStats returns null without a score or for a non-stats file', () => {
  assert.equal(localRunFromStats('beanTS - 2026.11.02-04.53.14 Stats.csv', 'Kills:,3'), null)
  assert.equal(localRunFromStats('notes.txt', CHALLENGE_CSV), null)
})
