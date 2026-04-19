/** @format */

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook that manages a countdown timer synced with server updates.
 * Used for the question timer in battles.
 */
export function useBattleTimer(
  initialTime: number,
  isActive: boolean,
  onTimeout?: () => void
) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRef = useRef(onTimeout);

  callbackRef.current = onTimeout;

  // Reset when initial time changes (new question)
  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  // Countdown
  useEffect(() => {
    if (!isActive || timeRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeRemaining <= 0 && isActive) {
        callbackRef.current?.();
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          callbackRef.current?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, timeRemaining]);

  // Sync with server time
  const syncTime = useCallback((serverRemaining: number) => {
    setTimeRemaining(serverRemaining);
  }, []);

  const progress = initialTime > 0 ? (timeRemaining / initialTime) * 100 : 0;
  const isWarning = timeRemaining <= 5;
  const isCritical = timeRemaining <= 3;

  return {
    timeRemaining,
    progress,
    isWarning,
    isCritical,
    syncTime,
  };
}
