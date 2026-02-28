import { useEffect } from 'react';
import useGameStore from './store/useGameStore';
import HackingScene from './scenes/HackingScene';
import TransitScene from './scenes/TransitScene';
import { TICK_INTERVAL_MS } from './config/constants';

export default function App() {
  const status = useGameStore(s => s.status);
  const tick   = useGameStore(s => s.tick);

  // Global heartbeat — the single timer driving all time-based game events.
  // All logic resolves inside the store's tick(); this component only fires it.
  useEffect(() => {
    const id = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <div className="h-screen w-screen max-w-sm mx-auto flex flex-col overflow-hidden">
      {status === 'hacking' ? <HackingScene /> : <TransitScene />}
    </div>
  );
}
