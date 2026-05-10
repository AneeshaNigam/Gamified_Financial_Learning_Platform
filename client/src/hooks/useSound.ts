/** @format */

import { useCallback } from 'react';
import { soundEngine, type SoundName } from '@/lib/sounds';

/**
 * useSound — Hook for playing sound effects
 *
 * Usage:
 *   const { play } = useSound();
 *   play('correct');   // plays correct chime
 *   play('xp_gain');   // plays XP arpeggio
 */
export function useSound() {
  const play = useCallback((name: SoundName) => {
    soundEngine.play(name);
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    soundEngine.setEnabled(on);
  }, []);

  const setVolume = useCallback((v: number) => {
    soundEngine.setVolume(v);
  }, []);

  return {
    play,
    setEnabled,
    setVolume,
    get enabled() { return soundEngine.enabled; },
    get volume() { return soundEngine.volume; },
  };
}
