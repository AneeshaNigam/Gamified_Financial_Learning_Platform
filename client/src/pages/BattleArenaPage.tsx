/** @format */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBattle } from "@/contexts/BattleContext";
import { useBattleTimer } from "@/features/battle/hooks/useBattleTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const BattleArenaPage = () => {
  const navigate = useNavigate();
  const { state, selectAnswer, submitAnswer, forfeit, reset } = useBattle();
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdown, setCountdown] = useState(3);

  const isActive =
    state.phase === "in_battle" && !!state.currentQuestion && !state.answerLocked;

  const { timeRemaining, progress, isWarning, isCritical } = useBattleTimer(
    state.currentQuestion?.timeLimit ?? 15,
    isActive
  );

  // Redirect if not in battle
  useEffect(() => {
    if (state.phase === "idle") {
      navigate("/battles");
    }
    if (state.phase === "battle_end") {
      navigate("/battle/results");
    }
  }, [state.phase, navigate]);

  // Countdown animation
  useEffect(() => {
    if (state.phase === "countdown" || state.phase === "match_found") {
      setShowCountdown(true);
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setShowCountdown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state.phase]);

  // Auto-submit on answer select (lock in)
  useEffect(() => {
    if (state.selectedAnswer && !state.answerLocked) {
      const timeout = setTimeout(() => {
        submitAnswer();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [state.selectedAnswer, state.answerLocked, submitAnswer]);

  const question = state.currentQuestion;
  const totalQuestions = question?.totalQuestions ?? 10;
  const questionProgress = (((question?.index ?? 0) + 1) / totalQuestions) * 100;

  // Countdown overlay
  if (showCountdown) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-6 animate-scale-in">
          {state.opponent && (
            <div className="space-y-2 animate-fade-in">
              <div className="text-lg text-muted-foreground">You're battling</div>
              <div className="text-3xl font-bold">{state.opponent.name}</div>
              <div className="text-sm text-muted-foreground">
                Level {state.opponent.level} • {state.opponent.rating} ELO
              </div>
            </div>
          )}
          <div className="relative">
            <div className="text-8xl font-bold text-primary animate-pulse">
              {countdown > 0 ? countdown : "GO!"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Answer review overlay
  if (state.phase === "reviewing_answer" && state.lastResult) {
    const { yourResult, correctAnswer } = state.lastResult;
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center space-y-6 max-w-md mx-auto px-4 animate-scale-in">
          <div className={`text-6xl ${yourResult.isCorrect ? "animate-bounce-in" : "animate-shake"}`}>
            {yourResult.isCorrect ? "✅" : "❌"}
          </div>
          <div className="text-2xl font-bold">
            {yourResult.isCorrect ? "Correct!" : "Wrong!"}
          </div>
          {yourResult.isCorrect && (
            <div className="text-lg text-success font-semibold">+{yourResult.pointsEarned} points</div>
          )}
          <div className="text-sm text-muted-foreground">
            Response time: {(yourResult.responseTimeMs / 1000).toFixed(1)}s
          </div>

          {/* Scoreboard */}
          <Card className="glass-medium">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">You</div>
                  <div className="text-3xl font-bold text-primary">{state.myScore}</div>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">vs</div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">{state.opponent?.name}</div>
                  <div className="text-3xl font-bold text-destructive">{state.opponentScore}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground animate-pulse-soft">
            Next question loading...
          </div>
        </div>
      </div>
    );
  }

  // Main battle UI
  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border glass-heavy">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">You</div>
            <div className="text-xl font-bold text-primary">{state.myScore}</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-muted-foreground">
            Q{(question?.index ?? 0) + 1} / {totalQuestions}
          </div>
          <Progress value={questionProgress} className="w-32 h-1.5 mt-1" />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">{state.opponent?.name}</div>
            <div className="text-xl font-bold text-destructive">{state.opponentScore}</div>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="px-4 py-2">
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear ${
              isCritical
                ? "bg-destructive animate-pulse"
                : isWarning
                ? "bg-primary"
                : "bg-gradient-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div
          className={`text-center text-sm font-mono mt-1 ${
            isCritical
              ? "text-destructive animate-pulse font-bold text-lg"
              : isWarning
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        >
          {timeRemaining}s
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">
        {question && (
          <div className="w-full max-w-2xl space-y-6">
            {/* Question Text */}
            <Card className="glass-medium">
              <CardContent className="p-6">
                <h2 className="text-xl md:text-2xl font-semibold text-center leading-relaxed">
                  {question.questionText}
                </h2>
              </CardContent>
            </Card>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {question.options.map((option, idx) => {
                const isSelected = state.selectedAnswer === option.id;
                const isLocked = state.answerLocked;
                const optionLetter = String.fromCharCode(65 + idx);

                return (
                  <button
                    key={option.id}
                    id={`battle-option-${option.id}`}
                    onClick={() => !isLocked && selectAnswer(option.id)}
                    disabled={isLocked}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30 scale-[1.02]"
                        : isLocked
                        ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                        : "border-border bg-card hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold flex-shrink-0 ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {optionLetter}
                      </span>
                      <span className="text-sm md:text-base pt-1">
                        {option.text}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 text-primary">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between glass-heavy">
        <Button
          onClick={forfeit}
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Forfeit
        </Button>

        {state.answerLocked && (
          <div className="text-sm text-muted-foreground animate-pulse-soft">
            Waiting for opponent...
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {state.config?.totalQuestions ?? 10} questions • {state.config?.timePerQuestion ?? 15}s each
        </div>
      </div>
    </div>
  );
};

export default BattleArenaPage;
