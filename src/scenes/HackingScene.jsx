import { TopBorder, BottomBorder } from '../components/PeripheralBorder';
import TerminalLog from '../components/TerminalLog';
import CommandBar from '../components/CommandBar';
import useGameStore from '../store/useGameStore';

// ─── Status Gauges ────────────────────────────────────────────────────────────

function StatusRow({ label, value, colorFn, barColorFn }) {
  const labelColor = colorFn(value);
  const barColor   = barColorFn(value);

  return (
    <div className="flex items-center gap-2 px-3 py-0.5">
      <span className={`font-mono text-[10px] uppercase tracking-widest w-12 shrink-0 ${labelColor}`}>
        {label}
      </span>
      <div className="flex-1 h-[3px] bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className={`font-mono text-[10px] tabular-nums w-7 text-right ${labelColor}`}>
        {value.toFixed(0)}%
      </span>
    </div>
  );
}

export default function HackingScene() {
  const digitalTrace   = useGameStore(s => s.digitalTrace);
  const firewallHealth = useGameStore(s => s.firewallHealth);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Top 15% — Physical Heat peripheral */}
      <TopBorder />

      {/* Center 70% — Terminal + gauges + commands */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TerminalLog />

        {/* Status gauges divider */}
        <div className="border-t border-zinc-800/60 pt-1 pb-0.5">
          <StatusRow
            label="FW"
            value={firewallHealth}
            colorFn={() => 'text-zinc-500'}
            barColorFn={() => 'bg-violet-500'}
          />
          <StatusRow
            label={digitalTrace >= 80 ? '[!]TR' : 'TRACE'}
            value={digitalTrace}
            colorFn={v => v >= 80 ? 'text-red-400' : v >= 50 ? 'text-orange-400' : 'text-zinc-500'}
            barColorFn={v => v >= 80 ? 'bg-red-500' : v >= 50 ? 'bg-orange-500' : 'bg-blue-500'}
          />
        </div>

        <CommandBar />
      </div>

      {/* Bottom 15% — Credits + Pack Up peripheral */}
      <BottomBorder />
    </div>
  );
}
