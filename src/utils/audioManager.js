// ─── Audio Manager ────────────────────────────────────────────────────────────
// Singleton utility for SFX playback.
// Reads sfxEnabled + masterVolume from the Zustand store at call-time so it
// always reflects the current settings without React coupling.
// Audio objects are pooled per soundId to avoid repeated instantiation cost.
//
// Drop .mp3 files into /public/sounds/ to activate them; until then each call
// falls back silently to a console.log so the game never crashes.

import useGameStore from '../store/useGameStore';

const _pool = {};

const AudioManager = {
  playSFX(soundId, volume = 1.0) {
    const { settings } = useGameStore.getState();

    if (!settings?.sfxEnabled) return;

    const masterVolume = settings?.masterVolume ?? 0.8;
    const finalVolume  = Math.min(1, Math.max(0, volume * masterVolume));

    try {
      if (!_pool[soundId]) {
        _pool[soundId] = new Audio(`/sounds/${soundId}.mp3`);
      }
      const audio = _pool[soundId];
      audio.volume      = finalVolume;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // File not found or autoplay blocked — silent fallback during dev
        console.log(`Playing Audio: ${soundId}`);
      });
    } catch {
      console.log(`Playing Audio: ${soundId}`);
    }
  },
};

export default AudioManager;
