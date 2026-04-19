/** @format */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useBattle } from "@/contexts/BattleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import {
  fetchBattleHistory,
  fetchBattleAnalytics,
  fetchBattleLeaderboard,
} from "@/features/battle/services/battle.api";
import {
  BattleHistoryItem,
  BattleAnalytics,
  BattleLeaderboardEntry,
} from "@/features/battle/types/battle.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Swords, Zap, Trophy, Clock, Target, TrendingUp } from "lucide-react";

const BattlesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected } = useSocket();
  const { state, joinQueue, leaveQueue, createRoom, joinRoom, setReady, leaveRoom, reset } = useBattle();

  const [history, setHistory] = useState<BattleHistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<BattleAnalytics | null>(null);
  const [leaderboard, setLeaderboard] = useState<BattleLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("play");

  useEffect(() => {
    loadData();
  }, []);

  // Navigate to arena when battle starts
  useEffect(() => {
    if (state.phase === "match_found" || state.phase === "countdown" || state.phase === "in_battle") {
      navigate("/battle/arena");
    }
    if (state.phase === "battle_end") {
      navigate("/battle/results");
    }
  }, [state.phase, navigate]);

  async function loadData() {
    setLoading(true);
    try {
      const [historyData, analyticsData, leaderboardData] = await Promise.allSettled([
        fetchBattleHistory(1, 5),
        fetchBattleAnalytics(),
        fetchBattleLeaderboard(10),
      ]);

      if (historyData.status === "fulfilled") setHistory(historyData.value.battles);
      if (analyticsData.status === "fulfilled") setAnalytics(analyticsData.value);
      if (leaderboardData.status === "fulfilled") setLeaderboard(leaderboardData.value);
    } catch (err) {
      console.error("Failed to load battle data:", err);
    }
    setLoading(false);
  }

  function handleJoinRoom() {
    if (roomCode.trim().length === 6) {
      joinRoom(roomCode.trim().toUpperCase());
      setShowJoinDialog(false);
      setRoomCode("");
    }
  }

  const resultColor = (result: string) => {
    if (result === "win") return "text-success";
    if (result === "loss") return "text-destructive";
    return "text-primary";
  };

  const eloColor = (change: number) => {
    if (change > 0) return "text-success";
    if (change < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Quiz Battles ⚔️</h1>
            <p className="text-muted-foreground">
              Challenge others, climb the ranks, and prove your financial knowledge
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-success animate-pulse-soft" : "bg-destructive"}`} />
            <span className="text-sm text-muted-foreground">
              {connected ? "Connected" : "Offline"}
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="play">⚔️ Play</TabsTrigger>
            <TabsTrigger value="history">📜 History</TabsTrigger>
            <TabsTrigger value="stats">📊 Stats</TabsTrigger>
            <TabsTrigger value="rankings">🏆 Rankings</TabsTrigger>
          </TabsList>

          {/* ── PLAY TAB ── */}
          <TabsContent value="play" className="space-y-6">
            {/* Stats Summary */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 hover-lift glass-light">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">ELO Rating</span>
                    <TrendingUp className="h-4 w-4 text-primary animate-pulse-soft" />
                  </div>
                  <p className="text-3xl font-bold text-primary">{analytics.eloRating}</p>
                </Card>
                <Card className="p-4 hover-lift glass-light">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Wins</span>
                    <Trophy className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-3xl font-bold text-success">{analytics.wins}</p>
                </Card>
                <Card className="p-4 hover-lift glass-light">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <Target className="h-4 w-4 text-secondary" />
                  </div>
                  <p className="text-3xl font-bold text-secondary">{analytics.winRate}%</p>
                </Card>
                <Card className="p-4 hover-lift glass-light">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Best Streak</span>
                    <span className="text-lg animate-fire">🔥</span>
                  </div>
                  <p className="text-3xl font-bold">{analytics.bestWinStreak}</p>
                </Card>
              </div>
            )}

            {/* Battle Modes */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Match */}
              <Card className="overflow-hidden hover-lift glass-medium group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-xl">Quick Match</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        Auto-matched at your skill level
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>🎯 10 Questions</span>
                    <span>⏱️ 15s each</span>
                    <span>📊 ELO-based</span>
                  </div>
                  {state.phase === "queuing" && state.queueMode === "quick_match" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span className="text-sm text-primary">
                          Finding opponent... ({state.queueEstimate}s est.)
                        </span>
                      </div>
                      <Button onClick={leaveQueue} variant="outline" className="w-full" size="sm">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => joinQueue("quick_match")}
                      disabled={!connected || state.phase !== "idle"}
                      className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold"
                      size="lg"
                    >
                      Find Match
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Ranked */}
              <Card className="overflow-hidden hover-lift glass-medium group">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-secondary flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-xl">Ranked Battle</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        Compete for ELO and climb the leaderboard
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>🎯 10 Questions</span>
                    <span>⏱️ 15s each</span>
                    <span>⚡ Ranked</span>
                  </div>
                  {state.phase === "queuing" && state.queueMode === "ranked" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
                        <span className="text-sm text-secondary">
                          Matching rank... ({state.queueEstimate}s est.)
                        </span>
                      </div>
                      <Button onClick={leaveQueue} variant="outline" className="w-full" size="sm">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => joinQueue("ranked")}
                      disabled={!connected || state.phase !== "idle"}
                      className="w-full bg-gradient-secondary hover:opacity-90 text-white font-semibold"
                      size="lg"
                    >
                      Join Ranked
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Private Room */}
            <Card className="glass-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center">
                    <Swords className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xl">Private Room</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      Create a room and invite a friend with a code
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    onClick={() => createRoom()}
                    disabled={!connected || state.phase !== "idle"}
                    className="flex-1 bg-gradient-accent hover:opacity-90 text-white dark:text-foreground font-semibold"
                  >
                    Create Room
                  </Button>
                  <Button
                    onClick={() => setShowJoinDialog(true)}
                    disabled={!connected || state.phase !== "idle"}
                    variant="outline"
                    className="flex-1"
                  >
                    Join with Code
                  </Button>
                </div>

                {/* Room Lobby */}
                {state.roomCode && (state.phase === "room_lobby" || state.phase === "room_waiting") && (
                  <div className="mt-4 p-5 rounded-xl bg-primary/5 border border-primary/20 text-center animate-scale-in">
                    <div className="text-sm text-muted-foreground mb-2">Share this code:</div>
                    <div className="text-4xl font-mono font-bold tracking-widest text-primary">
                      {state.roomCode}
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      {state.roomPlayers.length < 2
                        ? "Waiting for opponent to join..."
                        : "Opponent joined! Click Ready to start."}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {state.roomPlayers.map((p) => (
                        <Badge
                          key={p.userId}
                          variant={p.isReady ? "default" : "outline"}
                          className={p.isReady ? "bg-success text-success-foreground" : ""}
                        >
                          {p.name} {p.isReady ? "✓" : "..."}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-6 flex gap-3">
                      <Button
                        onClick={() => setReady()}
                        className="flex-1 bg-success hover:bg-success/90 text-success-foreground font-bold"
                        disabled={state.roomPlayers.find((p) => p.userId === user?._id)?.isReady}
                      >
                        {state.roomPlayers.find((p) => p.userId === user?._id)?.isReady
                          ? "Waiting..."
                          : "I'm Ready!"}
                      </Button>
                      <Button
                        onClick={() => leaveRoom()}
                        variant="outline"
                        className="flex-none border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                      >
                        Leave
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Form */}
            {analytics && analytics.recentForm.length > 0 && (
              <Card className="glass-light">
                <CardHeader>
                  <CardTitle className="text-sm">Recent Form</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {analytics.recentForm.map((result, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold border ${
                          result === "W"
                            ? "bg-success/10 text-success border-success/30"
                            : result === "L"
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-primary/10 text-primary border-primary/30"
                        }`}
                      >
                        {result}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── HISTORY TAB ── */}
          <TabsContent value="history" className="space-y-4">
            {history.length === 0 ? (
              <Card className="p-12 text-center">
                <Swords className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-bold mb-2">No Battles Yet</h3>
                <p className="text-muted-foreground">
                  Start your first battle to see your history here!
                </p>
              </Card>
            ) : (
              history.map((battle, i) => (
                <Card
                  key={i}
                  className="hover-lift cursor-pointer"
                  onClick={() => navigate(`/battle/${battle.battleId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${
                            battle.result === "win"
                              ? "bg-success/10 text-success"
                              : battle.result === "loss"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {battle.result === "win" ? "W" : battle.result === "loss" ? "L" : "D"}
                        </div>
                        <div>
                          <div className="font-semibold">vs {battle.opponentName}</div>
                          <div className="text-sm text-muted-foreground">
                            {battle.score} - {battle.opponentScore} | {battle.accuracy}% accuracy
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold ${eloColor(battle.eloChange)}`}>
                          {battle.eloChange > 0 ? "+" : ""}
                          {battle.eloChange} ELO
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(battle.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── STATS TAB ── */}
          <TabsContent value="stats" className="space-y-6">
            {analytics ? (
              <>
                {/* Overview Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="p-4 hover-lift">
                    <div className="text-sm text-muted-foreground">Total Battles</div>
                    <div className="text-2xl font-bold mt-1">{analytics.totalBattles}</div>
                  </Card>
                  <Card className="p-4 hover-lift">
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                    <div className="text-2xl font-bold mt-1 text-success">{analytics.winRate}%</div>
                  </Card>
                  <Card className="p-4 hover-lift">
                    <div className="text-sm text-muted-foreground">Avg Accuracy</div>
                    <div className="text-2xl font-bold mt-1 text-primary">{analytics.averageAccuracy}%</div>
                  </Card>
                  <Card className="p-4 hover-lift">
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                    <div className="text-2xl font-bold mt-1">{analytics.averageResponseTimeMs}ms</div>
                  </Card>
                  <Card className="p-4 hover-lift">
                    <div className="text-sm text-muted-foreground">Total XP Earned</div>
                    <div className="text-2xl font-bold mt-1 text-secondary">{analytics.totalXpEarned}</div>
                  </Card>
                  <Card className="p-4 hover-lift">
                    <div className="text-sm text-muted-foreground">Current Streak</div>
                    <div className="text-2xl font-bold mt-1">🔥 {analytics.winStreak}</div>
                  </Card>
                </div>

                {/* W/L Bar */}
                <Card className="p-6">
                  <h3 className="text-sm font-semibold mb-4">Win / Loss Distribution</h3>
                  <div className="flex gap-1 h-6 rounded-full overflow-hidden bg-muted">
                    <div
                      className="bg-success rounded-l-full transition-all"
                      style={{
                        width: `${analytics.totalBattles > 0 ? (analytics.wins / analytics.totalBattles) * 100 : 0}%`,
                      }}
                    />
                    <div
                      className="bg-primary transition-all"
                      style={{
                        width: `${analytics.totalBattles > 0 ? (analytics.draws / analytics.totalBattles) * 100 : 0}%`,
                      }}
                    />
                    <div
                      className="bg-destructive rounded-r-full transition-all"
                      style={{
                        width: `${analytics.totalBattles > 0 ? (analytics.losses / analytics.totalBattles) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span className="text-success">Wins: {analytics.wins}</span>
                    <span className="text-primary">Draws: {analytics.draws}</span>
                    <span className="text-destructive">Losses: {analytics.losses}</span>
                  </div>
                </Card>

                {/* Topic Breakdown */}
                {analytics.topicBreakdown.length > 0 && (
                  <Card className="p-6">
                    <h3 className="text-sm font-semibold mb-4">Topic Performance</h3>
                    <div className="space-y-3">
                      {analytics.topicBreakdown.map((topic) => (
                        <div key={topic.topic}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{topic.topic}</span>
                            <span
                              className={
                                topic.accuracy >= 75
                                  ? "text-success"
                                  : topic.accuracy < 50
                                  ? "text-destructive"
                                  : "text-primary"
                              }
                            >
                              {topic.accuracy}%
                            </span>
                          </div>
                          <Progress value={topic.accuracy} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-12 text-center">
                <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-bold mb-2">No Stats Yet</h3>
                <p className="text-muted-foreground">Play some battles to see your stats!</p>
              </Card>
            )}
          </TabsContent>

          {/* ── RANKINGS TAB ── */}
          <TabsContent value="rankings" className="space-y-4">
            {leaderboard.length === 0 ? (
              <Card className="p-12 text-center">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-bold mb-2">No Rankings Yet</h3>
                <p className="text-muted-foreground">Be the first to battle and rank up!</p>
              </Card>
            ) : (
              leaderboard.map((entry) => (
                <Card
                  key={entry.rank}
                  className={`hover-lift ${
                    entry.rank <= 3
                      ? "bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold w-10 text-center">
                          {entry.rank <= 3
                            ? ["🥇", "🥈", "🥉"][entry.rank - 1]
                            : `#${entry.rank}`}
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white text-lg font-bold">
                          {entry.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold">{entry.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Level {entry.level} | {entry.wins}W - {entry.losses}L ({entry.winRate}%)
                          </div>
                        </div>
                      </div>
                      <div className="text-xl font-bold text-primary">{entry.eloRating}</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Join Room Dialog */}
        <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Private Room</DialogTitle>
              <DialogDescription>Enter the 6-character room code from your friend</DialogDescription>
            </DialogHeader>
            <Input
              id="room-code-input"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="Enter room code"
              className="text-center text-2xl font-mono tracking-widest uppercase"
              maxLength={6}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleJoinRoom} disabled={roomCode.length !== 6}>
                Join Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default BattlesPage;
