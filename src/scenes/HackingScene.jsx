import { useState, useEffect } from 'react';
import { TopBorder, BottomBorder } from '../components/PeripheralBorder';
import TerminalLog from '../components/TerminalLog';
import CommandBar from '../components/CommandBar';
import useGameStore from '../store/useGameStore';
import AudioManager from '../utils/audioManager';

const DEFENSE_BADGE = {
  ENCRYPTED_LOGS:    { label: 'ENCRYPTED',  color: 'text-amber-400  border-amber-500/30  bg-amber-500/10'  },
  TRACE_ACCELERATOR: { label: 'TRACE x2',   color: 'text-red-400    border-red-500/30    bg-red-500/10'    },
  DARKNET:           { label: 'DARKNET',     color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10' },
};

const SAFEHOUSE_TRAIT_COLOR = {
  cyan:    'text-cyan-400    border-cyan-500/30    bg-cyan-500/10',
  amber:   'text-amber-400   border-amber-500/30   bg-amber-500/10',
  emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  slate:   'text-slate-400   border-slate-500/30   bg-slate-500/10',
  fuchsia: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10',
};

function NodeStatusStrip() {
  const node             = useGameStore(s => s.currentNode);
  const firewallRevealed = useGameStore(s => s.firewallRevealed);
  const heat             = useGameStore(s => s.physicalHeat);
  const safehouse        = useGameStore(s => s.currentSafehouse);

  if (!node) return null;

  const badge = node.specialDefense ? DEFENSE_BADGE[node.specialDefense] : null;
  const showDecryptedBadge = badge && node.specialDefense === 'ENCRYPTED_LOGS' && firewallRevealed;

  const isHeatWarning  = heat >= 50;
  const isHeatCritical = heat >= 80;

  const traitColor = SAFEHOUSE_TRAIT_COLOR[safehouse?.color] ?? SAFEHOUSE_TRAIT_COLOR.cyan;
  const showTrait  = safehouse?.trait && safehouse.trait !== 'Standard';

  return (
    <div className="px-4 py-1.5 border-b border-zinc-800/50 flex items-center justify-between gap-2 bg-zinc-900/40">
      <span className="font-mono text-[11px] font-bold text-zinc-400 uppercase tracking-widest truncate">
        // {node.name}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        {showTrait && (
          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${traitColor}`}
                title={safehouse.desc}>
            {safehouse.trait}
          </span>
        )}

        {isHeatWarning && (
          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
            isHeatCritical ? 'text-red-400 bg-red-500/10 animate-pulse' : 'text-orange-400 bg-orange-500/10'
          }`}>
            HEAT: {heat.toFixed(0)}%
          </span>
        )}

        {badge && (
          <span className={`font-mono text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
            showDecryptedBadge
              ? 'text-green-400 border-green-500/30 bg-green-500/10'
              : badge.color
          }`}>
            {showDecryptedBadge ? 'DECRYPTED' : badge.label}
          </span>
        )}
      </div>
    </div>
  );
}

function FirewallRow() {
  const firewallHealth   = useGameStore(s => s.firewallHealth);
  const node             = useGameStore(s => s.currentNode);
  const firewallRevealed = useGameStore(s => s.firewallRevealed);

  const isHidden = node?.specialDefense === 'ENCRYPTED_LOGS' && !firewallRevealed;
  const maxHP    = node?.firewallHP ?? 100;
  
  const totalBlocks = 10;
  const hpPercentage = Math.max(0, firewallHealth / maxHP);
  const activeBlocks = Math.ceil(hpPercentage * totalBlocks);

  return (
    <div className="flex items-center gap-4 px-4 py-1.5">
      <span className="font-mono text-[11px] uppercase tracking-widest w-12 shrink-0 text-zinc-400 font-bold">
        FW_HP
      </span>

      {isHidden ? (
        <div className="flex-1 flex gap-0.5 h-3">
          <div className="h-full w-full bg-amber-500/40 opacity-80 animate-pulse border border-amber-500/50" />
          <span className="font-mono text-[11px] font-bold tabular-nums w-7 text-right text-amber-500/80 ml-2">
            ??
          </span>
        </div>
      ) : (
        <div className="flex-1 flex gap-0.5 h-3">
          {Array.from({ length: totalBlocks }).map((_, i) => {
            const isActive = i < activeBlocks;
            return (
              <div
                key={i}
                className={`flex-1 h-full transition-all duration-150 ${
                  isActive 
                    ? 'bg-violet-500 border-y border-violet-400 shadow-[0_0_5px_rgba(139,92,246,0.3)]' 
                    : 'bg-zinc-800/50 border-y border-zinc-800'
                }`}
              />
            );
          })}
          <span className="font-mono text-[11px] tabular-nums w-8 text-right text-zinc-300 font-bold ml-1 shrink-0">
            {Math.ceil(firewallHealth)}
          </span>
        </div>
      )}
    </div>
  );
}

