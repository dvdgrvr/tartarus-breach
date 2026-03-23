import { useState, useEffect, useMemo, useRef } from 'react';
import useGameStore from '../../store/useGameStore';

export default function BossCore({ trace, heat, fwHealth, maxFw, parsedLog }) {

  const exposedTicks = useGameStore(s => s.exposedTicks);
  const isHitStopped = useGameStore(s => s.isHitStopped);

  // ── THE MAGIC MATH ──
  const getCurrentAct = useGameStore(s => s.getCurrentAct);
  const act = getCurrentAct ? getCurrentAct() : 1;
  const gameMode    = useGameStore(s => s.gameMode);
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
  const healthPercent = fwHealth / maxFw;
  const isEnraged = maxDanger >= 80;
  const isAlert = maxDanger >= 50;

  const borderColor = isEnraged ? 'border-red-500' : isAlert ? 'border-amber-500' : 'border-cyan-500';
  const shadowColor = isEnraged ? 'shadow-[0_0_60px_rgba(239,68,68,0.6)]' : isAlert ? 'shadow-[0_0_50px_rgba(245,158,11,0.5)]' : 'shadow-[0_0_40px_rgba(34,211,238,0.4)]';
  const coreBg      = isEnraged ? 'bg-red-500' : isAlert ? 'bg-amber-500' : 'bg-cyan-500';
  const innerColor  = isEnraged ? 'bg-red-500/20' : isAlert ? 'bg-amber-500/20' : 'bg-cyan-500/10';

  const [particles, setParticles] = useState([]);
  const [beams, setBeams] = useState([]);
  const prevFw = useRef(fwHealth);

  useEffect(() => {
    if (fwHealth < prevFw.current) {
      const dmg = prevFw.current - fwHealth;

      const newParticle = {
        id: Date.now() + Math.random(),
        dmg: Math.ceil(dmg),
        isCrit: isStaggered || isTripleThreat,
        isMega: isTripleThreat,
        x: (Math.random() - 0.5) * 140,
        y: (Math.random() - 0.5) * 80,
        rot: (Math.random() - 0.5) * 40
      };

      const numTracers = isTripleThreat ? 12 : (isStaggered ? 5 : 1);
      const newBeams = Array.from({ length: numTracers }).map((_, i) => ({
        id: Date.now() + Math.random(),
        isCrit: isStaggered || isTripleThreat,
        x: (Math.random() - 0.5) * (isTripleThreat ? 250 : 160),
        delay: i * (isTripleThreat ? 30 : 60),
        tailHeight: 150 + Math.random() * 100,
        hex: Math.floor(Math.random() * 65535).toString(16).toUpperCase()
      }));

      setParticles(p => [...p, newParticle]);
      setBeams(b => [...b, ...newBeams]);
      setTimeout(() => setParticles(p => p.filter(x => x.id !== newParticle.id)), 1200);
      setTimeout(() => {
        const bIds = newBeams.map(b => b.id);
        setBeams(b => b.filter(x => !bIds.includes(x.id)));
      }, 1000);
    }
    prevFw.current = fwHealth;
  }, [fwHealth, isStaggered, isTripleThreat]);

  const playState = isHitStopped ? 'paused' : 'running';
  const staggerEffect = isStaggered ? 'scale-95 brightness-150 contrast-125 danger-shake' : 'scale-100 brightness-100 contrast-100 animate-boss-breathe';
  const finisherClass = isTripleThreat ? 'animate-shake-extreme brightness-[2] saturate-200' : '';

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* ─── FULL SCREEN FLASH ─── */}
      {isTripleThreat && <div className="absolute inset-0 z-[100] bg-white animate-supernova" />}

      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/10 via-zinc-950/40 to-zinc-950" />

      {/* MASSIVE CONTAINER (Filter Applied Here) */}
      <div className={`absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 flex items-center justify-center opacity-90 mix-blend-screen transition-all duration-75 ease-out ${staggerEffect} ${finisherClass}`}
           style={{
             animationPlayState: playState,
             filter: `hue-rotate(${hueShift}deg)` // <--- This shifts the color!
           }}>

        {/* ─── 90s TARGET LOCK ─── */}
        {exposedTicks > 0 && (
          <div className="absolute inset-[-40px] flex items-center justify-center z-20 animate-[spin_4s_linear_infinite]"
               style={{ animationPlayState: playState }}>
            <div className="w-full h-full border-[3px] border-amber-400/80 rounded-full border-dashed opacity-80" />
            <div className="absolute w-[120%] h-[2px] bg-amber-400/40" />
            <div className="absolute h-[120%] w-[2px] bg-amber-400/40" />
            <div className="absolute font-display text-xs md:text-xs text-black font-black bg-amber-400 tracking-widest px-2 shadow-[0_0_15px_rgba(251,191,36,0.8)]">
              CRITICAL_LOCK_ACQUIRED
            </div>
          </div>
        )}

        {/* ─── TRIPLE RING GEOMETRY ─── */}

        {/* Ring 1: Outer Shield (Heavy) */}
        <div className={`absolute inset-0 rounded-full border-t-[10px] border-b-[4px] border-r-[6px] border-dashed ${borderColor} ${shadowColor} animate-[spin_10s_linear_infinite] transition-all duration-500`}
             style={{ opacity: 0.3 + (healthPercent * 0.7), animationPlayState: playState }} />

        {/* Ring 2: Mid Processing (Dotted) */}
        <div className={`absolute inset-8 rounded-full border-[6px] border-dotted ${borderColor} ${shadowColor} animate-[spin_15s_linear_infinite_reverse] opacity-80`}
             style={{ animationPlayState: playState }} />

        {/* Ring 3: Inner Data (Thin) */}
        <div className={`absolute inset-16 rounded-full border-[2px] border-dashed ${borderColor} opacity-40 animate-[spin_5s_linear_infinite]`}
             style={{ animationPlayState: playState }} />

        {/* The Core Eye */}
        <div className={`absolute w-16 h-16 md:w-24 md:h-24 rounded-sm border-[4px] rotate-45 ${borderColor} ${shadowColor} ${innerColor} transition-colors duration-500 flex items-center justify-center`}
             style={{ animationPlayState: playState }}>
          <div className={`w-1/2 h-1/2 rounded-full ${coreBg} ${isEnraged ? 'animate-pulse' : ''}`}
               style={{ animationPlayState: playState }} />
          {(particles.length > 0) && <div className="absolute inset-0 bg-white rounded-sm animate-ping" />}
        </div>

        {/* ─── DATA BEAMS ─── */}
        {beams.map(b => (
          <div
            key={b.id}
            className="absolute z-10 flex flex-col items-center pointer-events-none animate-data-strike opacity-0-start"
            style={{
              left: `calc(50% + ${b.x}px)`,
              bottom: '-120px',
              animationDelay: `${b.delay}ms`,
              animationPlayState: playState
            }}
          >
            <span className={`font-mono text-xs sm:text-sm font-black leading-none mb-1 ${b.isCrit ? 'text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,1)]' : 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,1)]'}`}>
              0x{b.hex}
            </span>
            <div
              className={`w-3 sm:w-4 ${b.isCrit ? 'text-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.5)]' : 'text-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.5)]'}`}
              style={{
                height: `${b.tailHeight}px`,
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 2px, currentColor 2px, currentColor 6px)'
              }}
            />
          </div>
        ))}

        {/* ─── DAMAGE NUMBERS ─── */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute z-50 font-display uppercase tracking-widest pointer-events-none animate-damage opacity-0-start flex flex-col items-center justify-center"
            style={{
              left: `calc(50% + ${p.x}px)`,
              top:  `calc(50% + ${p.y}px)`,
              transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
              animationDelay: p.isCrit ? '250ms' : '100ms',
              animationPlayState: playState
            }}
          >
            <span className={`font-black uppercase tracking-tighter ${p.isMega ? 'text-6xl sm:text-8xl text-white drop-shadow-[0_0_30px_rgba(255,255,255,1)]' : 'text-4xl sm:text-5xl text-amber-400'}`}>
              -{p.dmg} {p.isMega && '!!!'}
            </span>
          </div>
        ))}

      </div>
    </div>
  );
}