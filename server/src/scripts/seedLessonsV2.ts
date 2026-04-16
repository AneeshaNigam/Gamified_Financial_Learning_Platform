import mongoose from 'mongoose';
import { LessonV2Model } from '../models/LessonV2';
import { env } from '../config/env';

const lessons = [
  // ─────────────── Module 1: Foundations of Money ───────────────
  {
    order: 1,
    moduleId: 1,
    lessonId: '1',
    title: 'What is Money?',
    xpReward: 25,
    lucreReward: 20,
    source: 'seed',
    steps: [
      {
        type: 'info',
        emoji: '🪙',
        content: "Money is a medium of exchange — something agreed upon by a society to trade for goods and services. Without it, you'd have to barter: imagine swapping a haircut for groceries!",
        xp: 5,
      },
      {
        type: 'mcq',
        question: 'Which of these can money directly buy?',
        options: [
          { id: 'a', text: '🍕 Food' },
          { id: 'b', text: '😊 Happiness' },
          { id: 'c', text: '💪 Skills through practice alone' },
          { id: 'd', text: '🏠 A place to live (rent/buy)' },
        ],
        correctAnswer: 'a',
        explanation: "Money directly buys physical goods and services — food, shelter, transport. It can't directly buy intangibles like happiness or skills, though it can enable them (e.g., paying for a course).",
        xp: 10,
      },
      {
        type: 'info',
        emoji: '🏺',
        content: "Money has evolved through the ages: shells → metal coins → paper notes → plastic cards → digital payments. Each leap solved a problem with the previous form.",
        xp: 5,
      },
      {
        type: 'mcq',
        question: 'Why did humans move from barter to coins?',
        options: [
          { id: 'a', text: 'Coins are heavier, so they felt more valuable' },
          { id: 'b', text: 'Barter required both parties to want what the other had — coins solved this' },
          { id: 'c', text: 'Governments forced people to use coins' },
          { id: 'd', text: 'Coins are easier to eat' },
        ],
        correctAnswer: 'b',
        explanation: "Barter has a 'double coincidence of wants' problem — both parties must want what the other offers. Coins (and later money) solve this by being universally accepted.",
        xp: 10,
      },
      {
        type: 'info',
        emoji: '💡',
        content: "Three functions of money:\n• **Medium of exchange** — accepted in trade\n• **Store of value** — holds purchasing power over time\n• **Unit of account** — a common measure to price things",
        xp: 5,
      },
      {
        type: 'mcq',
        question: 'Inflation means that over time, the same amount of money buys…',
        options: [
          { id: 'a', text: 'More goods than before' },
          { id: 'b', text: 'Fewer goods than before' },
          { id: 'c', text: 'Exactly the same amount' },
          { id: 'd', text: 'Nothing at all' },
        ],
        correctAnswer: 'b',
        explanation: "Inflation erodes purchasing power — ₹100 today buys less than ₹100 ten years ago. This is why simply storing cash long-term isn't smart; investing helps your money keep pace.",
        xp: 10,
      },
    ],
  },

  // ─────────────── Module 1, Lesson 2: Needs vs Wants ───────────────
  {
    order: 2,
    moduleId: 1,
    lessonId: '2',
    title: 'Needs vs. Wants',
    xpReward: 25,
    lucreReward: 20,
    source: 'seed',
    steps: [
      {
        type: 'info',
        emoji: '🛒',
        content: "**Needs** are things essential for survival and basic wellbeing: food, water, shelter, clothing, healthcare. **Wants** are things that improve quality of life but aren't essential: streaming subs, new gadgets, dining out.",
        xp: 5,
      },
      {
        type: 'mcq',
        question: "Which of these is a NEED, not a want?",
        options: [
          { id: 'a', text: 'New gaming console' },
          { id: 'b', text: 'Basic nutritious meals' },
          { id: 'c', text: 'Premium streaming subscription' },
          { id: 'd', text: 'Designer sneakers' },
        ],
        correctAnswer: 'b',
        explanation: "Basic nutritious food is a fundamental need — your body requires it to function. The others are wants; they improve life but aren't survival essentials.",
        xp: 10,
      },
      {
        type: 'info',
        emoji: '📊',
        content: "The **50-30-20 rule** is a simple budgeting framework:\n• **50%** of income → Needs (rent, groceries, bills)\n• **30%** → Wants (entertainment, dining, hobbies)\n• **20%** → Savings & investing",
        xp: 5,
      },
      {
        type: 'mcq',
        question: "Priya earns ₹40,000/month. Using the 50-30-20 rule, how much should go to needs?",
        options: [
          { id: 'a', text: '₹8,000' },
          { id: 'b', text: '₹12,000' },
          { id: 'c', text: '₹20,000' },
          { id: 'd', text: '₹40,000' },
        ],
        correctAnswer: 'c',
        explanation: "50% of ₹40,000 = ₹20,000 for needs. The remaining ₹12,000 (30%) covers wants, and ₹8,000 (20%) is saved/invested.",
        xp: 10,
      },
      {
        type: 'mcq',
        question: "You have ₹500 left after your needs are covered. You want to buy a ₹1,200 game. What's the smartest move?",
        options: [
          { id: 'a', text: "Buy it on credit — you deserve it" },
          { id: 'b', text: "Save the ₹500, wait until you have ₹1,200" },
          { id: 'c', text: "Skip eating lunch for a week to afford it now" },
          { id: 'd', text: "Never buy things you want, only needs" },
        ],
        correctAnswer: 'b',
        explanation: "Saving until you can afford it keeps you out of debt and builds a healthy habit. Credit for non-essentials creates interest costs. And depriving yourself of meals is dangerous.",
        xp: 10,
      },
    ],
  },

  // ─────────────── Module 1, Lesson 3: Saving Basics ───────────────
  {
    order: 3,
    moduleId: 1,
    lessonId: '3',
    title: 'The Power of Saving',
    xpReward: 25,
    lucreReward: 20,
    source: 'seed',
    steps: [
      {
        type: 'info',
        emoji: '🏦',
        content: "Saving is setting aside money today for future use. Even saving a small percentage consistently — say 10% of every rupee you get — builds a meaningful safety net over time.",
        xp: 5,
      },
      {
        type: 'mcq',
        question: "Raj saves ₹500/month. After 1 year, how much has he saved (excluding interest)?",
        options: [
          { id: 'a', text: '₹500' },
          { id: 'b', text: '₹5,000' },
          { id: 'c', text: '₹6,000' },
          { id: 'd', text: '₹12,000' },
        ],
        correctAnswer: 'c',
        explanation: "₹500 × 12 months = ₹6,000. Small consistent amounts accumulate. The key is *consistency* — it doesn't matter how large the amount as long as you do it every month.",
        xp: 10,
      },
      {
        type: 'info',
        emoji: '📈',
        content: "**Compound interest** is interest earned on both your original amount AND the interest already earned. Einstein reportedly called it the 'eighth wonder of the world' — the longer you save, the faster it grows.",
        xp: 5,
      },
      {
        type: 'mcq',
        question: "₹10,000 in a bank at 6% annual interest. After 2 years (compounded), you have approximately…",
        options: [
          { id: 'a', text: '₹10,600' },
          { id: 'b', text: '₹11,200' },
          { id: 'c', text: '₹11,236' },
          { id: 'd', text: '₹12,000' },
        ],
        correctAnswer: 'c',
        explanation: "Year 1: ₹10,000 × 1.06 = ₹10,600. Year 2: ₹10,600 × 1.06 ≈ ₹11,236. Compound interest earns you extra over simple interest (which would be ₹11,200). The difference grows dramatically over longer periods.",
        xp: 10,
      },
      {
        type: 'mcq',
        question: "Which habit builds the most wealth over time?",
        options: [
          { id: 'a', text: "Save a large amount once, then stop" },
          { id: 'b', text: "Spend freely now and save more when you earn more" },
          { id: 'c', text: "Save a fixed % consistently every time you receive money" },
          { id: 'd', text: "Keep cash at home to avoid bank fees" },
        ],
        correctAnswer: 'c',
        explanation: "Consistent saving — even a small percentage — beats irregular large saves. Starting early + compound interest + consistency = wealth. Keeping cash at home also loses to inflation.",
        xp: 10,
      },
    ],
  },
];

export const seedLessonsV2 = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    await LessonV2Model.deleteMany({});
    console.log('🗑️  Cleared existing LessonV2 documents');

    await LessonV2Model.insertMany(lessons);
    console.log(`✅ Seeded ${lessons.length} lessons (LessonV2)`);

    await mongoose.connection.close();
    console.log('👋 Done');
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedLessonsV2();
}
