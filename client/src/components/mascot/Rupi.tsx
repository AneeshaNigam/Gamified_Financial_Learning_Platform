/** @format */

/**
 * Rupi — The MoneyMaster Piggy Bank Mascot
 *
 * A cute, expressive SVG piggy bank character with multiple emotion states.
 * All rendering is inline SVG — no external assets needed.
 */

import { type MascotState } from './mascot-states';

interface RupiProps {
  state?: MascotState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

const sizes = { sm: 48, md: 72, lg: 96, xl: 140 };

// Eye shapes per emotion
const eyeConfigs: Record<MascotState, { left: string; right: string; pupilScale?: number }> = {
  idle:        { left: 'M30,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0', right: 'M54,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0' },
  happy:       { left: 'M30,36 Q34,30 38,36', right: 'M54,36 Q58,30 62,36' },
  celebrating: { left: 'M30,36 Q34,28 38,36', right: 'M54,36 Q58,28 62,36' },
  thinking:    { left: 'M30,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0', right: 'M55,32 a3,4 0 1,0 6,0 a3,4 0 1,0 -6,0' },
  encouraging: { left: 'M30,36 Q34,30 38,36', right: 'M54,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0', pupilScale: 1.2 },
  sad:         { left: 'M30,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0', right: 'M54,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0', pupilScale: 1.3 },
  excited:     { left: 'M29,33 a5,6 0 1,0 10,0 a5,6 0 1,0 -10,0', right: 'M53,33 a5,6 0 1,0 10,0 a5,6 0 1,0 -10,0', pupilScale: 0.8 },
  sleeping:    { left: 'M30,36 L38,36', right: 'M54,36 L62,36' },
  waving:      { left: 'M30,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0', right: 'M54,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0' },
  teaching:    { left: 'M30,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0', right: 'M54,34 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0' },
  shocked:     { left: 'M28,32 a6,7 0 1,0 12,0 a6,7 0 1,0 -12,0', right: 'M52,32 a6,7 0 1,0 12,0 a6,7 0 1,0 -12,0', pupilScale: 0.6 },
  proud:       { left: 'M30,36 Q34,30 38,36', right: 'M54,36 Q58,30 62,36' },
  love:        { left: 'M30,34 L34,30 L38,34 L34,38 Z', right: 'M54,34 L58,30 L62,34 L58,38 Z' },
};

// Mouth shapes per emotion
const mouthConfigs: Record<MascotState, string> = {
  idle:        'M38,46 Q46,52 54,46',         // small smile
  happy:       'M36,44 Q46,56 56,44',         // big smile
  celebrating: 'M36,44 Q46,58 56,44',         // huge grin
  thinking:    'M40,48 Q46,46 52,48',         // neutral/slightly pursed
  encouraging: 'M37,45 Q46,54 55,45',         // warm smile
  sad:         'M38,50 Q46,44 54,50',         // frown
  excited:     'M34,44 Q46,58 58,44',         // open mouth grin
  sleeping:    'M40,48 Q46,50 52,48',         // tiny line
  waving:      'M37,45 Q46,54 55,45',         // friendly smile
  teaching:    'M38,46 Q46,52 54,46',         // calm smile
  shocked:     'M42,46 a4,5 0 1,0 8,0 a4,5 0 1,0 -8,0', // O mouth
  proud:       'M36,44 Q46,56 56,44',         // proud grin
  love:        'M37,45 Q46,54 55,45',         // sweet smile
};

// Animation class per state
const animClasses: Record<MascotState, string> = {
  idle:        'rupi-float',
  happy:       'rupi-bounce',
  celebrating: 'rupi-celebrate',
  thinking:    'rupi-think',
  encouraging: 'rupi-nod',
  sad:         'rupi-droop',
  excited:     'rupi-jump',
  sleeping:    'rupi-sleep',
  waving:      'rupi-wave',
  teaching:    'rupi-float',
  shocked:     'rupi-shake',
  proud:       'rupi-proud',
  love:        'rupi-bounce',
};

const Rupi = ({ state = 'idle', size = 'md', className = '', animate = true, onClick }: RupiProps) => {
  const s = sizes[size];
  const eyes = eyeConfigs[state];
  const mouth = mouthConfigs[state];
  const animClass = animate ? animClasses[state] : '';

  // Blush visibility
  const showBlush = ['happy', 'celebrating', 'excited', 'love', 'proud', 'encouraging'].includes(state);
  // Sparkle eyes
  const showSparkle = ['celebrating', 'excited', 'love'].includes(state);
  // ZZZ for sleeping
  const showZzz = state === 'sleeping';
  // Sweat drop for shocked
  const showSweat = state === 'shocked';
  // Teaching pointer
  const showPointer = state === 'teaching';
  // Wave hand
  const showWave = state === 'waving';
  // Thinking bubble
  const showThinkBubble = state === 'thinking';

  return (
    <div
      className={`inline-flex items-center justify-center ${animClass} ${className}`}
      style={{ width: s, height: s, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={`Rupi the piggy bank is ${state}`}
    >
      <svg viewBox="0 0 92 92" width={s} height={s} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Body gradient */}
          <linearGradient id={`rupi-body-${state}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB6C1" />
            <stop offset="50%" stopColor="#FF91A4" />
            <stop offset="100%" stopColor="#FF6B8A" />
          </linearGradient>
          {/* Shine gradient */}
          <radialGradient id="rupi-shine" cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          {/* Ear gradient */}
          <linearGradient id="rupi-ear" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8FAA" />
            <stop offset="100%" stopColor="#E5687D" />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="46" cy="84" rx="22" ry="4" fill="rgba(0,0,0,0.1)" className="rupi-shadow" />

        {/* Legs */}
        <ellipse cx="34" cy="72" rx="6" ry="7" fill="#FF8FAA" stroke="#E5687D" strokeWidth="1.5" />
        <ellipse cx="58" cy="72" rx="6" ry="7" fill="#FF8FAA" stroke="#E5687D" strokeWidth="1.5" />
        {/* Hooves */}
        <ellipse cx="34" cy="76" rx="5" ry="3" fill="#E5687D" />
        <ellipse cx="58" cy="76" rx="5" ry="3" fill="#E5687D" />

        {/* Body */}
        <ellipse cx="46" cy="50" rx="28" ry="24" fill={`url(#rupi-body-${state})`} stroke="#E5687D" strokeWidth="2" />
        {/* Body shine */}
        <ellipse cx="46" cy="50" rx="28" ry="24" fill="url(#rupi-shine)" />

        {/* Belly - coin slot */}
        <rect x="40" y="56" width="12" height="3" rx="1.5" fill="#E5687D" opacity="0.6" />

        {/* ₹ Symbol on belly */}
        <text x="46" y="54" textAnchor="middle" fill="#E5687D" fontSize="10" fontWeight="bold" fontFamily="sans-serif" opacity="0.4">₹</text>

        {/* Ears */}
        <path d="M24,30 Q20,18 30,22 Q26,26 28,32" fill="url(#rupi-ear)" stroke="#E5687D" strokeWidth="1.5" />
        <path d="M68,30 Q72,18 62,22 Q66,26 64,32" fill="url(#rupi-ear)" stroke="#E5687D" strokeWidth="1.5" />
        {/* Inner ears */}
        <path d="M26,28 Q24,22 30,24" fill="#FFB6C1" opacity="0.6" />
        <path d="M66,28 Q68,22 62,24" fill="#FFB6C1" opacity="0.6" />

        {/* Snout */}
        <ellipse cx="46" cy="42" rx="10" ry="7" fill="#FFD1DC" stroke="#E5687D" strokeWidth="1.5" />
        {/* Nostrils */}
        <ellipse cx="42" cy="42" rx="2" ry="1.5" fill="#E5687D" opacity="0.6" />
        <ellipse cx="50" cy="42" rx="2" ry="1.5" fill="#E5687D" opacity="0.6" />

        {/* Eyes */}
        <g className="rupi-eyes">
          {/* Eye whites */}
          <path d={eyes.left} fill="white" stroke="#333" strokeWidth="1.5" />
          <path d={eyes.right} fill="white" stroke="#333" strokeWidth="1.5" />
          {/* Pupils (for open eyes only) */}
          {!['happy', 'celebrating', 'sleeping', 'proud'].includes(state) && state !== 'love' && (
            <>
              <circle cx="34" cy="35" r={2.5 * (eyes.pupilScale || 1)} fill="#333" />
              <circle cx="58" cy="35" r={2.5 * (eyes.pupilScale || 1)} fill="#333" />
              {/* Eye shine */}
              <circle cx="35.5" cy="33.5" r="1" fill="white" />
              <circle cx="59.5" cy="33.5" r="1" fill="white" />
            </>
          )}
          {/* Love eyes (hearts) */}
          {state === 'love' && (
            <>
              <path d={eyes.left} fill="#FF4466" />
              <path d={eyes.right} fill="#FF4466" />
            </>
          )}
        </g>

        {/* Eyebrows */}
        {state === 'sad' && (
          <>
            <line x1="28" y1="28" x2="38" y2="30" stroke="#333" strokeWidth="2" strokeLinecap="round" />
            <line x1="54" y1="30" x2="64" y2="28" stroke="#333" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {state === 'thinking' && (
          <>
            <line x1="29" y1="28" x2="38" y2="27" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="54" y1="26" x2="63" y2="28" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}

        {/* Mouth */}
        <path d={mouth} stroke="#E5687D" strokeWidth="2" fill={state === 'shocked' || state === 'excited' ? '#FFD1DC' : 'none'} strokeLinecap="round" />

        {/* Blush spots */}
        {showBlush && (
          <>
            <circle cx="24" cy="42" r="4" fill="#FF6B8A" opacity="0.3" />
            <circle cx="68" cy="42" r="4" fill="#FF6B8A" opacity="0.3" />
          </>
        )}

        {/* Sparkle effects */}
        {showSparkle && (
          <>
            <g className="rupi-sparkle-1">
              <path d="M14,22 L16,18 L18,22 L14,22 M16,16 L16,24 M12,20 L20,20" stroke="#FFD700" strokeWidth="1.5" fill="none" />
            </g>
            <g className="rupi-sparkle-2">
              <path d="M72,20 L74,16 L76,20 L72,20 M74,14 L74,22 M70,18 L78,18" stroke="#FFD700" strokeWidth="1.5" fill="none" />
            </g>
          </>
        )}

        {/* ZZZ for sleeping */}
        {showZzz && (
          <g className="rupi-zzz">
            <text x="66" y="24" fill="#7C8DB5" fontSize="10" fontWeight="bold" fontFamily="sans-serif" opacity="0.7">z</text>
            <text x="72" y="18" fill="#7C8DB5" fontSize="8" fontWeight="bold" fontFamily="sans-serif" opacity="0.5">z</text>
            <text x="76" y="13" fill="#7C8DB5" fontSize="6" fontWeight="bold" fontFamily="sans-serif" opacity="0.3">z</text>
          </g>
        )}

        {/* Sweat drop for shocked */}
        {showSweat && (
          <path d="M72,28 Q74,24 76,28 Q74,32 72,28" fill="#87CEEB" className="rupi-sweat" />
        )}

        {/* Teaching pointer */}
        {showPointer && (
          <g className="rupi-pointer">
            <line x1="76" y1="38" x2="84" y2="28" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
            <circle cx="84" cy="26" r="2" fill="#CD853F" />
          </g>
        )}

        {/* Waving hand */}
        {showWave && (
          <g className="rupi-hand-wave">
            <ellipse cx="78" cy="40" rx="5" ry="6" fill="#FF91A4" stroke="#E5687D" strokeWidth="1.5" />
          </g>
        )}

        {/* Thinking bubbles */}
        {showThinkBubble && (
          <>
            <circle cx="74" cy="26" r="2" fill="#DDD" opacity="0.6" />
            <circle cx="78" cy="20" r="3" fill="#DDD" opacity="0.5" />
            <circle cx="82" cy="13" r="4" fill="#DDD" opacity="0.4" />
          </>
        )}

        {/* Tail */}
        <path d="M74,52 Q82,48 80,56 Q78,52 76,55" stroke="#E5687D" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export default Rupi;
