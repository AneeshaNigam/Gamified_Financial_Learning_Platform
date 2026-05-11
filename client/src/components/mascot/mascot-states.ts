/** @format */

/**
 * Mascot state definitions and contextual message banks for Rupi
 *
 * "Rupi" = a friendly piggy bank mascot for MoneyMaster
 */

export type MascotState =
  | 'idle'
  | 'happy'
  | 'celebrating'
  | 'thinking'
  | 'encouraging'
  | 'sad'
  | 'excited'
  | 'sleeping'
  | 'waving'
  | 'teaching'
  | 'shocked'
  | 'proud'
  | 'love';

export interface MascotMessage {
  text: string;
  state: MascotState;
}

// ── Contextual message banks ───────────────────────────────────────

export const greetingMessages: MascotMessage[] = [
  { text: "Hey there! Ready to grow your money brain? 🧠", state: 'waving' },
  { text: "Welcome back, champ! Let's learn something cool today! 🌟", state: 'happy' },
  { text: "Rupi missed you! Let's make today count! 💪", state: 'excited' },
  { text: "Another day, another chance to level up! 🚀", state: 'waving' },
];

export const streakMessages: Record<string, MascotMessage> = {
  '2': { text: "2 days in a row! You're building a habit! 🔥", state: 'happy' },
  '3': { text: "3-day streak! You're on fire! 🔥🔥", state: 'excited' },
  '5': { text: "5 DAYS! That's dedication right there! 🏆", state: 'celebrating' },
  '7': { text: "A WHOLE WEEK! You're unstoppable! 💎", state: 'celebrating' },
  '10': { text: "10 DAYS?! You're a legend in the making! 👑", state: 'celebrating' },
  '30': { text: "30 DAYS! You've mastered consistency! 🎓", state: 'proud' },
};

export const correctAnswerMessages: MascotMessage[] = [
  { text: "Nailed it! You're getting smarter! 🎯", state: 'happy' },
  { text: "Correct! Your money knowledge is growing! 📈", state: 'celebrating' },
  { text: "YES! That's the right answer! 🎉", state: 'excited' },
  { text: "Brilliant! Keep this up! ✨", state: 'happy' },
  { text: "Money genius alert! 🧠💰", state: 'proud' },
];

export const wrongAnswerMessages: MascotMessage[] = [
  { text: "Not quite — but hey, mistakes are how we learn! 💡", state: 'encouraging' },
  { text: "Almost there! Read the explanation carefully 📖", state: 'encouraging' },
  { text: "Don't worry! Even experts get things wrong sometimes 🤗", state: 'encouraging' },
  { text: "Let's learn from this one. You've got it next time! 💪", state: 'encouraging' },
];

export const streakComboMessages: MascotMessage[] = [
  { text: "3 in a row! You're on a roll! 🔥", state: 'excited' },
  { text: "4 streak! Can't stop, won't stop! 🔥🔥", state: 'excited' },
  { text: "5 STREAK! You're a machine! 🤖💰", state: 'celebrating' },
  { text: "UNSTOPPABLE COMBO! 🔥🔥🔥", state: 'celebrating' },
];

export const lessonCompleteMessages: MascotMessage[] = [
  { text: "Lesson done! You're one step closer to mastering money! 🎓", state: 'celebrating' },
  { text: "Amazing work! Your knowledge is compounding — just like interest! 📈", state: 'celebrating' },
  { text: "That's what I call smart learning! Onwards! 🚀", state: 'proud' },
];

export const battleMessages = {
  win: [
    { text: "VICTORY! You're a financial warrior! ⚔️🏆", state: 'celebrating' as const },
    { text: "Winner winner! Your knowledge pays off! 💰", state: 'celebrating' as const },
  ],
  lose: [
    { text: "Tough fight! But every loss teaches you something 💪", state: 'encouraging' as const },
    { text: "Don't give up! Champions are made from defeats 🌟", state: 'encouraging' as const },
  ],
  draw: [
    { text: "What a close match! Rematch? 🤝", state: 'thinking' as const },
  ],
};

export const idleMessages: MascotMessage[] = [
  { text: "Psst... want to learn something new? 📚", state: 'thinking' },
  { text: "Did you know? Compound interest is called the 8th wonder of the world! 🌍", state: 'teaching' },
  { text: "Saving ₹100/day = ₹36,500/year! Start small! 🐷", state: 'teaching' },
  { text: "I'm here whenever you need me! Just click! 👋", state: 'waving' },
  { text: "Fun fact: The word 'bank' comes from the Italian 'banco' (bench)! 🏦", state: 'teaching' },
];

export const achievementMessages: MascotMessage[] = [
  { text: "🏅 NEW ACHIEVEMENT UNLOCKED! You're amazing!", state: 'celebrating' },
  { text: "BADGE EARNED! Look at you go! 🎖️", state: 'proud' },
];

export const pageMessages: Record<string, MascotMessage> = {
  '/dashboard': { text: "Welcome to your command center! What shall we do today? 🎮", state: 'waving' },
  '/learning': { text: "Knowledge is the best investment! Let's learn! 📚", state: 'teaching' },
  '/wallet': { text: "Let's check how your money is doing! 💰", state: 'thinking' },
  '/achievements': { text: "Look at all your badges! So proud! 🏆", state: 'proud' },
  '/battles': { text: "Ready to test your skills against others? ⚔️", state: 'excited' },
  '/tools': { text: "Smart tools for smart decisions! Let's calculate! 🔢", state: 'teaching' },
  '/leaderboard': { text: "Let's see where you stand! Climb that ladder! 📊", state: 'excited' },
  '/settings': { text: "Adjusting things? I'll wait right here! ⚙️", state: 'idle' },
};

// ── Helpers ────────────────────────────────────────────────────────

export function getRandomMessage(messages: MascotMessage[]): MascotMessage {
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getStreakMessage(streak: number): MascotMessage | null {
  // Find the highest matching threshold
  const thresholds = [30, 10, 7, 5, 3, 2];
  for (const t of thresholds) {
    if (streak >= t && streakMessages[String(t)]) {
      return streakMessages[String(t)];
    }
  }
  return null;
}

export function getComboMessage(combo: number): MascotMessage | null {
  if (combo >= 6) return streakComboMessages[3]; // UNSTOPPABLE
  if (combo >= 5) return streakComboMessages[2];
  if (combo >= 4) return streakComboMessages[1];
  if (combo >= 3) return streakComboMessages[0];
  return null;
}
