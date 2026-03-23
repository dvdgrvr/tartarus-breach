import { performance } from 'perf_hooks';

const benchmarkLogParsing = () => {
  // Simulate the parsedLog that BossCore receives.
  // HackingScene passes `parsedLog` which is already strings:
  // parsedLog = useMemo(() => (rawLog || []).map(entry => typeof entry === 'string' ? entry : (entry?.text || '')), [rawLog]);
  const parsedLog = Array.from({ length: 100 }, (_, i) => `Log entry ${i}`);
  parsedLog.push("CRITICAL OVERRIDE DETECTED");

  // Other props for hueShift
  const gameMode = 'normal';
  const arcadeScore = 0;
  const act = 2;

  let isStaggered = false;
  let isTripleThreat = false;
  let hueShift = 0;

  const ITERATIONS = 1000000;

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    // Current Code:
    hueShift = gameMode === 'arcade' ? arcadeScore * 15 : (act - 1) * 60;

    // safeLog slice and map is redundant now because parsedLog is already processed in the useMemo in HackingScene
    // Wait, the current code in BossCore reads:
    // const safeLog = rawLog || [];
    // but the props actually pass `parsedLog`
    // Wait, BossCore receives `parsedLog` as a prop!
    // Let's look at BossCore arguments:
    // function BossCore({ trace, heat, fwHealth, maxFw, parsedLog })

    // The current code in BossCore inside HackingScene.jsx is:
    /*
      const hueShift = gameMode === 'arcade' ? arcadeScore * 15 : (act - 1) * 60;

      const recentLogs = parsedLog.slice(-3);

      // Detection Logic
      const isStaggered = recentLogs.some(l => l.includes('CRITICAL OVERRIDE') || l.includes('2.0x MULTIPLIER'));
      const isTripleThreat = recentLogs.some(l => l.includes('TRIPLE_THREAT_DETONATION'));
    */

    const recentLogs = parsedLog.slice(-3);

    isStaggered = recentLogs.some(l => l.includes('CRITICAL OVERRIDE') || l.includes('2.0x MULTIPLIER'));
    isTripleThreat = recentLogs.some(l => l.includes('TRIPLE_THREAT_DETONATION'));
  }
  const end = performance.now();

  console.log(`Baseline time for ${ITERATIONS} cycles: ${(end - start).toFixed(2)}ms`);

  // Simulated optimized code:
  const startOpt = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    // If we memoize it in useMemo, this block runs 0 times when trace/heat change
    // but let's measure just the execution cost itself
    hueShift = gameMode === 'arcade' ? arcadeScore * 15 : (act - 1) * 60;

    const len = parsedLog.length;
    let localStaggered = false;
    let localTriple = false;

    const startIdx = Math.max(0, len - 3);
    for (let j = startIdx; j < len; j++) {
      const l = parsedLog[j];
      if (!localStaggered && (l.includes('CRITICAL OVERRIDE') || l.includes('2.0x MULTIPLIER'))) {
        localStaggered = true;
      }
      if (!localTriple && l.includes('TRIPLE_THREAT_DETONATION')) {
        localTriple = true;
      }
      if (localStaggered && localTriple) break;
    }
  }
  const endOpt = performance.now();
  console.log(`Optimized logic time: ${(endOpt - startOpt).toFixed(2)}ms`);
}

benchmarkLogParsing();
