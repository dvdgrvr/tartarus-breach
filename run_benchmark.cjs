const { performance } = require('perf_hooks');

const generateLog = (size) => {
  return Array.from({ length: size }, (_, i) => {
    if (i % 2 === 0) return `Log entry ${i}`;
    return { text: `Log entry ${i}`, type: 'system' };
  });
};

const runBenchmark = () => {
  const log = generateLog(100);

  const startBaseline = performance.now();
  for (let i = 0; i < 100000; i++) {
    const recentLogs = (log || []).slice(-3).map(l => typeof l === 'string' ? l : (l?.text || ''));
    const wasCritical = recentLogs.some(l => l.includes('CRITICAL OVERRIDE'));
  }
  const endBaseline = performance.now();
  const baselineTime = endBaseline - startBaseline;

  const startOptimized = performance.now();
  for (let i = 0; i < 100000; i++) {
    let wasCritical = false;
    if (log && log.length > 0) {
      const len = log.length;
      const startIdx = Math.max(0, len - 3);
      for (let j = startIdx; j < len; j++) {
        const entry = log[j];
        const text = typeof entry === 'string' ? entry : (entry && entry.text) || '';
        if (text.includes('CRITICAL OVERRIDE')) {
          wasCritical = true;
          break;
        }
      }
    }
  }
  const endOptimized = performance.now();
  const optimizedTime = endOptimized - startOptimized;

  console.log(`Baseline time: ${baselineTime.toFixed(2)}ms`);
  console.log(`Optimized time: ${optimizedTime.toFixed(2)}ms`);
  console.log(`Improvement: ${((baselineTime - optimizedTime) / baselineTime * 100).toFixed(2)}%`);
};

runBenchmark();
