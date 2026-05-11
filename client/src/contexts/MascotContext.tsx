/** @format */

/**
 * MascotContext — Global state for Rupi mascot + sound effects
 *
 * Provides centralized mascot emotion, messages, sound playback,
 * and celebration triggers accessible from any page component.
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { soundEngine, type SoundName } from '@/lib/sounds';
import {
  type MascotState,
  type MascotMessage,
  getRandomMessage,
  greetingMessages,
  correctAnswerMessages,
  wrongAnswerMessages,
  lessonCompleteMessages,
  achievementMessages,
  idleMessages,
  getComboMessage,
  getStreakMessage,
} from '@/components/mascot/mascot-states';

// ── Types ──────────────────────────────────────────────────────────

type CelebrationType = 'xp' | 'level_up' | 'achievement' | 'lesson_complete' | 'battle_win' | 'streak';

interface MascotContextValue {
  // State
  mascotState: MascotState;
  message: string | null;
  isVisible: boolean;
  isBubbleVisible: boolean;
  isSoundEnabled: boolean;
  isMascotEnabled: boolean;
  soundVolume: number;
  celebrationType: CelebrationType | null;

  // Actions
  setMascotState: (state: MascotState) => void;
  showMessage: (msg: string, state?: MascotState, durationMs?: number) => void;
  hideMessage: () => void;
  triggerCorrect: () => void;
  triggerWrong: () => void;
  triggerCombo: (combo: number) => void;
  triggerStreak: (streak: number) => void;
  triggerLessonComplete: () => void;
  triggerAchievement: () => void;
  triggerBattleWin: () => void;
  triggerBattleLose: () => void;
  triggerXpGain: (amount?: number) => void;
  triggerLevelUp: () => void;
  triggerGreeting: () => void;
  triggerIdle: () => void;
  celebrate: (type: CelebrationType) => void;
  dismissCelebration: () => void;
  playSound: (name: SoundName) => void;

  // Settings
  toggleSound: () => void;
  toggleMascot: () => void;
  setVolume: (v: number) => void;
}

const MascotContext = createContext<MascotContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────

export function MascotProvider({ children }: { children: ReactNode }) {
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [celebrationType, setCelebrationType] = useState<CelebrationType | null>(null);

  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('moneymaster-sound');
    return saved === null ? true : saved === 'true';
  });

  const [isMascotEnabled, setIsMascotEnabled] = useState(() => {
    const saved = localStorage.getItem('moneymaster-mascot');
    return saved === null ? true : saved === 'true';
  });

  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem('moneymaster-sound-volume');
    return saved === null ? 0.5 : parseFloat(saved);
  });

  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>();
  const stateTimer = useRef<ReturnType<typeof setTimeout>>();

  // Sound
  const playSound = useCallback((name: SoundName) => {
    if (isSoundEnabled) soundEngine.play(name);
  }, [isSoundEnabled]);

  // Show message with auto-dismiss
  const showMessage = useCallback((msg: string, state?: MascotState, durationMs = 4000) => {
    if (state) setMascotState(state);
    setMessage(msg);
    setIsBubbleVisible(true);

    if (isSoundEnabled) {
      soundEngine.speak(msg);
    }

    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => {
      setIsBubbleVisible(false);
      setMessage(null);
    }, durationMs);

    // Reset mascot state after message
    if (stateTimer.current) clearTimeout(stateTimer.current);
    stateTimer.current = setTimeout(() => {
      setMascotState('idle');
    }, durationMs + 500);
  }, []);

  const hideMessage = useCallback(() => {
    setIsBubbleVisible(false);
    setMessage(null);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // ── Trigger helpers ──────────────────────────────────────────────

  const triggerCorrect = useCallback(() => {
    const m = getRandomMessage(correctAnswerMessages);
    playSound('correct');
    showMessage(m.text, m.state, 3000);
  }, [playSound, showMessage]);

  const triggerWrong = useCallback(() => {
    const m = getRandomMessage(wrongAnswerMessages);
    playSound('wrong');
    showMessage(m.text, m.state, 4000);
  }, [playSound, showMessage]);

  const triggerCombo = useCallback((combo: number) => {
    const m = getComboMessage(combo);
    if (m) {
      playSound('combo');
      showMessage(m.text, m.state, 3000);
    }
  }, [playSound, showMessage]);

  const triggerStreak = useCallback((streak: number) => {
    const m = getStreakMessage(streak);
    if (m) {
      playSound('streak_fire');
      showMessage(m.text, m.state, 4000);
    }
  }, [playSound, showMessage]);

  const triggerLessonComplete = useCallback(() => {
    const m = getRandomMessage(lessonCompleteMessages);
    playSound('lesson_complete');
    showMessage(m.text, m.state, 5000);
    setCelebrationType('lesson_complete');
  }, [playSound, showMessage]);

  const triggerAchievement = useCallback(() => {
    const m = getRandomMessage(achievementMessages);
    playSound('achievement');
    showMessage(m.text, m.state, 5000);
    setCelebrationType('achievement');
  }, [playSound, showMessage]);

  const triggerBattleWin = useCallback(() => {
    playSound('battle_win');
    showMessage("VICTORY! You're a financial warrior! ⚔️🏆", 'celebrating', 5000);
    setCelebrationType('battle_win');
  }, [playSound, showMessage]);

  const triggerBattleLose = useCallback(() => {
    playSound('battle_lose');
    showMessage("Tough fight! Every loss teaches you something 💪", 'encouraging', 4000);
  }, [playSound, showMessage]);

  const triggerXpGain = useCallback((_amount?: number) => {
    playSound('xp_gain');
    setMascotState('happy');
    if (stateTimer.current) clearTimeout(stateTimer.current);
    stateTimer.current = setTimeout(() => setMascotState('idle'), 2000);
  }, [playSound]);

  const triggerLevelUp = useCallback(() => {
    playSound('level_up');
    showMessage("LEVEL UP! You're getting stronger! 🎉🚀", 'celebrating', 5000);
    setCelebrationType('level_up');
  }, [playSound, showMessage]);

  const triggerGreeting = useCallback(() => {
    const m = getRandomMessage(greetingMessages);
    playSound('mascot_pop');
    showMessage(m.text, m.state, 5000);
  }, [playSound, showMessage]);

  const triggerIdle = useCallback(() => {
    const m = getRandomMessage(idleMessages);
    playSound('mascot_pop');
    showMessage(m.text, m.state, 6000);
  }, [playSound, showMessage]);

  const celebrate = useCallback((type: CelebrationType) => {
    setCelebrationType(type);
    playSound('celebrate');
  }, [playSound]);

  const dismissCelebration = useCallback(() => {
    setCelebrationType(null);
  }, []);

  // ── Settings ─────────────────────────────────────────────────────

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => {
      const next = !prev;
      soundEngine.setEnabled(next);
      localStorage.setItem('moneymaster-sound', String(next));
      if (next) soundEngine.play('click'); // preview
      return next;
    });
  }, []);

  const toggleMascot = useCallback(() => {
    setIsMascotEnabled(prev => {
      const next = !prev;
      localStorage.setItem('moneymaster-mascot', String(next));
      return next;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    setSoundVolume(v);
    soundEngine.setVolume(v);
    localStorage.setItem('moneymaster-sound-volume', String(v));
  }, []);

  // ── Value ────────────────────────────────────────────────────────

  const value: MascotContextValue = {
    mascotState,
    message,
    isVisible: isMascotEnabled,
    isBubbleVisible,
    isSoundEnabled,
    isMascotEnabled,
    soundVolume,
    celebrationType,
    setMascotState,
    showMessage,
    hideMessage,
    triggerCorrect,
    triggerWrong,
    triggerCombo,
    triggerStreak,
    triggerLessonComplete,
    triggerAchievement,
    triggerBattleWin,
    triggerBattleLose,
    triggerXpGain,
    triggerLevelUp,
    triggerGreeting,
    triggerIdle,
    celebrate,
    dismissCelebration,
    playSound,
    toggleSound,
    toggleMascot,
    setVolume,
  };

  return (
    <MascotContext.Provider value={value}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  const ctx = useContext(MascotContext);
  if (!ctx) throw new Error('useMascot must be used within MascotProvider');
  return ctx;
}
