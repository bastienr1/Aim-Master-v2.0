// Voltaic S5 Benchmark Rank Colors
export const RANK_COLORS: Record<string, string> = {
  'Unranked':     '#5A6872',
  'Iron':         '#8B8B8B',
  'Bronze':       '#CD7F32',
  'Silver':       '#C0C0C0',
  'Gold':         '#FFD700',
  'Gold+':        '#FFD700',
  'Platinum':     '#06B6D4',
  'Diamond':      '#60A5FA',
  'Jade':         '#34D399',
  'Master':       '#D946EF',
  'Master+':      '#D946EF',
  'Grandmaster':  '#EF4444',
  'Nova':         '#F97316',
  'Astra':        '#FBBF24',
  'Celestial':    '#E879F9',
  'Celestial+':   '#E879F9',
};

// Tier definitions: which ranks belong to each difficulty level
const TIER_RANKS = {
  novice:       ['Unranked', 'Iron', 'Bronze', 'Silver', 'Gold', 'Gold+'],
  intermediate: ['Unranked', 'Platinum', 'Diamond', 'Jade', 'Master', 'Master+'],
  advanced:     ['Unranked', 'Grandmaster', 'Nova', 'Astra', 'Celestial', 'Celestial+'],
};

interface ThresholdEntry {
  tier: 'novice' | 'intermediate' | 'advanced';
  thresholds: number[]; // 5 values: one per rank after Unranked
}

// Complete S5 thresholds: scenario name -> tier + [rank1, rank2, rank3, rank4, rank5]
const THRESHOLDS: Record<string, ThresholdEntry> = {
  // ===== NOVICE: Iron, Bronze, Silver, Gold, Gold+ =====
  // Clicking
  'VT Pasu Novice':              { tier: 'novice', thresholds: [555, 660, 745, 800, 855] },
  'VT Popcorn Novice':           { tier: 'novice', thresholds: [390, 500, 600, 720, 840] },
  'VT 1w4ts Novice':             { tier: 'novice', thresholds: [820, 915, 1010, 1110, 1210] },
  'VT ww5t Novice':              { tier: 'novice', thresholds: [990, 1090, 1190, 1290, 1390] },
  'VT Frogtagon Novice':         { tier: 'novice', thresholds: [620, 740, 850, 980, 1110] },
  'VT Floating Heads Novice':    { tier: 'novice', thresholds: [375, 460, 540, 640, 740] },
  // Tracking
  'VT PGT Novice':               { tier: 'novice', thresholds: [1900, 2325, 2775, 3050, 3325] },
  'VT Snake Track Novice':       { tier: 'novice', thresholds: [2400, 2750, 3125, 3425, 3725] },
  'VT Aether Novice':            { tier: 'novice', thresholds: [1525, 1900, 2250, 2650, 3050] },
  'VT Ground Novice':            { tier: 'novice', thresholds: [2100, 2500, 2825, 3100, 3375] },
  'VT Raw Control Novice':       { tier: 'novice', thresholds: [2125, 2550, 2975, 3450, 3925] },
  'VT Controlsphere Novice':     { tier: 'novice', thresholds: [1575, 1950, 2400, 2900, 3400] },
  // Switching
  'VT DotTS Novice':             { tier: 'novice', thresholds: [845, 940, 1030, 1090, 1150] },
  'VT EddieTS Novice':           { tier: 'novice', thresholds: [640, 730, 810, 890, 970] },
  'VT DriftTS Novice':           { tier: 'novice', thresholds: [315, 355, 390, 430, 470] },
  'VT FlyTS Novice':             { tier: 'novice', thresholds: [420, 460, 500, 535, 570] },
  'VT ControlTS Novice':         { tier: 'novice', thresholds: [340, 380, 420, 450, 480] },
  'VT Penta Bounce Novice':      { tier: 'novice', thresholds: [290, 340, 390, 445, 500] },

  // ===== INTERMEDIATE: Platinum, Diamond, Jade, Master, Master+ =====
  // Clicking
  'VT Pasu Intermediate':              { tier: 'intermediate', thresholds: [770, 850, 930, 980, 1030] },
  'VT Popcorn Intermediate':           { tier: 'intermediate', thresholds: [600, 690, 780, 860, 940] },
  'VT 1w3ts Intermediate':             { tier: 'intermediate', thresholds: [1120, 1220, 1300, 1380, 1460] },
  'VT ww5t Intermediate':              { tier: 'intermediate', thresholds: [1310, 1400, 1490, 1560, 1630] },
  'VT Frogtagon Intermediate':         { tier: 'intermediate', thresholds: [940, 1040, 1140, 1230, 1320] },
  'VT Floating Heads Intermediate':    { tier: 'intermediate', thresholds: [610, 690, 770, 860, 950] },
  // Tracking
  'VT PGT Intermediate':               { tier: 'intermediate', thresholds: [2275, 2675, 3050, 3325, 3600] },
  'VT Snake Track Intermediate':       { tier: 'intermediate', thresholds: [2800, 3175, 3500, 3750, 4000] },
  'VT Aether Intermediate':            { tier: 'intermediate', thresholds: [2175, 2550, 2900, 3175, 3450] },
  'VT Ground Intermediate':            { tier: 'intermediate', thresholds: [2550, 2850, 3100, 3350, 3600] },
  'VT Raw Control Intermediate':       { tier: 'intermediate', thresholds: [2775, 3200, 3550, 3875, 4200] },
  'VT Controlsphere Intermediate':     { tier: 'intermediate', thresholds: [2750, 3175, 3525, 3825, 4125] },
  // Switching
  'VT DotTS Intermediate':             { tier: 'intermediate', thresholds: [1110, 1180, 1230, 1280, 1330] },
  'VT EddieTS Intermediate':           { tier: 'intermediate', thresholds: [880, 950, 1020, 1080, 1140] },
  'VT DriftTS Intermediate':           { tier: 'intermediate', thresholds: [390, 430, 460, 490, 520] },
  'VT FlyTS Intermediate':             { tier: 'intermediate', thresholds: [520, 570, 610, 650, 690] },
  'VT ControlTS Intermediate':         { tier: 'intermediate', thresholds: [420, 460, 485, 520, 555] },
  'VT Penta Bounce Intermediate':      { tier: 'intermediate', thresholds: [450, 490, 540, 580, 620] },

  // ===== ADVANCED: Grandmaster, Nova, Astra, Celestial, Celestial+ =====
  // Clicking
  'VT Pasu Advanced':              { tier: 'advanced', thresholds: [910, 1020, 1110, 1240, 1370] },
  'VT Popcorn Advanced':           { tier: 'advanced', thresholds: [680, 800, 910, 1020, 1130] },
  'VT 1w2ts Advanced':             { tier: 'advanced', thresholds: [1320, 1420, 1520, 1620, 1720] },
  'VT ww5t Advanced':              { tier: 'advanced', thresholds: [1510, 1610, 1720, 1860, 2000] },
  'VT Frogtagon Advanced':         { tier: 'advanced', thresholds: [1090, 1220, 1360, 1490, 1620] },
  'VT Floating Heads Advanced':    { tier: 'advanced', thresholds: [740, 830, 920, 1050, 1180] },
  // Tracking
  'VT PGT Advanced':               { tier: 'advanced', thresholds: [2750, 3175, 3625, 4050, 4475] },
  'VT Snake Track Advanced':       { tier: 'advanced', thresholds: [3050, 3425, 3725, 4050, 4375] },
  'VT Aether Advanced':            { tier: 'advanced', thresholds: [2750, 3175, 3525, 3825, 4125] },
  'VT Ground Advanced':            { tier: 'advanced', thresholds: [2875, 3200, 3500, 3725, 3950] },
  'VT Raw Control Advanced':       { tier: 'advanced', thresholds: [3150, 3550, 3875, 4250, 4625] },
  'VT Controlsphere Advanced':     { tier: 'advanced', thresholds: [3100, 3475, 3800, 4125, 4450] },
  // Switching
  'VT DotTS Advanced':             { tier: 'advanced', thresholds: [1280, 1360, 1420, 1500, 1580] },
  'VT EddieTS Advanced':           { tier: 'advanced', thresholds: [1020, 1120, 1200, 1280, 1360] },
  'VT DriftTS Advanced':           { tier: 'advanced', thresholds: [430, 470, 510, 540, 570] },
  'VT FlyTS Advanced':             { tier: 'advanced', thresholds: [540, 600, 660, 720, 780] },
  'VT ControlTS Advanced':         { tier: 'advanced', thresholds: [450, 490, 520, 550, 580] },
  'VT Penta Bounce Advanced':      { tier: 'advanced', thresholds: [530, 580, 630, 670, 710] },
};

