import useGameStore from '../store/useGameStore';

export default function GlitchLabel({ text, isDanger }) {
  const glitchEnabled = useGameStore(s => s.settings?.glitchEnabled ?? true);
  const reducedMotion = useGameStore(s => s.settings?.reducedMotion ?? false);
  const applyGlitch = isDanger && glitchEnabled && !reducedMotion;

  return (
    <span
      className={applyGlitch ? 'css-glitch' : ''}
      data-text={applyGlitch ? text : undefined}
    >
      {text}
    </span>
  );
}