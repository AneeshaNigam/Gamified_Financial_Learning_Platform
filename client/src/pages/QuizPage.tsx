/** @format */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProgress } from "@/contexts/ProgressContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, ArrowRight, Sparkles } from "lucide-react";

// ── Questions ────────────────────────────────────────────────────────────────
const generateQuizQuestions = (_moduleId: number) => [
  {
    question: "You have ₹500 and spend ₹180 on groceries, ₹60 on transport. How much remains?",
    options: ["₹240", "₹260", "₹320", "₹200"],
    correct: 1,
    explanation: "₹500 − ₹180 − ₹60 = ₹260. Tracking every expense — even small ones — is the foundation of budgeting.",
  },
  {
    question: "What does a budget primarily help you do?",
    options: ["Spend more freely", "Plan where your money goes before you spend it", "Avoid paying taxes", "Borrow money cheaply"],
    correct: 1,
    explanation: "A budget is a pre-spending plan. It keeps your financial goals in focus and prevents overspending.",
  },
  {
    question: "Which best describes 'compound interest'?",
    options: ["Interest paid only on the original amount", "Interest earned on both principal and previously earned interest", "A penalty for late payments", "A flat fee charged by banks"],
    correct: 1,
    explanation: "Compound interest is 'interest on interest'. Over time it causes money to grow exponentially — the key reason to start saving early.",
  },
  {
    question: "Priya earns ₹30,000/month. She should save at least…",
    options: ["₹1,000", "₹2,000", "₹6,000 (20%)", "₹15,000 (50%)"],
    correct: 2,
    explanation: "The 50-30-20 rule suggests saving at least 20% of income. For ₹30,000 that's ₹6,000 — building wealth while still covering needs and wants.",
  },
  {
    question: "A stock represents…",
    options: ["A loan given to a company", "A piece of ownership in a company", "A government savings bond", "A fixed monthly deposit"],
    correct: 1,
    explanation: "Owning stock makes you a part-owner (shareholder). If the company grows, your investment can grow too.",
  },
  {
    question: "Why is an emergency fund important?",
    options: [
      "To invest in the stock market",
      "To pay for luxury items",
      "To cover unexpected expenses without going into debt",
      "To earn high returns",
    ],
    correct: 2,
    explanation: "An emergency fund (3-6 months of expenses) is your financial safety net — it prevents a job loss or medical bill from spiralling into debt.",
  },
  {
    question: "If you save ₹200/month for 2 years, how much have you saved (excluding interest)?",
    options: ["₹2,400", "₹4,800", "₹3,200", "₹6,000"],
    correct: 1,
    explanation: "₹200 × 24 months = ₹4,800. Small consistent savings add up significantly over time.",
  },
  {
    question: "Which is a NEED, not a WANT?",
    options: ["Streaming subscription", "New shoes (you already have working ones)", "Basic nutritious food", "Latest smartphone"],
    correct: 2,
    explanation: "Needs are essentials for survival and health — food, shelter, medicine. Wants enhance life but aren't critical.",
  },
  {
    question: "What does 'investing' mean in personal finance?",
    options: [
      "Spending money on things you enjoy",
      "Hiding money under a mattress",
      "Putting money into assets expected to grow in value over time",
      "Borrowing money from a bank",
    ],
    correct: 2,
    explanation: "Investing puts your money to work — in stocks, mutual funds, real estate, etc. — with the goal of growing your wealth over time.",
  },
  {
    question: "Which option typically earns the highest long-term return?",
    options: ["Cash under a mattress", "Savings account", "Long-term equity mutual funds", "Daily spending"],
    correct: 2,
    explanation: "Historically, equity (stock) investments beat inflation and savings accounts over long periods — at higher risk. Time in market matters.",
  },
];

