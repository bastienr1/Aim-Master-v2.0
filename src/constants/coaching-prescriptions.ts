export interface SubcategoryPrescription {
  scenarios: string[];
  focusTip: string;
  sessionStructure: string;
}

export const SUBCATEGORY_PRESCRIPTIONS: Record<string, SubcategoryPrescription> = {
  Dynamic: {
    scenarios: ['VT Floating Heads Intermediate S5', 'VT Popcorn Intermediate S5'],
    focusTip: 'Center your crosshair before each flick. Wait for the target to settle at apex.',
    sessionStructure: '2 warmup runs + 3 focused runs. Rest 30s between runs.',
  },
  Static: {
    scenarios: ['VT ww5t Intermediate S5', 'VT Pasu Intermediate S5'],
    focusTip: 'Crosshair placement at target apex. Smooth flick, don\'t micro-adjust after.',
    sessionStructure: '2 warmup runs + 3 focused runs. Focus on first-shot accuracy.',
  },
  Reactive: {
    scenarios: ['VT Bounceshot Intermediate S5', 'VT 1w2ts reload Intermediate S5'],
    focusTip: 'React to target appearance, don\'t predict. Clean single clicks.',
    sessionStructure: '3 focused runs. If scores plateau after run 2, switch scenario.',
  },
  Linear: {
    scenarios: ['VT Aether Intermediate S5', 'VT Frogtrack Intermediate S5'],
    focusTip: 'Lead the target slightly. Low tension for smooth tracking, tension spike on direction change.',
    sessionStructure: '2 warmup runs on easier variant + 3 focused runs.',
  },
  Precise: {
    scenarios: ['VT PreciseOrb Intermediate S5', 'VT ArcTS Intermediate S5'],
    focusTip: 'Micro-corrections with wrist only. Keep arm stable, adjust with fingers.',
    sessionStructure: '3 focused runs. Speed is secondary to smoothness.',
  },
  Speed: {
    scenarios: ['VT DotTS Intermediate S5', 'VT EddieTS Intermediate S5'],
    focusTip: 'Fast acquisition, not perfect accuracy. Build tempo over precision.',
    sessionStructure: '2 runs building speed, then 2 runs at max comfortable speed.',
  },
  Evasive: {
    scenarios: ['VT DriftTS Intermediate S5', 'VT FlyTS Intermediate S5'],
    focusTip: 'Track the movement pattern first, then engage. Predict the evasion.',
    sessionStructure: '3 focused runs. Prioritize tracking the pattern over clicking.',
  },
  Control: {
    scenarios: ['VT ControlTS Intermediate S5', 'VT PentaBounce Intermediate S5'],
    focusTip: 'Patient target clearing. Identify clusters, clear as groups.',
    sessionStructure: '2 warmup + 3 focused. Use cluster navigation — group nearby targets.',
  },
  Stability: {
    scenarios: ['VT PentaBounce Intermediate S5', 'VT ControlTS Intermediate S5'],
    focusTip: 'Slow and methodical. Accuracy over speed. Build the rhythm.',
    sessionStructure: '3 focused runs. If you feel rushed, slow down deliberately.',
  },
};
