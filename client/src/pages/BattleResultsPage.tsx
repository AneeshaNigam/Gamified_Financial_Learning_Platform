/** @format */

import { useNavigate } from "react-router-dom";
import { useBattle } from "@/contexts/BattleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const BattleResultsPage = () => {
  const navigate = useNavigate();
  const { state, reset, joinQueue } = useBattle();
  const result = state.battleResult;

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚔️</div>
          <p className="text-muted-foreground">No battle results to show</p>
          <Button onClick={() => navigate("/battles")}>Back to Battles</Button>
        </div>
      </div>
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
      gradient: "from-yellow-500/20 via-green-500/10 to-transparent",
      titleColor: "text-yellow-400",
      borderColor: "border-yellow-700/30",
    },
    loss: {
      emoji: "💪",
      title: "Defeat",
      subtitle: "Learn from it and come back stronger!",
      gradient: "from-red-500/20 via-red-500/5 to-transparent",
      titleColor: "text-red-400",
      borderColor: "border-red-700/30",
    },
    draw: {
      emoji: "🤝",
      title: "Draw!",
      subtitle: "Evenly matched — rematch?",
      gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
      titleColor: "text-blue-400",
      borderColor: "border-blue-700/30",
    },
  }[result.result];

  const myData = result.finalScores.find(
    (s) => s.userId === localStorage.getItem("userId")
  );
  const oppData = result.finalScores.find(
    (s) => s.userId !== localStorage.getItem("userId")
  );

  function handlePlayAgain() {
    reset();
    joinQueue("quick_match");
  }

  function handleBackToLobby() {
    reset();
    navigate("/battles");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div
        className={`relative bg-gradient-to-b ${resultConfig.gradient} pb-8 pt-12 px-4`}
      >
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="text-7xl animate-bounce">{resultConfig.emoji}</div>
          <h1
            className={`text-4xl md:text-5xl font-bold ${resultConfig.titleColor}`}
          >
            {resultConfig.title}
          </h1>
          <p className="text-muted-foreground text-lg">{resultConfig.subtitle}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6 -mt-2">
        {/* Score Comparison */}
        <Card className={`${resultConfig.borderColor}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-sm text-muted-foreground mb-1">You</div>
                <div className="text-4xl font-bold text-blue-400">{myData?.score ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{myData?.accuracy ?? 0}% accurate</div>
              </div>
              <div className="px-6">
                <div className="text-2xl font-bold text-muted-foreground">VS</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-sm text-muted-foreground mb-1">{oppData?.name ?? "Opponent"}</div>
                <div className="text-4xl font-bold text-red-400">{oppData?.score ?? 0}</div>
                <div className="text-sm text-muted-foreground mt-1">{oppData?.accuracy ?? 0}% accurate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ELO & XP Changes */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-950/40 to-blue-900/20 border-blue-800/30">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">ELO Change</div>
              <div
                className={`text-3xl font-bold ${
                  result.eloChange > 0
                    ? "text-green-400"
                    : result.eloChange < 0
                    ? "text-red-400"
                    : "text-gray-400"
                }`}
              >
                {result.eloChange > 0 ? "+" : ""}
                {result.eloChange}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                New Rating: {result.newRating}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-950/40 to-purple-900/20 border-purple-800/30">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">XP Earned</div>
              <div className="text-3xl font-bold text-purple-400">+{result.xpEarned}</div>
              <div className="text-xs text-muted-foreground mt-1">Keep it up!</div>
            </CardContent>
          </Card>
        </div>

        {/* Battle Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
                <div className="text-2xl font-bold">{result.analytics.accuracy}%</div>
                <Progress value={result.analytics.accuracy} className="h-2 mt-1" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg Response</div>
                <div className="text-2xl font-bold">
                  {(result.analytics.avgResponseTimeMs / 1000).toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fastest</div>
                <div className="text-lg font-bold text-green-400">
                  {(result.analytics.fastestResponseMs / 1000).toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Slowest</div>
                <div className="text-lg font-bold text-amber-400">
                  {(result.analytics.slowestResponseMs / 1000).toFixed(1)}s
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topic Performance */}
        {result.analytics.topicBreakdown.length > 0 && (
          <Card>
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
                        variant={topic.accuracy >= 75 ? "default" : "destructive"}
                        className={`text-xs ${
                          topic.accuracy >= 75
                            ? "bg-green-600/20 text-green-400 border-green-700/30"
                            : topic.accuracy >= 50
                            ? "bg-yellow-600/20 text-yellow-400 border-yellow-700/30"
                            : "bg-red-600/20 text-red-400 border-red-700/30"
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
                      <Badge key={t} variant="outline" className="text-green-400 border-green-700/30 capitalize text-xs">
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
                      <Badge key={t} variant="outline" className="text-red-400 border-red-700/30 capitalize text-xs">
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
        <div className="flex gap-3">
          <Button
            onClick={handlePlayAgain}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold"
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
    </div>
  );
};

export default BattleResultsPage;