// ── XP Popup ──────────────────────────────────────────────────────────────
const XpPopup = ({ amount, onDone }: { amount: number; onDone: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="xp-popup animate-xp-float" style={{ top: "40%", left: "50%", transform: "translate(-50%,-50%)" }}>
      +{amount} XP ✨
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const Quiz = () => {
  const { moduleId } = useParams();
  const { completeQuiz } = useProgress();
  const navigate = useNavigate();

  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(300);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [xpTotal, setXpTotal] = useState(0);
  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<"idle" | "correct" | "wrong">("idle");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [coinsworthMsg, setCoinsworthMsg] = useState("You've got this! Think carefully. 🧠");
  const [showCoinsworth, setShowCoinsworth] = useState(true);

  const questions = generateQuizQuestions(parseInt(moduleId!));

  const handleComplete = useCallback(() => {
    setCompleted(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    completeQuiz(`quiz-${moduleId}`, score, questions.length, timeSpent);
  }, [score, questions.length, moduleId, startTime, completeQuiz]);

  useEffect(() => {
    if (started && !completed && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !completed) {
      handleComplete();
    }
  }, [started, timeLeft, completed, handleComplete]);

  const handleAnswer = (answerIndex: number) => {
    if (feedbackState !== "idle") return;
    const isCorrect = answerIndex === questions[currentQuestion].correct;
    setSelectedIndex(answerIndex);

    if (isCorrect) {
      const gained = 10;
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      setXpTotal((x) => x + gained);
      setXpPopup(gained);
      setFeedbackState("correct");
      setCoinsworthMsg(streak >= 2 ? `${streak + 1} in a row! You're on fire! 🔥` : "Correct! Well reasoned. 🎉");
    } else {
      setLives((l) => l - 1);
      setStreak(0);
      setFeedbackState("wrong");
      setCoinsworthMsg("Almost! Read the explanation — it'll stick. 💡");
      if (lives - 1 === 0) {
        setTimeout(() => handleComplete(), 2500);
      }
    }
  };

  const advanceQuestion = () => {
    setFeedbackState("idle");
    setSelectedIndex(null);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((q) => q + 1);
      setCoinsworthMsg("Next one! Take your time. 🧠");
    } else {
      handleComplete();
    }
  };

  const percentage = (score / questions.length) * 100;
  const rating = percentage >= 90 ? "⭐⭐⭐" : percentage >= 70 ? "⭐⭐" : percentage >= 50 ? "⭐" : "💪";
  const message =
    percentage >= 90 ? "Outstanding! You're a Money Master!" :
    percentage >= 70 ? "Great work! Getting sharper! 🎯" :
    percentage >= 50 ? "Nice effort! Review and retry for mastery." :
    "Keep going — every attempt teaches you something!";

  // ── Quiz Start Screen ───────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-10 left-10 text-5xl opacity-[0.07] animate-float pointer-events-none select-none">💰</div>
        <div className="absolute bottom-16 right-16 text-5xl opacity-[0.07] animate-float pointer-events-none select-none" style={{ animationDelay: "1s" }}>📊</div>

        <Card className="p-10 max-w-lg w-full text-center animate-scale-in glass-heavy">
          <div className="text-7xl mb-6 animate-float">🪙</div>
          <h1 className="text-3xl font-bold mb-2">Module {moduleId} Knowledge Check</h1>
          <p className="text-muted-foreground mb-8">
            Coinsworth has 10 scenario-based questions ready. Think carefully — it's not about memorising facts, it's about applying concepts.
          </p>
          <div className="glass-light rounded-2xl p-5 space-y-3 text-left mb-8">
            {[
              ["📝 Questions", "10 concept-based questions"],
              ["⏱️ Time Limit", "5 minutes"],
              ["❤️ Lives", "3 mistakes allowed"],
              ["✨ XP Reward", "Up to 100 XP + bonuses"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-base">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{val}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary-cta w-full" onClick={() => setStarted(true)}>
            Start Quiz <ArrowRight className="inline ml-2 h-5 w-5" />
          </button>
        </Card>
      </div>
    );
  }

  // ── Quiz Complete Screen ─────────────────────────────────────────────────
  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="p-10 max-w-lg w-full text-center animate-bounce-in glass-heavy">
          <div className="text-6xl mb-6">{rating}</div>
          <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
          <p className="text-xl text-muted-foreground mb-8">{message}</p>

          <div className="glass-light rounded-2xl p-6 space-y-4 mb-8">
            <div className="flex justify-between text-lg">
              <span>Score</span>
              <span className="font-bold">{score}/{questions.length} ({percentage.toFixed(0)}%)</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>XP Earned</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <Sparkles className="h-4 w-4" />{xpTotal} XP
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Time</span>
              <span className="font-bold">{Math.floor((300 - timeLeft) / 60)}:{((300 - timeLeft) % 60).toString().padStart(2, "0")}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary-cta flex-1" onClick={() => navigate("/learning")}>Back to Path</button>
            <button className="btn-primary-cta flex-1" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </Card>
      </div>
    );
  }

  // ── Active Quiz ─────────────────────────────────────────────────────────
  const q = questions[currentQuestion];
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {xpPopup !== null && <XpPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}

      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-6 glass-medium p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Clock className={`h-5 w-5 ${timeLeft < 60 ? "text-destructive animate-pulse-soft" : "text-muted-foreground"}`} />
              <span className={`font-bold text-lg tabular-nums ${timeLeft < 60 ? "text-destructive" : ""}`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">
              Question {currentQuestion + 1} / {questions.length}
            </span>
            <div className="flex gap-1 items-center">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`text-xl ${i < lives ? "" : "opacity-20 grayscale"}`}>❤️</span>
              ))}
            </div>
            {streak >= 2 && <span className="streak-badge animate-fire">🔥 {streak} streak</span>}
          </div>
          <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2.5" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}% complete</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" />{xpTotal} XP</span>
          </div>
        </div>

        {/* Question Card */}
        <Card className="p-8 animate-fade-in glass-heavy">
          <h2 className="text-2xl font-bold mb-8 text-center">{q.question}</h2>

          <div className="space-y-3">
            {q.options.map((option, index) => {
              let cls = "w-full p-5 text-lg text-left border-2 rounded-2xl transition-all duration-300 font-medium flex items-center gap-3";
              if (feedbackState !== "idle") {
                if (index === q.correct) cls += " option-correct animate-correct-bounce";
                else if (index === selectedIndex && index !== q.correct) cls += " option-wrong animate-shake";
                else cls += " opacity-40";
              } else {
                cls += " glass-light hover:glass-medium border-border hover:border-primary/50 cursor-pointer hover:-translate-y-0.5";
              }
              return (
                <button key={index} className={cls} onClick={() => handleAnswer(index)} disabled={feedbackState !== "idle"}>
                  <span className="font-bold text-primary shrink-0">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Feedback panel */}
          {feedbackState !== "idle" && (
            <div className={`mt-6 p-5 rounded-2xl border-2 animate-slide-up ${feedbackState === "correct" ? "bg-green-50 dark:bg-green-950/30 border-green-400" : "bg-red-50 dark:bg-red-950/30 border-red-400"}`}>
              <p className="font-bold text-lg mb-1">
                {feedbackState === "correct" ? "✅ Correct!" : "❌ Not quite"}
              </p>
              <p className="text-base text-foreground/80">{q.explanation}</p>
              {feedbackState !== "idle" && lives > 0 && (
                <button className="btn-primary-cta mt-4" onClick={advanceQuestion}>
                  {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"} <ArrowRight className="inline ml-2 h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Coinsworth */}
        <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
          {showCoinsworth && (
            <div className="coinsworth-bubble animate-scale-in">
              <button
                className="absolute top-1 right-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowCoinsworth(false)}
              >✕</button>
              <p>{coinsworthMsg}</p>
            </div>
          )}
          <button
            className="text-4xl animate-coinsworth-bounce hover:scale-110 transition-transform"
            onClick={() => setShowCoinsworth((s) => !s)}
          >🪙</button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