function TraceRow() {
  const trace         = useGameStore(s => s.digitalTrace);
  const node          = useGameStore(s => s.currentNode);
  const pulseActive   = useGameStore(s => s.pulseActive);
  const shakeEnabled  = useGameStore(s => s.settings?.shakeEnabled ?? true);
  const isAccelerated = node?.specialDefense === 'TRACE_ACCELERATOR'
                     || node?.specialDefense === 'DARKNET';

  const isDanger  = trace >= 80;
  const isWarning = trace >= 50;

  const labelColor = isDanger
    ? 'text-red-400'
    : pulseActive
      ? 'text-cyan-300'
      : isWarning
        ? 'text-orange-400'
        : 'text-zinc-400';

  const barGradient = isDanger
    ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
    : isWarning
      ? 'bg-gradient-to-r from-orange-600 to-orange-400'
      : pulseActive
        ? 'bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
        : 'bg-gradient-to-r from-blue-700 to-blue-500';

  return (
    <div className={`flex items-center gap-4 px-4 py-1.5 ${isDanger && shakeEnabled ? 'danger-shake' : ''}`}>
      <span className={`font-mono text-[11px] uppercase tracking-widest w-12 shrink-0 font-bold ${labelColor} ${isDanger || pulseActive ? 'animate-pulse' : ''}`}>
        {isDanger ? '[!]TR' : pulseActive ? 'SYNC' : isAccelerated ? 'TR x2' : 'TRACE'}
      </span>

      <div className={`flex-1 h-2.5 bg-black rounded-full overflow-hidden border shadow-inner relative transition-all duration-150 ${
        pulseActive ? 'border-cyan-500/60 shadow-[0_0_6px_rgba(34,211,238,0.3)]' : 'border-zinc-800'
      }`}>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
        <div
          className={`h-full rounded-full transition-all duration-300 ${barGradient} ${isAccelerated && !isDanger && !pulseActive ? 'opacity-80 animate-pulse' : ''}`}
          style={{ width: `${Math.min(100, trace)}%` }}
        />
      </div>

      <span className={`font-mono text-[11px] tabular-nums w-8 text-right font-bold shrink-0 ${labelColor}`}>
        {trace.toFixed(0)}%
      </span>
    </div>
  );
}

