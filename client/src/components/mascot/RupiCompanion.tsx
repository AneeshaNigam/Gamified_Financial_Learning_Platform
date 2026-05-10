/** @format */

/**
 * RupiCompanion — Persistent floating mascot companion
 *
 * Appears in the bottom-right corner of all dashboard pages.
 * Shows Rupi with a speech bubble that auto-appears contextually.
 * Click Rupi to toggle the bubble, or it auto-hides after timeout.
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMascot } from '@/contexts/MascotContext';
import Rupi from './Rupi';
import { pageMessages } from './mascot-states';

const RupiCompanion = () => {
  const location = useLocation();
  const {
    mascotState,
    message,
    isVisible,
    isBubbleVisible,
    showMessage,
    hideMessage,
    playSound,
    triggerIdle,
    setMascotState,
  } = useMascot();

  const [manualToggle, setManualToggle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastPath = useRef(location.pathname);

  // Don't render on non-dashboard pages (landing, auth pages, lesson, quiz, battle arena)
  const hiddenPaths = ['/', '/signup', '/login', '/forgot-password', '/verify-otp', '/oauth/callback'];
  const isLessonOrBattle = location.pathname.startsWith('/lesson/') || location.pathname.startsWith('/battle/arena');
  // Show on lesson/quiz pages with a different position class to not overlap the legacy Coinsworth
  // Actually, we'll handle lesson/quiz in the page files themselves
  if (hiddenPaths.includes(location.pathname) || isLessonOrBattle) return null;
  if (!isVisible) return null;

  // Page-change greeting
  useEffect(() => {
    if (location.pathname !== lastPath.current) {
      lastPath.current = location.pathname;
      const pageMsg = pageMessages[location.pathname];
      if (pageMsg) {
        playSound('navigate');
        setTimeout(() => {
          showMessage(pageMsg.text, pageMsg.state, 4000);
        }, 500);
      }
    }
  }, [location.pathname, showMessage, playSound]);

  // Idle auto-message (after 45 seconds of no interaction)
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (!isBubbleVisible) {
        triggerIdle();
      }
    }, 45000);
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [isBubbleVisible, triggerIdle, location.pathname]);

  const handleRupiClick = () => {
    if (isBubbleVisible) {
      hideMessage();
      setManualToggle(false);
    } else {
      setManualToggle(true);
      playSound('mascot_pop');
      const pageMsg = pageMessages[location.pathname];
      if (pageMsg) {
        showMessage(pageMsg.text, pageMsg.state, 6000);
      } else {
        showMessage("Hey there! Need any help? 👋", 'waving', 4000);
      }
    }
  };

  const handleDismiss = () => {
    hideMessage();
    setManualToggle(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 rupi-companion-enter" id="rupi-companion">
      {/* Speech bubble */}
      {isBubbleVisible && message && (
        <div className="rupi-speech-bubble animate-scale-in" style={{ maxWidth: 260 }}>
          <button
            className="absolute top-1 right-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleDismiss}
            aria-label="Dismiss Rupi message"
          >
            ✕
          </button>
          <p className="pr-4 text-sm font-medium leading-relaxed">{message}</p>
        </div>
      )}

      {/* Rupi character */}
      <div className="relative group">
        <Rupi
          state={mascotState}
          size="lg"
          onClick={handleRupiClick}
          animate
          className="hover:scale-110 transition-transform duration-300 drop-shadow-lg cursor-pointer"
        />
        {/* Interaction hint on hover */}
        {!isBubbleVisible && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse-soft opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RupiCompanion;
