/** @format */

/**
 * LessonPage — Dynamic backend-driven lesson engine
 *
 * Flow:
 *   1. Fetch current lesson from GET /api/learning/current
 *   2. Render steps one-by-one
 *      - "info" steps: read content, press Continue (+5 XP)
 *      - "mcq"  steps: answer question → POST /api/learning/submit → show feedback
 *   3. After last step: POST /api/learning/complete → auto-load next lesson
 *
 * No hardcoded lesson data remains.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface InfoStep {
  type: "info";
  content: string;
  emoji?: string;
  xp: number;
}

interface McqOption {
  id: string;
  text: string;
}

interface McqStep {
  type: "mcq";
  question: string;
  options: McqOption[];
  xp: number;
}

type LessonStep = InfoStep | McqStep;

interface LessonData {
  lessonId: string;
  moduleId: number;
  lessonKey: string;
  title: string;
  order: number;
  totalLessons: number;
  steps: LessonStep[];
  xpReward: number;
  isCompleted: boolean;
  allDone: boolean;
}

interface SubmitResponse {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  xpEarned: number;
  nextStepIndex: number;
  lessonCompleted: boolean;
  updatedUser: any;
}

interface CompleteResponse {
  lessonKey: string;
  nextLesson: Omit<LessonData, "totalLessons" | "isCompleted" | "allDone"> | null;
  allDone: boolean;
}

// ── XP Popup ──────────────────────────────────────────────────────────────────

const XpPopup = ({ amount, onDone }: { amount: number; onDone: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="xp-popup animate-xp-float"
      style={{ top: "42%", left: "50%", transform: "translate(-50%,-50%)" }}
    >
      +{amount} XP ✨
    </div>
  );
};

// ── Confetti ──────────────────────────────────────────────────────────────────

const fireConfetti = () => {
  const colors = ["#1E90FF", "#00FFFF", "#FFD700", "#4169E1", "#87CEEB"];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement("div");
    el.className = "confetti-particle";
    el.style.left = Math.random() * 100 + "%";
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay = Math.random() * 0.5 + "s";
    el.style.animationDuration = Math.random() * 2 + 2 + "s";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
};

// ── Main Component ────────────────────────────────────────────────────────────

const LessonPage = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  // Lesson state
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step navigation
  const [stepIndex, setStepIndex] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  // MCQ state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<SubmitResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Coinsworth
  const [coinsworthMsg, setCoinsworthMsg] = useState("Let's learn something real today! 🚀");
  const [showCoinsworth, setShowCoinsworth] = useState(true);

  // Transition animation
  const [slideKey, setSlideKey] = useState(0);

  // ── Fetch current lesson ────────────────────────────────────────────────────

  const fetchLesson = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const data = await api.get<LessonData>("/learning/current");
      setLesson(data);
      setStepIndex(0);
      setSelectedOption(null);
      setFeedback(null);
      setSlideKey((k) => k + 1);
    } catch (err: any) {
      setError(err.message || "Failed to load lesson. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const awardXp = (amount: number) => {
    setTotalXp((x) => x + amount);
    setXpPopup(amount);
  };

  const advanceToStep = (nextIdx: number) => {
    setSelectedOption(null);
    setFeedback(null);
    setSlideKey((k) => k + 1);
    setStepIndex(nextIdx);
  };

  // ── Handle INFO step Continue ──────────────────────────────────────────────

  const handleInfoContinue = async () => {
    if (!lesson) return;
    const step = lesson.steps[stepIndex] as InfoStep;
    const gain = step.xp || 5;
    awardXp(gain);
    setCoinsworthMsg("Great! Keep your momentum. 💪");

    const isLast = stepIndex === lesson.steps.length - 1;
    if (isLast) {
      await handleLessonComplete();
    } else {
      advanceToStep(stepIndex + 1);
    }
  };

  // ── Handle MCQ answer submission ───────────────────────────────────────────

  const handleSubmitAnswer = async (optionId: string) => {
    if (!lesson || submitting || feedback) return;
    setSelectedOption(optionId);
    setSubmitting(true);

    try {
      const result = await api.post<SubmitResponse>("/learning/submit", {
        lessonId: lesson.lessonId,
        stepIndex,
        answer: optionId,
      });

      setFeedback(result);
      awardXp(result.xpEarned);

      if (result.isCorrect) {
        setStreak((s) => s + 1);
        setCoinsworthMsg(streak >= 2 ? `${streak + 1} in a row! 🔥` : "Correct! Great thinking. 🎉");
      } else {
        setStreak(0);
        setCoinsworthMsg("Read the explanation — it really helps. 💡");
      }

      // Sync user XP in auth context
      await refreshUser();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Got it! → advance after MCQ feedback ──────────────────────────────────

  const handleGotIt = async () => {
    if (!feedback || !lesson) return;
    const isLast = feedback.lessonCompleted;
    if (isLast) {
      await handleLessonComplete();
    } else {
      advanceToStep(feedback.nextStepIndex);
    }
  };

  // ── Lesson complete → auto-load next ──────────────────────────────────────

  const handleLessonComplete = async () => {
    if (!lesson) return;
    fireConfetti();

    try {
      const result = await api.post<CompleteResponse>("/learning/complete", {
        lessonId: lesson.lessonId,
      });

      awardXp(lesson.xpReward);
      await refreshUser();

      if (result.allDone || !result.nextLesson) {
        toast.success("🎓 You've completed all lessons! You're a Money Master!");
        setTimeout(() => navigate("/learning"), 2500);
        return;
      }

      toast.success(`✅ Lesson complete! Loading: ${result.nextLesson.title}`);

      // Seamlessly load next lesson
      setTimeout(() => {
        setLesson({
          ...result.nextLesson!,
          totalLessons: lesson.totalLessons,
          isCompleted: false,
          allDone: false,
        });
        setStepIndex(0);
        setSelectedOption(null);
        setFeedback(null);
        setSlideKey((k) => k + 1);
        setCoinsworthMsg("New lesson! Let's keep building your knowledge. 📚");
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Could not load next lesson");
      navigate("/learning");
    }
  };

  // ── Exit ───────────────────────────────────────────────────────────────────

  const handleExit = () => {
    if (confirm("Exit lesson? Your XP is already saved.")) {
      navigate("/learning");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your lesson…</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center glass-heavy">
          <p className="text-3xl mb-4">⚠️</p>
          <h2 className="text-xl font-bold mb-2">Could not load lesson</h2>
          <p className="text-muted-foreground mb-4 text-sm">{error}</p>
          <p className="text-xs text-muted-foreground mb-6">
            Make sure the server is running and you have seeded lessons:{" "}
            <code className="bg-muted px-1 rounded">npm run seed:v2</code>
          </p>
          <div className="flex gap-3 justify-center">
            <button className="btn-secondary-cta" onClick={() => navigate("/learning")}>
              Back
            </button>
            <button className="btn-primary-cta" onClick={() => fetchLesson()}>
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const currentStep = lesson.steps[stepIndex];
  const progressPercent = ((stepIndex + 1) / lesson.steps.length) * 100;

  const renderInfoStep = (step: InfoStep) => (
    <div className="space-y-8 max-w-3xl mx-auto animate-fade-in" key={slideKey}>
      {step.emoji && (
        <div className="text-8xl animate-float">{step.emoji}</div>
      )}
      <div className="glass-light p-8 rounded-2xl text-left">
        {/* Render line-breaks and bold from content */}
        <p className="text-xl md:text-2xl leading-relaxed font-medium whitespace-pre-line">
          {step.content.replace(/\*\*(.*?)\*\*/g, "$1")}
        </p>
      </div>
      <div className="flex justify-center">
        <button className="btn-primary-cta" onClick={handleInfoContinue}>
          Continue <ArrowRight className="inline ml-2 h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const renderMcqStep = (step: McqStep) => (
    <div className="space-y-6 w-full max-w-3xl mx-auto animate-fade-in" key={slideKey}>
      <div className="glass-light p-6 rounded-2xl">
        <p className="text-2xl md:text-3xl font-bold">{step.question}</p>
      </div>

      <div className="space-y-3">
        {step.options.map((opt, idx) => {
          let cls =
            "w-full p-5 text-lg text-left border-2 rounded-2xl transition-all duration-300 font-medium flex items-center gap-3";

          if (feedback) {
            if (opt.id === feedback.correctAnswer) {
              cls += " option-correct animate-correct-bounce";
            } else if (opt.id === selectedOption && !feedback.isCorrect) {
              cls += " option-wrong animate-shake";
            } else {
              cls += " opacity-40";
            }
          } else {
            cls +=
              opt.id === selectedOption
                ? " bg-primary/20 border-primary shadow-lg"
                : " glass-light hover:glass-medium border-border hover:border-primary/50 cursor-pointer hover:-translate-y-0.5";
          }

          return (
            <button
              key={opt.id}
              className={cls}
              disabled={!!feedback || submitting}
              onClick={() => handleSubmitAnswer(opt.id)}
            >
              {submitting && opt.id === selectedOption ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <span className="font-bold text-primary shrink-0">
                  {String.fromCharCode(65 + idx)}.
                </span>
              )}
              {opt.text}
            </button>
          );
        })}
      </div>

      {/* Feedback panel */}
      {feedback && (
        <div
          className={`p-5 rounded-2xl border-2 animate-slide-up ${
            feedback.isCorrect
              ? "bg-green-50 dark:bg-green-950/30 border-green-400"
              : "bg-red-50 dark:bg-red-950/30 border-red-400"
          }`}
        >
          <p className="font-bold text-lg mb-1">
            {feedback.isCorrect ? "✅ Correct!" : "❌ Not quite"}
          </p>
          <p className="text-base text-foreground/80">{feedback.explanation}</p>
          <button className="btn-primary-cta mt-4" onClick={handleGotIt}>
            Got it! <ArrowRight className="inline ml-2 h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating background finance icons */}
      {["💰", "📊", "💳", "🏦"].map((icon, i) => (
        <div
          key={i}
          className="absolute text-5xl opacity-[0.06] animate-float pointer-events-none select-none"
          style={{
            top: `${15 + i * 22}%`,
            left: i % 2 === 0 ? "4%" : undefined,
            right: i % 2 !== 0 ? "4%" : undefined,
            animationDelay: `${i * 0.6}s`,
          }}
        >
          {icon}
        </div>
      ))}

      {/* Reading progress bar */}
      <div className="reading-progress" style={{ width: `${progressPercent}%` }} />

      {/* XP popup */}
      {xpPopup !== null && <XpPopup amount={xpPopup} onDone={() => setXpPopup(null)} />}

      <div className="w-full max-w-4xl relative z-10">
        {/* Header */}
        <div className="mb-6 glass-medium p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse-soft" />
                {lesson.title}
              </h2>
              <span className="text-sm text-muted-foreground font-medium">
                Step {stepIndex + 1} of {lesson.steps.length}
              </span>
              {streak >= 2 && (
                <span className="streak-badge animate-fire">🔥 {streak} streak</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExit}
              className="hover:bg-destructive/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={progressPercent} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(progressPercent)}% complete
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-primary">+{totalXp} XP</span>
            </div>
          </div>
        </div>

        {/* Step card */}
        <Card className="glass-heavy p-8 md:p-12 min-h-[520px] flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50" />
          <div className="relative z-10 w-full">
            {currentStep.type === "info"
              ? renderInfoStep(currentStep as InfoStep)
              : renderMcqStep(currentStep as McqStep)}
          </div>
        </Card>

        {/* Lesson breadcrumb */}
        <div className="mt-3 text-center text-xs text-muted-foreground glass-light p-2 rounded-lg">
          Lesson {lesson.order} of {lesson.totalLessons} •{" "}
          <span className="text-primary font-medium">{lesson.title}</span>
        </div>
      </div>

      {/* Coinsworth character */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
        {showCoinsworth && (
          <div className="coinsworth-bubble animate-scale-in">
            <button
              className="absolute top-1 right-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowCoinsworth(false)}
            >
              ✕
            </button>
            <p>{coinsworthMsg}</p>
          </div>
        )}
        <button
          className="text-4xl animate-coinsworth-bounce hover:scale-110 transition-transform"
          onClick={() => setShowCoinsworth((s) => !s)}
          title="Coinsworth"
        >
          🪙
        </button>
      </div>
    </div>
  );
};

export default LessonPage;