function ConsumableBar() {
  const consumables    = useGameStore(s => s.consumables);
  const useConsumable  = useGameStore(s => s.useConsumable);
  const hasBeatenGame  = useGameStore(s => s.hasBeatenGame);
  const intelFragments = useGameStore(s => s.intelFragments);
  const zeroDay        = consumables?.zeroDay ?? 0;
  const coolant        = consumables?.coolant ?? 0;

  if (!hasBeatenGame || (intelFragments < 50 && zeroDay === 0 && coolant === 0)) return null;

  return (
    <div className="flex gap-2 px-4 py-2 border-t border-zinc-800/40 pb-3">
      <button
        onClick={() => useConsumable('zeroDay')}
        disabled={zeroDay === 0}
        className={[
          'flex-1 py-3 px-4 rounded font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
          zeroDay > 0
            ? 'border-amber-500/60 border-b-amber-700 text-amber-400 bg-amber-500/5 hover:bg-amber-500/15'
            : 'border-zinc-800 border-b-zinc-900 text-zinc-600 bg-zinc-900/50 cursor-not-allowed',
        ].join(' ')}
      >
        ZER0-DAY [×{zeroDay}]
      </button>
      <button
        onClick={() => useConsumable('coolant')}
        disabled={coolant === 0}
        className={[
          'flex-1 py-3 px-4 rounded font-mono text-[11px] font-bold uppercase tracking-widest transition-all duration-75 border border-b-[4px] active:border-b active:translate-y-[2px]',
          coolant > 0
            ? 'border-blue-500/60 border-b-blue-700 text-blue-400 bg-blue-500/5 hover:bg-blue-500/15'
            : 'border-zinc-800 border-b-zinc-900 text-zinc-600 bg-zinc-900/50 cursor-not-allowed',
        ].join(' ')}
      >
        COOLANT [×{coolant}]
      </button>
    </div>
  );
}

