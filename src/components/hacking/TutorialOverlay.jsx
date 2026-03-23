import { TUTORIAL_PROMPTS } from './hackingConstants';

export default function TutorialOverlay({ step }) {
  const prompt = TUTORIAL_PROMPTS[step];
  if (!prompt) return null;
  return (
    // Full-screen dim — pointer-events-none throughout so CommandBar stays clickable
    <div className="absolute inset-0 z-[50] pointer-events-none">
      {/* Background vignette — leaves CommandBar area interactive */}
      <div className="absolute inset-0 bg-black/55" />
      {/* Dialogue box pinned to the top-third of the screen */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[90%] max-w-sm">
        <div className="glass-panel border-2 border-fuchsia-500/80 bg-zinc-950/95 backdrop-blur-md p-4 rounded-lg shadow-[0_0_30px_rgba(217,70,239,0.6)]">
          <p className="font-mono text-xs uppercase tracking-widest text-fuchsia-400/60 mb-1">
            [ NEURAL_CALIBRATION :: {step} ]
          </p>
          <p className="font-display font-black text-fuchsia-300 text-sm uppercase tracking-widest mb-1" style={{letterSpacing:'0.15em'}}>
            {prompt.title}
          </p>
          <p className="font-mono text-xs text-zinc-300 leading-relaxed">
            {prompt.body}
          </p>
        </div>
      </div>
    </div>
  );
}