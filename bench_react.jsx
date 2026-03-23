import React, { useMemo } from 'react';
import { render } from '@testing-library/react';
import { performance } from 'perf_hooks';

// Simulate game store
const useGameStore = (selector) => {
  const store = {
    getCurrentAct: () => 2,
    gameMode: 'normal',
    arcadeStats: { score: 100 },
    exposedTicks: 0,
    isHitStopped: false
  };
  return selector(store);
};

function BossCoreBaseline({ trace, heat, fwHealth, maxFw, parsedLog }) {
  const exposedTicks = useGameStore(s => s.exposedTicks);
  const isHitStopped = useGameStore(s => s.isHitStopped);
  const getCurrentAct = useGameStore(s => s.getCurrentAct);
  const act = getCurrentAct ? getCurrentAct() : 1;
  const gameMode = useGameStore(s => s.gameMode);
  const arcadeScore = useGameStore(s => s.arcadeStats?.score ?? 0);

  const hueShift = gameMode === 'arcade' ? arcadeScore * 15 : (act - 1) * 60;

  const recentLogs = parsedLog.slice(-3);

  const isStaggered = recentLogs.some(l => l.includes('CRITICAL OVERRIDE') || l.includes('2.0x MULTIPLIER'));
  const isTripleThreat = recentLogs.some(l => l.includes('TRIPLE_THREAT_DETONATION'));

  const maxDanger = Math.max(trace, heat);

  return (
    <div data-hue={hueShift} data-staggered={isStaggered} data-triple={isTripleThreat} data-danger={maxDanger}>
      BossCore Baseline
    </div>
  );
}

function BossCoreOptimized({ trace, heat, fwHealth, maxFw, parsedLog }) {
  const exposedTicks = useGameStore(s => s.exposedTicks);
  const isHitStopped = useGameStore(s => s.isHitStopped);
  const getCurrentAct = useGameStore(s => s.getCurrentAct);
  const act = getCurrentAct ? getCurrentAct() : 1;
  const gameMode = useGameStore(s => s.gameMode);
  const arcadeScore = useGameStore(s => s.arcadeStats?.score ?? 0);

  const { hueShift, isStaggered, isTripleThreat } = useMemo(() => {
    const shift = gameMode === 'arcade' ? arcadeScore * 15 : (act - 1) * 60;

    let staggered = false;
    let triple = false;
    const len = parsedLog.length;
    const startIdx = Math.max(0, len - 3);

    for (let i = startIdx; i < len; i++) {
      const l = parsedLog[i];
      if (!staggered && (l.includes('CRITICAL OVERRIDE') || l.includes('2.0x MULTIPLIER'))) {
        staggered = true;
      }
      if (!triple && l.includes('TRIPLE_THREAT_DETONATION')) {
        triple = true;
      }
      if (staggered && triple) break;
    }

    return { hueShift: shift, isStaggered: staggered, isTripleThreat: triple };
  }, [gameMode, arcadeScore, act, parsedLog]);

  const maxDanger = Math.max(trace, heat);

  return (
    <div data-hue={hueShift} data-staggered={isStaggered} data-triple={isTripleThreat} data-danger={maxDanger}>
      BossCore Optimized
    </div>
  );
}

const runBenchmark = () => {
  const parsedLog = Array.from({ length: 100 }, (_, i) => `Log entry ${i}`);
  parsedLog.push("CRITICAL OVERRIDE");

  const ITERATIONS = 10000;

  let start = performance.now();
  const baselineInstance = render(<BossCoreBaseline trace={0} heat={0} fwHealth={100} maxFw={100} parsedLog={parsedLog} />);
  for (let i = 0; i < ITERATIONS; i++) {
    baselineInstance.rerender(<BossCoreBaseline trace={i % 100} heat={i % 100} fwHealth={100} maxFw={100} parsedLog={parsedLog} />);
  }
  let end = performance.now();
  const baselineTime = end - start;

  start = performance.now();
  const optimizedInstance = render(<BossCoreOptimized trace={0} heat={0} fwHealth={100} maxFw={100} parsedLog={parsedLog} />);
  for (let i = 0; i < ITERATIONS; i++) {
    optimizedInstance.rerender(<BossCoreOptimized trace={i % 100} heat={i % 100} fwHealth={100} maxFw={100} parsedLog={parsedLog} />);
  }
  end = performance.now();
  const optimizedTime = end - start;

  console.log(`Baseline Render Time (10k rerenders): ${baselineTime.toFixed(2)}ms`);
  console.log(`Optimized Render Time (10k rerenders): ${optimizedTime.toFixed(2)}ms`);
  console.log(`Improvement: ${((baselineTime - optimizedTime) / baselineTime * 100).toFixed(2)}%`);
};

runBenchmark();
