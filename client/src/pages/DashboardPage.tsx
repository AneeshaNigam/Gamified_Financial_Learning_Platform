/** @format */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/contexts/WalletContext";
import { useProgress } from "@/contexts/ProgressContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  BookOpen,
  Trophy,
  Swords,
  Calculator,
  Sparkles,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";

const Dashboard = () => {
  const { user } = useAuth();
  const { wallet, transactions } = useWallet();
  const { progress } = useProgress();
  const [showCoinsworth, setShowCoinsworth] = useState(true);

  const completionPercent = (progress.completedLessons.length / 15) * 100; // 5 modules x 3 lessons
  const displayXp = (user?.xp ?? 0) > 0 ? user?.xp : null;
  const streak = user?.currentStreak ?? 0;

  // Dynamic Coinsworth greeting
  const coinsworthGreeting = streak >= 5
    ? `${streak}-day streak! You're absolutely crushing it! 🔥`
    : streak >= 2
    ? `Nice — ${streak} days in a row! Keep the momentum! 💪`
    : progress.completedLessons.length === 0
    ? "Welcome! Your financial journey starts with one lesson. Let's go! 🚀"
    : "Good to see you back! Every session makes you smarter with money. 🧠";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome + Coinsworth */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.name}! 👋
            </h1>
            {streak >= 2 ? (
              <p className="text-muted-foreground flex items-center gap-2">
                <span className="streak-badge animate-fire">🔥 {streak} Day Streak!</span>
                <span>Keep it going!</span>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Ready to learn something new today?
              </p>
            )}
          </div>

          {/* Coinsworth bubble */}
          {showCoinsworth && (
            <div className="flex flex-col items-end gap-1">
              <div className="coinsworth-bubble" style={{ maxWidth: 240 }}>
                <button
                  className="absolute top-1 right-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCoinsworth(false)}
                >✕</button>
                <p>{coinsworthGreeting}</p>
              </div>
              <span className="text-3xl animate-coinsworth-bounce cursor-pointer" onClick={() => setShowCoinsworth((s) => !s)}>🪙</span>
            </div>
          )}
          {!showCoinsworth && (
            <button className="text-3xl hover:scale-110 transition-transform" onClick={() => setShowCoinsworth(true)} title="Coinsworth says hi!">🪙</button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 hover-lift glass-light">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total XP</span>
              <Sparkles className="h-5 w-5 text-primary animate-pulse-soft" />
            </div>
            {displayXp !== null ? (
              <p className="text-3xl font-bold text-primary">{displayXp}</p>
            ) : (
              <p className="text-lg font-semibold text-muted-foreground">Start earning!</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Level {user?.level ?? 1}
            </p>
          </Card>

          <Card className="p-6 hover-lift glass-light">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Lucre Balance
              </span>
              <span className="text-2xl">🪙</span>
            </div>
            <p className="text-3xl font-bold">₹{wallet.lucreBalance}</p>
            <p className="text-xs text-muted-foreground mt-1">
              This week's earnings
            </p>
          </Card>

          <Card className="p-6 hover-lift glass-light">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Active Balance
              </span>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold">
              ₹{wallet.discretionaryBalance.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Available to spend
            </p>
          </Card>

          <Card className="p-6 hover-lift glass-light">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Login Streak
              </span>
              <span className={`text-2xl ${streak >= 3 ? "animate-fire" : ""}`}>🔥</span>
            </div>
            <p className={`text-3xl font-bold ${streak >= 3 ? "text-orange-500" : ""}`}>{streak}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Best: {user?.longestStreak ?? 0} days
            </p>
          </Card>
        </div>

        {/* Today's Challenge */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 glass-medium">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                📅 Today's Challenge
              </h3>
              <p className="text-muted-foreground mb-4">
                Complete 1 quiz today - Reward: 50 XP + ₹50
              </p>
              <div className="h-2 bg-background rounded-full overflow-hidden mb-2">
                <div className="h-full bg-gradient-primary w-0 transition-all" />
              </div>
              <Link to="/learning">
                <Button className="bg-primary hover:bg-primary/90">
                  Start Challenge
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Learning Progress */}
          <Card className="p-6 glass-medium">
            <h3 className="text-lg font-semibold mb-4">📚 Learning Progress</h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 56 * (1 - completionPercent / 100)
                    }`}
                    className="text-primary transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {Math.round(completionPercent)}%
                  </span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-4">
              {progress.completedLessons.length} of 15 lessons complete
            </p>
            <Link to="/learning">
              <Button variant="outline" className="w-full">
                Continue Learning
              </Button>
            </Link>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6 glass-medium">
            <h3 className="text-lg font-semibold mb-4">📊 Recent Activity</h3>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-start gap-3 pb-3 border-b last:border-0"
                >
                  <div
                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${
                      txn.amount > 0
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }
                  `}
                  >
                    {txn.amount > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {txn.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(txn.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      txn.amount > 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {txn.amount > 0 ? "+" : ""}₹{Math.abs(txn.amount)}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No activity yet. Start learning to earn rewards!
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6 glass-heavy">
          <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/learning">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2 hover-lift"
              >
                <BookOpen className="h-6 w-6" />
                <span className="text-sm">Start New Lesson</span>
              </Button>
            </Link>
            <Link to="/battles">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2 hover-lift"
              >
                <Swords className="h-6 w-6" />
                <span className="text-sm">Challenge Friend</span>
              </Button>
            </Link>
            <Link to="/tools">
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2 hover-lift"
              >
                <Calculator className="h-6 w-6" />
                <span className="text-sm">Financial Tools</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
