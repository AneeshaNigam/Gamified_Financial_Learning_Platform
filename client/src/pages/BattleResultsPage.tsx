/** @format */

import { useNavigate } from "react-router-dom";
import { useBattle } from "@/contexts/BattleContext";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Swords, TrendingUp, Sparkles, Target, Clock, Zap } from "lucide-react";

const BattleResultsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, reset, joinQueue } = useBattle();
  const result = state.battleResult;

  if (!result) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-fade-in">
          <Swords className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="text-xl font-bold">No Battle Results</h3>
          <p className="text-muted-foreground">There are no results to display.</p>
          <Button onClick={() => navigate("/battles")}>Back to Battles</Button>
        </div>
      </DashboardLayout>
    );
  }

  const isWin = result.result === "win";
  const isDraw = result.result === "draw";
  const isLoss = result.result === "loss";

  const resultConfig = {
    win: {
      emoji: "🏆",
      title: "Victory!",
      subtitle: "You crushed it!",
      accentClass: "text-success",
      cardClass: "bg-gradient-to-r from-success/10 to-success/5 border-success/20",
    },
    loss: {
      emoji: "💪",
      title: "Defeat",
      subtitle: "Learn from it and come back stronger!",
      accentClass: "text-destructive",
      cardClass: "bg-gradient-to-r from-destructive/10 to-destructive/5 border-destructive/20",
    },
    draw: {
      emoji: "🤝",
      title: "Draw!",
      subtitle: "Evenly matched — rematch?",
      accentClass: "text-primary",
      cardClass: "bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20",
    },
  }[result.result];

  const userId = user?._id ?? localStorage.getItem("userId");
  const myData = result.finalScores.find((s) => s.userId === userId);
  const oppData = result.finalScores.find((s) => s.userId !== userId);

  function handlePlayAgain() {
    reset();
    joinQueue("quick_match");
  }

  function handleBackToLobby() {
    reset();
    navigate("/battles");
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        {/* Hero Result */}
        <div className="text-center space-y-3 pt-4">
          <div className="text-7xl animate-bounce-in">{resultConfig.emoji}</div>
          <h1 className={`text-4xl md:text-5xl font-bold ${resultConfig.accentClass}`}>
            {resultConfig.title}
          </h1>
          <p className="text-muted-foreground text-lg">{resultConfig.subtitle}</p>
        </div>

        {/* Score Comparison */}
        <Card className={resultConfig.cardClass}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-sm text-muted-foreground mb-1">You</div>
                <div className="text-4xl font-bold text-primary">{myData?.score ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{myData?.accuracy ?? 0}% accurate</div>
              </div>
              <div className="px-6">
                <div className="text-2xl font-bold text-muted-foreground">VS</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-sm text-muted-foreground mb-1">{oppData?.name ?? "Opponent"}</div>
                <div className="text-4xl font-bold text-destructive">{oppData?.score ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{oppData?.accuracy ?? 0}% accurate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ELO & XP Changes */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 hover-lift glass-light">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">ELO Change</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div
              className={`text-3xl font-bold ${
                result.eloChange > 0
                  ? "text-success"
                  : result.eloChange < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {result.eloChange > 0 ? "+" : ""}
              {result.eloChange}
            </div>
            <p className="text-xs text-muted-foreground mt-1">New Rating: {result.newRating}</p>
          </Card>

          <Card className="p-4 hover-lift glass-light">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">XP Earned</span>
              <Sparkles className="h-4 w-4 text-secondary animate-pulse-soft" />
            </div>
            <div className="text-3xl font-bold text-secondary">+{result.xpEarned}</div>
            <p className="text-xs text-muted-foreground mt-1">Keep it up!</p>
          </Card>
        </div>

        {/* Battle Analytics */}
        <Card className="glass-medium">
          <CardHeader>
            <CardTitle className="text-lg">Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                </div>
                <div className="text-2xl font-bold">{result.analytics.accuracy}%</div>
                <Progress value={result.analytics.accuracy} className="h-2 mt-1" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Avg Response</span>
                </div>
                <div className="text-2xl font-bold">
                  {(result.analytics.avgResponseTimeMs / 1000).toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3.5 w-3.5 text-success" />
                  <span className="text-sm text-muted-foreground">Fastest</span>
                </div>
                <div className="text-lg font-bold text-success">
                  {(result.analytics.fastestResponseMs / 1000).toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Slowest</span>
                </div>
                <div className="text-lg font-bold">
                  {(result.analytics.slowestResponseMs / 1000).toFixed(1)}s
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topic Performance */}
        {result.analytics.topicBreakdown.length > 0 && (
          <Card className="glass-medium">
            <CardHeader>
              <CardTitle className="text-lg">Topic Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.analytics.topicBreakdown.map((topic) => (
                <div key={topic.topic}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm capitalize">{topic.topic}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {topic.correct}/{topic.total}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          topic.accuracy >= 75
                            ? "text-success border-success/30"
                            : topic.accuracy >= 50
                            ? "text-primary border-primary/30"
                            : "text-destructive border-destructive/30"
                        }`}
                      >
                        {topic.accuracy}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={topic.accuracy} className="h-1.5" />
                </div>
              ))}

              {result.analytics.strongTopics.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-1">💪 Strong Topics</div>
                  <div className="flex gap-1 flex-wrap">
                    {result.analytics.strongTopics.map((t) => (
                      <Badge key={t} variant="outline" className="text-success border-success/30 capitalize text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.analytics.weakTopics.length > 0 && (
                <div className="pt-1">
                  <div className="text-xs text-muted-foreground mb-1">📚 Practice More</div>
                  <div className="flex gap-1 flex-wrap">
                    {result.analytics.weakTopics.map((t) => (
                      <Badge key={t} variant="outline" className="text-destructive border-destructive/30 capitalize text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Button
            onClick={handlePlayAgain}
            className="flex-1 bg-gradient-primary hover:opacity-90 text-white font-semibold"
            size="lg"
          >
            Play Again
          </Button>
          <Button
            onClick={handleBackToLobby}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Back to Lobby
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BattleResultsPage;