// ===== LOOKUP FUNCTION =====
export function getScenarioRank(scenarioName: string, score: number) {
  // Try exact match first, then try with/without "S5" suffix
  const variants = [
    scenarioName,
    scenarioName.replace(/ S5$/i, ''),
    scenarioName + ' S5',
  ];

  let entry: ThresholdEntry | undefined;
  for (const v of variants) {
    // Case-insensitive lookup
    const key = Object.keys(THRESHOLDS).find(k => k.toLowerCase() === v.toLowerCase());
    if (key) {
      entry = THRESHOLDS[key];
      break;
    }
  }

  if (!entry) {
    return {
      rank: 'Unranked',
      nextRank: null as string | null,
      color: '#5A6872',
      nextColor: null as string | null,
      progress: 0,
      nextThreshold: null as number | null,
      isVoltaic: false,
    };
  }

  const ranks = TIER_RANKS[entry.tier];

  // Find current rank: walk thresholds to find highest achieved
  let rankIndex = 0; // 0 = Unranked
  for (let i = 0; i < entry.thresholds.length; i++) {
    if (score >= entry.thresholds[i]) {
      rankIndex = i + 1;
    }
  }

  const currentRank = ranks[rankIndex];
  const nextRankIdx = rankIndex + 1;
  const nextRank = nextRankIdx < ranks.length ? ranks[nextRankIdx] : null;

  // Progress calculation
  let progress = 0;
  const currentFloor = rankIndex > 0 ? entry.thresholds[rankIndex - 1] : 0;
  const nextThreshold = rankIndex < entry.thresholds.length ? entry.thresholds[rankIndex] : null;

  if (nextThreshold !== null) {
    const range = nextThreshold - currentFloor;
    progress = range > 0 ? Math.min(100, Math.max(0, ((score - currentFloor) / range) * 100)) : 0;
  } else {
    progress = 100;
  }

  return {
    rank: currentRank,
    nextRank,
    color: RANK_COLORS[currentRank] || '#5A6872',
    nextColor: nextRank ? (RANK_COLORS[nextRank] || '#5A6872') : null,
    progress,
    nextThreshold,
    isVoltaic: true,
  };
}
