import mongoose from 'mongoose';
import { config as loadEnv } from 'dotenv';
import { QuestionBankModel } from '../models/QuestionBank';

loadEnv();

const QUESTIONS = [
  /* ── Money Basics (easy) ── */
  {
    questionText: 'What is the primary purpose of money?',
    options: [
      { id: 'a', text: 'To decorate your wallet' },
      { id: 'b', text: 'To exchange for goods and services' },
      { id: 'c', text: 'To collect for fun' },
      { id: 'd', text: 'To make paper airplanes' },
    ],
    correctAnswer: 'b',
    explanation: 'Money serves as a medium of exchange, allowing people to trade goods and services efficiently.',
    topic: 'money basics',
    difficulty: 'easy' as const,
    tags: ['money', 'fundamentals'],
    source: 'seed' as const,
  },
  {
    questionText: 'Which of these is NOT a form of money?',
    options: [
      { id: 'a', text: 'Coins' },
      { id: 'b', text: 'Banknotes' },
      { id: 'c', text: 'Leaves from a tree' },
      { id: 'd', text: 'Digital currency' },
    ],
    correctAnswer: 'c',
    explanation: 'Money includes coins, banknotes, and digital forms. Tree leaves are not recognized as currency.',
    topic: 'money basics',
    difficulty: 'easy' as const,
    tags: ['money', 'currency'],
    source: 'seed' as const,
  },
  {
    questionText: 'What happens when you deposit money in a bank?',
    options: [
      { id: 'a', text: 'The bank throws it away' },
      { id: 'b', text: 'The bank keeps it safe and may pay you interest' },
      { id: 'c', text: 'You lose your money forever' },
      { id: 'd', text: 'The money disappears' },
    ],
    correctAnswer: 'b',
    explanation: 'Banks safeguard your deposits and often pay interest, meaning your money can grow over time.',
    topic: 'money basics',
    difficulty: 'easy' as const,
    tags: ['banking', 'savings', 'interest'],
    source: 'seed' as const,
  },
  {
    questionText: 'If you earn ₹500 and spend ₹200, how much do you save?',
    options: [
      { id: 'a', text: '₹700' },
      { id: 'b', text: '₹200' },
      { id: 'c', text: '₹300' },
      { id: 'd', text: '₹500' },
    ],
    correctAnswer: 'c',
    explanation: 'Savings = Income - Expenses. ₹500 - ₹200 = ₹300.',
    topic: 'money basics',
    difficulty: 'easy' as const,
    tags: ['savings', 'math'],
    source: 'seed' as const,
  },

  /* ── Budgeting (easy/medium) ── */
  {
    questionText: 'What is a budget?',
    options: [
      { id: 'a', text: 'A type of bank account' },
      { id: 'b', text: 'A plan for how to spend and save money' },
      { id: 'c', text: 'A receipt from a store' },
      { id: 'd', text: 'A loan from a bank' },
    ],
    correctAnswer: 'b',
    explanation: 'A budget is a financial plan that outlines expected income and expenses over a period.',
    topic: 'budgeting',
    difficulty: 'easy' as const,
    tags: ['budgeting', 'planning'],
    source: 'seed' as const,
  },
  {
    questionText: 'Which budgeting rule suggests 50% needs, 30% wants, 20% savings?',
    options: [
      { id: 'a', text: 'The 80/20 Rule' },
      { id: 'b', text: 'The 50/30/20 Rule' },
      { id: 'c', text: 'The 70/30 Rule' },
      { id: 'd', text: 'The 60/40 Rule' },
    ],
    correctAnswer: 'b',
    explanation: 'The 50/30/20 rule suggests allocating 50% of income to needs, 30% to wants, and 20% to savings.',
    topic: 'budgeting',
    difficulty: 'medium' as const,
    tags: ['budgeting', '50-30-20'],
    source: 'seed' as const,
  },
  {
    questionText: 'Which of these is a "need" rather than a "want"?',
    options: [
      { id: 'a', text: 'A new video game' },
      { id: 'b', text: 'Food for the week' },
      { id: 'c', text: 'Designer shoes' },
      { id: 'd', text: 'Movie tickets' },
    ],
    correctAnswer: 'b',
    explanation: 'Needs are essentials for survival (food, shelter, clothing). Wants are things we desire but can live without.',
    topic: 'budgeting',
    difficulty: 'easy' as const,
    tags: ['budgeting', 'needs-vs-wants'],
    source: 'seed' as const,
  },
  {
    questionText: 'If your monthly income is ₹20,000 and you follow the 50/30/20 rule, how much should you save?',
    options: [
      { id: 'a', text: '₹2,000' },
      { id: 'b', text: '₹4,000' },
      { id: 'c', text: '₹6,000' },
      { id: 'd', text: '₹10,000' },
    ],
    correctAnswer: 'b',
    explanation: '20% of ₹20,000 = ₹4,000 should be saved each month according to the 50/30/20 rule.',
    topic: 'budgeting',
    difficulty: 'medium' as const,
    tags: ['budgeting', 'math', 'savings'],
    source: 'seed' as const,
  },

  /* ── Savings (easy/medium) ── */
  {
    questionText: 'What is compound interest?',
    options: [
      { id: 'a', text: 'Interest earned only on the original amount' },
      { id: 'b', text: 'Interest earned on both the original amount and accumulated interest' },
      { id: 'c', text: 'A penalty for withdrawing money' },
      { id: 'd', text: 'A type of loan' },
    ],
    correctAnswer: 'b',
    explanation: 'Compound interest is "interest on interest" — it\'s calculated on the principal plus any previously earned interest.',
    topic: 'savings',
    difficulty: 'medium' as const,
    tags: ['savings', 'compound-interest'],
    source: 'seed' as const,
  },
  {
    questionText: 'Why is an emergency fund important?',
    options: [
      { id: 'a', text: 'To buy luxury items' },
      { id: 'b', text: 'To cover unexpected expenses without going into debt' },
      { id: 'c', text: 'To impress your friends' },
      { id: 'd', text: 'It\'s not important at all' },
    ],
    correctAnswer: 'b',
    explanation: 'An emergency fund provides a financial safety net for unexpected expenses like medical bills or car repairs.',
    topic: 'savings',
    difficulty: 'easy' as const,
    tags: ['savings', 'emergency-fund'],
    source: 'seed' as const,
  },
  {
    questionText: 'If you save ₹100 per month with 10% annual interest, approximately how much will you have after 1 year?',
    options: [
      { id: 'a', text: '₹1,100' },
      { id: 'b', text: '₹1,200' },
      { id: 'c', text: '₹1,266' },
      { id: 'd', text: '₹1,320' },
    ],
    correctAnswer: 'c',
    explanation: 'With monthly contributions and compound interest, you\'d have approximately ₹1,266 (principal ₹1,200 + ~₹66 interest).',
    topic: 'savings',
    difficulty: 'hard' as const,
    tags: ['savings', 'compound-interest', 'math'],
    source: 'seed' as const,
  },

  /* ── Investing (medium/hard) ── */
  {
    questionText: 'What is a stock?',
    options: [
      { id: 'a', text: 'A type of soup' },
      { id: 'b', text: 'A share of ownership in a company' },
      { id: 'c', text: 'A government bond' },
      { id: 'd', text: 'A savings account' },
    ],
    correctAnswer: 'b',
    explanation: 'A stock represents partial ownership (equity) in a company. Stockholders can benefit from the company\'s growth.',
    topic: 'investing',
    difficulty: 'easy' as const,
    tags: ['investing', 'stocks'],
    source: 'seed' as const,
  },
  {
    questionText: 'What does "diversification" mean in investing?',
    options: [
      { id: 'a', text: 'Putting all money in one stock' },
      { id: 'b', text: 'Spreading investments across different assets to reduce risk' },
      { id: 'c', text: 'Selling all your investments' },
      { id: 'd', text: 'Only investing in gold' },
    ],
    correctAnswer: 'b',
    explanation: 'Diversification means spreading your investments across different asset types to minimize risk — "don\'t put all your eggs in one basket."',
    topic: 'investing',
    difficulty: 'medium' as const,
    tags: ['investing', 'diversification', 'risk'],
    source: 'seed' as const,
  },
  {
    questionText: 'What is the relationship between risk and return in investing?',
    options: [
      { id: 'a', text: 'Higher risk usually means lower potential returns' },
      { id: 'b', text: 'Higher risk usually means higher potential returns' },
      { id: 'c', text: 'Risk and return are not related' },
      { id: 'd', text: 'Lower risk always guarantees higher returns' },
    ],
    correctAnswer: 'b',
    explanation: 'Generally, investments with higher risk potential offer higher possible returns to compensate investors for taking on more risk.',
    topic: 'investing',
    difficulty: 'medium' as const,
    tags: ['investing', 'risk-return'],
    source: 'seed' as const,
  },
  {
    questionText: 'What is a mutual fund?',
    options: [
      { id: 'a', text: 'A fund that only invests in real estate' },
      { id: 'b', text: 'A pool of money from multiple investors managed by professionals' },
      { id: 'c', text: 'A government savings scheme' },
      { id: 'd', text: 'A type of fixed deposit' },
    ],
    correctAnswer: 'b',
    explanation: 'A mutual fund pools money from many investors to invest in stocks, bonds, or other securities, managed by fund managers.',
    topic: 'investing',
    difficulty: 'medium' as const,
    tags: ['investing', 'mutual-funds'],
    source: 'seed' as const,
  },
  {
    questionText: 'If a stock\'s P/E ratio is 25, what does this mean?',
    options: [
      { id: 'a', text: 'The stock costs ₹25' },
      { id: 'b', text: 'Investors pay ₹25 for every ₹1 of earnings' },
      { id: 'c', text: 'The company has 25 employees' },
      { id: 'd', text: 'The stock has risen 25%' },
    ],
    correctAnswer: 'b',
    explanation: 'The Price-to-Earnings (P/E) ratio shows how much investors are willing to pay per rupee of company earnings. A P/E of 25 means ₹25 per ₹1 of earnings.',
    topic: 'investing',
    difficulty: 'hard' as const,
    tags: ['investing', 'stocks', 'valuation'],
    source: 'seed' as const,
  },

  /* ── Banking (easy/medium) ── */
  {
    questionText: 'What is a savings account?',
    options: [
      { id: 'a', text: 'An account for daily transactions only' },
      { id: 'b', text: 'An account where you deposit money and earn interest' },
      { id: 'c', text: 'A type of credit card' },
      { id: 'd', text: 'An account with no interest' },
    ],
    correctAnswer: 'b',
    explanation: 'A savings account is designed for storing money while earning interest. It\'s different from a current/checking account.',
    topic: 'banking',
    difficulty: 'easy' as const,
    tags: ['banking', 'savings-account'],
    source: 'seed' as const,
  },
  {
    questionText: 'What is the difference between a debit card and a credit card?',
    options: [
      { id: 'a', text: 'They are exactly the same' },
      { id: 'b', text: 'Debit uses your own money; credit uses borrowed money' },
      { id: 'c', text: 'Credit cards are free to use' },
      { id: 'd', text: 'Debit cards always charge interest' },
    ],
    correctAnswer: 'b',
    explanation: 'A debit card deducts from your bank balance. A credit card lets you borrow money that you must repay, often with interest.',
    topic: 'banking',
    difficulty: 'medium' as const,
    tags: ['banking', 'debit-vs-credit'],
    source: 'seed' as const,
  },

  /* ── Smart Spending (easy/medium) ── */
  {
    questionText: 'What is "impulse buying"?',
    options: [
      { id: 'a', text: 'Buying things after careful planning' },
      { id: 'b', text: 'Making unplanned purchases based on sudden desire' },
      { id: 'c', text: 'Buying things on sale' },
      { id: 'd', text: 'Buying essential items only' },
    ],
    correctAnswer: 'b',
    explanation: 'Impulse buying is purchasing without planning, driven by emotions rather than needs. It can hurt your budget.',
    topic: 'smart spending',
    difficulty: 'easy' as const,
    tags: ['spending', 'impulse-buying'],
    source: 'seed' as const,
  },
  {
    questionText: 'Which strategy helps avoid overspending?',
    options: [
      { id: 'a', text: 'Always buy the most expensive option' },
      { id: 'b', text: 'Wait 24 hours before non-essential purchases' },
      { id: 'c', text: 'Never look at prices' },
      { id: 'd', text: 'Spend everything you earn immediately' },
    ],
    correctAnswer: 'b',
    explanation: 'The 24-hour rule helps curb impulse buying. Waiting a day often helps you realize you don\'t really need the item.',
    topic: 'smart spending',
    difficulty: 'medium' as const,
    tags: ['spending', 'self-control'],
    source: 'seed' as const,
  },

  /* ── Debt & Credit (medium/hard) ── */
  {
    questionText: 'What is a credit score?',
    options: [
      { id: 'a', text: 'Your bank account balance' },
      { id: 'b', text: 'A numerical rating of your creditworthiness' },
      { id: 'c', text: 'The number of credit cards you own' },
      { id: 'd', text: 'Your monthly salary' },
    ],
    correctAnswer: 'b',
    explanation: 'A credit score is a number that represents how trustworthy you are as a borrower, based on your borrowing history.',
    topic: 'debt and credit',
    difficulty: 'medium' as const,
    tags: ['credit', 'credit-score'],
    source: 'seed' as const,
  },
  {
    questionText: 'If you have a credit card with 18% annual interest and owe ₹10,000, approximately how much interest accrues in one month?',
    options: [
      { id: 'a', text: '₹150' },
      { id: 'b', text: '₹1,800' },
      { id: 'c', text: '₹180' },
      { id: 'd', text: '₹18' },
    ],
    correctAnswer: 'a',
    explanation: 'Monthly interest = Annual rate / 12 × Balance = 18% / 12 × ₹10,000 = 1.5% × ₹10,000 = ₹150.',
    topic: 'debt and credit',
    difficulty: 'hard' as const,
    tags: ['credit', 'interest', 'math'],
    source: 'seed' as const,
  },

  /* ── Taxes (medium/hard) ── */
  {
    questionText: 'What is income tax?',
    options: [
      { id: 'a', text: 'A fee for opening a bank account' },
      { id: 'b', text: 'A percentage of your earnings paid to the government' },
      { id: 'c', text: 'Money you earn from investments' },
      { id: 'd', text: 'A donation to charity' },
    ],
    correctAnswer: 'b',
    explanation: 'Income tax is a mandatory payment to the government based on your earnings. It funds public services and infrastructure.',
    topic: 'taxes',
    difficulty: 'medium' as const,
    tags: ['taxes', 'income-tax'],
    source: 'seed' as const,
  },

  /* ── Inflation (hard) ── */
  {
    questionText: 'If inflation is 6% per year and your savings earn 4% interest, what happens to your purchasing power?',
    options: [
      { id: 'a', text: 'It increases by 4%' },
      { id: 'b', text: 'It stays the same' },
      { id: 'c', text: 'It decreases by approximately 2%' },
      { id: 'd', text: 'It increases by 10%' },
    ],
    correctAnswer: 'c',
    explanation: 'When inflation (6%) exceeds your interest rate (4%), your real return is negative (-2%), meaning your money buys less over time.',
    topic: 'inflation',
    difficulty: 'hard' as const,
    tags: ['inflation', 'purchasing-power'],
    source: 'seed' as const,
  },
  {
    questionText: 'What causes inflation?',
    options: [
      { id: 'a', text: 'Only government policies' },
      { id: 'b', text: 'Increased money supply, demand exceeding supply, or rising production costs' },
      { id: 'c', text: 'People saving too much money' },
      { id: 'd', text: 'Stock market crashes' },
    ],
    correctAnswer: 'b',
    explanation: 'Inflation can be caused by multiple factors: too much money chasing too few goods (demand-pull), rising costs of production (cost-push), or monetary policy.',
    topic: 'inflation',
    difficulty: 'hard' as const,
    tags: ['inflation', 'economics'],
    source: 'seed' as const,
  },

  /* ── Insurance (medium) ── */
  {
    questionText: 'What is the main purpose of insurance?',
    options: [
      { id: 'a', text: 'To make money quickly' },
      { id: 'b', text: 'To protect against financial loss from unexpected events' },
      { id: 'c', text: 'To avoid paying taxes' },
      { id: 'd', text: 'To replace your salary' },
    ],
    correctAnswer: 'b',
    explanation: 'Insurance provides financial protection against specified risks by pooling premiums from many people to pay for individual losses.',
    topic: 'insurance',
    difficulty: 'medium' as const,
    tags: ['insurance', 'risk-management'],
    source: 'seed' as const,
  },

  /* ── Financial Planning (medium/hard) ── */
  {
    questionText: 'What is the "Rule of 72" used for?',
    options: [
      { id: 'a', text: 'Calculating your credit score' },
      { id: 'b', text: 'Estimating how long it takes to double your money' },
      { id: 'c', text: 'Determining your tax bracket' },
      { id: 'd', text: 'Setting a retirement age' },
    ],
    correctAnswer: 'b',
    explanation: 'Divide 72 by the annual interest rate to estimate years to double your money. At 8% interest, 72/8 = 9 years to double.',
    topic: 'financial planning',
    difficulty: 'hard' as const,
    tags: ['financial-planning', 'rule-of-72'],
    source: 'seed' as const,
  },
  {
    questionText: 'What is the benefit of starting to invest early?',
    options: [
      { id: 'a', text: 'No benefit — timing doesn\'t matter' },
      { id: 'b', text: 'More time for compound interest to grow your money' },
      { id: 'c', text: 'You get special tax breaks only for young people' },
      { id: 'd', text: 'Stocks are cheaper for young investors' },
    ],
    correctAnswer: 'b',
    explanation: 'Starting early gives compound interest more time to work. Even small amounts invested early can grow significantly over decades.',
    topic: 'financial planning',
    difficulty: 'medium' as const,
    tags: ['financial-planning', 'compound-interest', 'time-value'],
    source: 'seed' as const,
  },
];

async function seedQuestionBank() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // Clear existing seed questions
    await QuestionBankModel.deleteMany({ source: 'seed' });
    console.log('Cleared existing seed questions');

    // Insert new questions
    const result = await QuestionBankModel.insertMany(QUESTIONS);
    console.log(`Inserted ${result.length} battle questions`);

    // Show topic distribution
    const topics = await QuestionBankModel.aggregate([
      { $group: { _id: { topic: '$topic', difficulty: '$difficulty' }, count: { $sum: 1 } } },
      { $sort: { '_id.topic': 1, '_id.difficulty': 1 } },
    ]);

    console.log('\nQuestion distribution:');
    topics.forEach((t) => {
      console.log(`  ${t._id.topic} (${t._id.difficulty}): ${t.count}`);
    });

    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedQuestionBank();