export default function HackingScene() {
  const trace = useGameStore(s => s.digitalTrace);
  const heat  = useGameStore(s => s.physicalHeat);
  
  const status             = useGameStore(s => s.status);
  const transitOutcome     = useGameStore(s => s.transitOutcome);
  const isPerfectBreach    = useGameStore(s => s.isPerfectBreach);
  const sessionIntelEarned = useGameStore(s => s.sessionIntelEarned);
  const settings           = useGameStore(s => s.settings);

  const systemOverride  = useGameStore(s => s.systemOverride);
  const resolveOverride = useGameStore(s => s.resolveOverride);

  // State to track if the player has dismissed the resolution popup to read the logs
  const [popupDismissed, setPopupDismissed] = useState(false);

  // Reset the popup dismissal state whenever a new hack starts
  useEffect(() => {
    if (status !== 'resolved') {
      setPopupDismissed(false);
    }
  }, [status]);

  const handleDismissPopup = () => {
    AudioManager.playSFX('thock');
    if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    setPopupDismissed(true);
  };

  const isTraceDanger = trace >= 80;
  const isHeatDanger  = heat  >= 80;

  const isWin = status === 'resolved' && transitOutcome === 'success';
  const breachTearClass = isWin
    ? isPerfectBreach
      ? "contrast-[1.15] saturate-150 brightness-90 transition-all duration-500"
      : "contrast-[1.15] saturate-150 hue-rotate-[15deg] brightness-90 transition-all duration-500"
    : "transition-all duration-300 ease-in";

  let popupConfig = null;
  if (status === 'resolved') {
    if (transitOutcome === 'success') {
      popupConfig = {
        title: 'ACCESS GRANTED',
        sub: isPerfectBreach ? 'PERFECT BREACH EXECUTION' : 'NODE FIREWALL BYPASSED',
        intel: `PAYLOAD SECURED: +${sessionIntelEarned} IF`,
        border: 'border-green-500/60',
        headerBg: 'bg-green-500/20',
        titleColor: 'text-green-400',
        shadow: 'shadow-[0_0_40px_rgba(34,197,94,0.15)]'
      };
    } else if (transitOutcome === 'escaped') {
      popupConfig = {
        title: 'TACTICAL RETREAT',
        sub: 'CONNECTION CLOSED SAFELY',
        intel: `SALVAGED: +${sessionIntelEarned} IF`,
        border: 'border-amber-500/60',
        headerBg: 'bg-amber-500/20',
        titleColor: 'text-amber-400',
        shadow: 'shadow-[0_0_40px_rgba(245,158,11,0.15)]'
      };
    } else {
      popupConfig = {
        title: 'ACCESS DENIED',
        sub: transitOutcome === 'trace_busted' ? 'TRACE CRITICAL' : 'SAFEHOUSE RAIDED',
        intel: 'INTEL WIPED : 0 IF',
        border: 'border-red-500/60',
        headerBg: 'bg-red-500/20',
        titleColor: 'text-red-500',
        shadow: 'shadow-[0_0_40px_rgba(239,68,68,0.2)]'
      };
    }
  }

  return (
    <div className={`flex flex-col h-full bg-zinc-950 relative ${breachTearClass}`}>

      {isHeatDanger && <div className="siren-vignette" />}

      <TopBorder />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* ── OLD SCHOOL OS DIALOG POPUP ── */}
        {status === 'resolved' && popupConfig && !popupDismissed && (
          <div className={`absolute top-[40%] left-6 right-6 -translate-y-1/2 z-40 bg-zinc-950 border ${popupConfig.border} ${popupConfig.shadow} flex flex-col shadow-2xl`}>
            {/* Header Bar */}
            <div className={`px-3 py-1.5 flex justify-between items-center ${popupConfig.headerBg} border-b ${popupConfig.border}`}>
              <span className="font-mono text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                SYS_DIALOG.exe
              </span>
              <button 
                onClick={handleDismissPopup}
                className="w-6 h-6 flex items-center justify-center hover:bg-black/20 rounded transition-colors"
                aria-label="Close Dialog"
              >
                <div className={`w-3 h-3 border ${popupConfig.border} flex items-center justify-center`}>
                  <span className={`text-[8px] font-bold leading-none ${popupConfig.titleColor}`}>x</span>
                </div>
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
              
              <h2 className={`font-mono text-xl font-black uppercase tracking-widest mb-1 drop-shadow-md ${popupConfig.titleColor}`}>
                {popupConfig.title}
              </h2>
              
              <p className="font-mono text-[11px] text-zinc-300 uppercase tracking-widest mb-1 relative z-10">
                {popupConfig.sub}
              </p>
              
              <p className={`font-mono text-sm font-bold uppercase tracking-widest mb-5 relative z-10 ${popupConfig.titleColor}`}>
                {popupConfig.intel}
              </p>
              
              {/* Dismiss Button Strip */}
              <button 
                onClick={handleDismissPopup}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-500 active:bg-zinc-950 transition-all relative z-10 flex flex-col items-center group cursor-pointer"
              >
                <span className="font-mono text-[11px] font-bold text-zinc-300 group-hover:text-white uppercase tracking-widest transition-colors">
                  [ CLOSE DIALOG ]
                </span>
                <span className="font-mono text-[9px] text-zinc-500 group-hover:text-zinc-400 mt-1 uppercase tracking-widest transition-colors">
                  // Review Logs or Disconnect
                </span>
              </button>
            </div>
          </div>
        )}

        {systemOverride !== null && (
          <div className="absolute inset-x-6 top-[20%] z-50 flex flex-col">
            <button
              onPointerDown={(e) => { e.preventDefault(); resolveOverride(); }}
              className="w-full py-6 bg-red-950/95 backdrop-blur-md border-2 border-red-500 border-b-[6px] active:border-b-2 active:translate-y-1 rounded-lg shadow-[0_0_40px_rgba(239,68,68,0.6)] flex flex-col items-center justify-center danger-shake"
            >
              <span className="font-mono text-xl font-black text-red-500 uppercase tracking-[0.2em] animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                SYSTEM OVERRIDE
              </span>
              <span className="font-mono text-[11px] font-bold text-white uppercase tracking-widest mt-2 bg-red-600/90 px-3 py-1 rounded">
                TAP TO INTERCEPT // {systemOverride}s
              </span>
            </button>
          </div>
        )}

        <NodeStatusStrip />

        <TerminalLog className={isTraceDanger ? 'digital-glitch' : ''} />

        <div className="border-t border-zinc-800/60 pt-1 pb-0.5">
          <FirewallRow />
          <TraceRow />
        </div>

        <ConsumableBar />

        <CommandBar />
      </div>

      <BottomBorder />
    </div>
  );
}