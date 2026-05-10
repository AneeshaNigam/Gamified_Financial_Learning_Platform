/** @format */

/**
 * CelebrationOverlay — Full-screen celebration modal
 *
 * Displays for major milestones: level up, achievement, lesson complete,
 * battle win, streak. Shows Rupi celebrating with particles and auto-dismiss.
 */

import { useEffect, useState } from 'react';
import { useMascot } from '@/contexts/MascotContext';
import Rupi from './Rupi';

const celebrationConfig = {
  xp: {
    title: 'XP Earned!',
    subtitle: 'Your knowledge is growing! 📈',
    emoji: '✨',
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  level_up: {
    title: 'LEVEL UP!',
    subtitle: "You're getting stronger every day! 🚀",
    emoji: '🎉',
    color: 'from-yellow-500/20 to-orange-500/20',
  },
  achievement: {
    title: 'Achievement Unlocked!',
    subtitle: 'Another badge for your collection! 🏅',
    emoji: '🏆',
    color: 'from-purple-500/20 to-pink-500/20',
  },
  lesson_complete: {
    title: 'Lesson Complete!',
    subtitle: 'One step closer to financial mastery! 🎓',
    emoji: '📚',
    color: 'from-green-500/20 to-emerald-500/20',
  },
  battle_win: {
    title: 'Victory!',
    subtitle: 'You dominated that battle! ⚔️',
    emoji: '🏆',
    color: 'from-yellow-500/20 to-amber-500/20',
  },
  streak: {
    title: 'Streak Milestone!',
    subtitle: "You're on fire! Keep it going! 🔥",
    emoji: '🔥',
    color: 'from-orange-500/20 to-red-500/20',
  },
};

const CelebrationOverlay = () => {
  const { celebrationType, dismissCelebration } = useMascot();
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number; emoji: string }>>([]);

  useEffect(() => {
    if (celebrationType) {
      // Generate celebration particles
      const emojis = ['✨', '🌟', '⭐', '💫', '🎉', '🎊', '💰', '🪙'];
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      }));
      setParticles(newParticles);

      // Auto-dismiss after 3.5 seconds
      const timer = setTimeout(dismissCelebration, 3500);
      return () => clearTimeout(timer);
    }
  }, [celebrationType, dismissCelebration]);

  if (!celebrationType) return null;

  const config = celebrationConfig[celebrationType];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={dismissCelebration}
      role="dialog"
      aria-label={config.title}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.color} backdrop-blur-md animate-fade-in`} />

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute text-2xl pointer-events-none celebration-particle"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 text-center space-y-6 animate-bounce-in px-4">
        {/* Big emoji */}
        <div className="text-7xl md:text-8xl animate-float">{config.emoji}</div>

        {/* Rupi celebrating */}
        <div className="flex justify-center">
          <Rupi state="celebrating" size="xl" animate />
        </div>

        {/* Text */}
        <div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-2 drop-shadow-lg">
            {config.title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            {config.subtitle}
          </p>
        </div>

        {/* Tap to dismiss hint */}
        <p className="text-sm text-muted-foreground animate-pulse-soft">
          Tap anywhere to continue
        </p>
      </div>
    </div>
  );
};

export default CelebrationOverlay;
