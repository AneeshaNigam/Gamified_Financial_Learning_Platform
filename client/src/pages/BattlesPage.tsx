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
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const BattlesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected } = useSocket();
  const { state, joinQueue, leaveQueue: _, createRoom, joinRoom, setReady, leaveRoom, reset } = useBattle();
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
    if (result === "win") return "text-green-400";
    if (result === "loss") return "text-red-400";
    return "text-yellow-400";
  };

  const eloColor = (change: number) => {
    if (change > 0) return "text-green-400";
    if (change < 0) return "text-red-400";
    return "text-gray-400";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              Quiz Battles
            </h1>
            <p className="text-muted-foreground mt-1">
              Challenge others, climb the ranks, and prove your financial knowledge
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
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
                <Card className="bg-gradient-to-br from-blue-950/50 to-blue-900/30 border-blue-800/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400">{analytics.eloRating}</div>
                    <div className="text-xs text-muted-foreground mt-1">ELO Rating</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-950/50 to-green-900/30 border-green-800/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-green-400">{analytics.wins}</div>
                    <div className="text-xs text-muted-foreground mt-1">Wins</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-950/50 to-purple-900/30 border-purple-800/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">{analytics.winRate}%</div>
                    <div className="text-xs text-muted-foreground mt-1">Win Rate</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-950/50 to-orange-900/30 border-orange-800/30">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-orange-400">{analytics.bestWinStreak}</div>
                    <div className="text-xs text-muted-foreground mt-1">Best Streak</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Battle Modes */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Match */}
              <Card className="bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border-indigo-700/30 overflow-hidden relative group hover:border-indigo-500/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-3xl">⚡</span>
                    <div>
                      <div className="text-xl">Quick Match</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        Auto-matched with players at your skill level
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
                  {state.phase === "queuing" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                        <span className="text-sm text-indigo-300">
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
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold"
                      size="lg"
                    >
                      Find Match
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Ranked */}
              <Card className="bg-gradient-to-br from-amber-950/60 to-red-950/40 border-amber-700/30 overflow-hidden relative group hover:border-amber-500/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="text-3xl">🏅</span>
                    <div>
                      <div className="text-xl">Ranked Battle</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        Compete for ELO rating and climb the leaderboard
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
                  {state.phase === "queuing" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                        <span className="text-sm text-amber-300">
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
                      className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-semibold"
                      size="lg"
                    >
                      Join Ranked
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Private Room */}
            <Card className="bg-gradient-to-br from-teal-950/60 to-emerald-950/40 border-teal-700/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-3xl">🏠</span>
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
                    className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white"
                  >
                    Create Room
                  </Button>
                  <Button
                    onClick={() => setShowJoinDialog(true)}
                    disabled={!connected || state.phase !== "idle"}
                    variant="outline"
                    className="flex-1 border-teal-700 hover:bg-teal-900/30"
                  >
                    Join with Code
                  </Button>
                </div>

                {/* Room Code Display */}
                {state.roomCode && (state.phase === "room_lobby" || state.phase === "room_waiting") && (
                  <div className="mt-4 p-4 rounded-lg bg-teal-950/50 border border-teal-800/30 text-center">
                    <div className="text-sm text-muted-foreground mb-2">Share this code:</div>
                    <div className="text-4xl font-mono font-bold tracking-widest text-teal-300">
                      {state.roomCode}
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      {state.roomPlayers.length < 2 ? "Waiting for opponent to join..." : "Opponent joined! Click Ready to start."}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {state.roomPlayers.map((p) => (
                        <Badge
                          key={p.userId}
                          variant={p.isReady ? "default" : "outline"}
                          className={p.isReady ? "bg-green-600" : ""}
                        >
                          {p.name} {p.isReady ? "✓" : "..."}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="mt-6 flex gap-3">
                      <Button
                        onClick={() => setReady()}
                        className="flex-1 bg-green-600 hover:bg-green-500 font-bold"
                        disabled={state.roomPlayers.find(p => p.userId === user?._id)?.isReady}
                      >
                        {state.roomPlayers.find(p => p.userId === user?._id)?.isReady ? "Waiting..." : "I'm Ready!"}
                      </Button>
                      <Button
                        onClick={() => leaveRoom()}
                        variant="outline"
                        className="flex-none border-red-900/50 hover:bg-red-950/50 hover:text-red-400"
                      >
                        Leave Room
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Form */}
            {analytics && analytics.recentForm.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Form</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {analytics.recentForm.map((result, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold ${
                          result === "W"
                            ? "bg-green-600/20 text-green-400 border border-green-700/30"
                            : result === "L"
                            ? "bg-red-600/20 text-red-400 border border-red-700/30"
                            : "bg-yellow-600/20 text-yellow-400 border border-yellow-700/30"
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
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <span className="text-4xl block mb-3">⚔️</span>
                  No battles yet. Start your first one!
                </CardContent>
              </Card>
            ) : (
              history.map((battle, i) => (
                <Card
                  key={i}
                  className="hover:bg-accent/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/battle/${battle.battleId}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`text-2xl font-bold ${resultColor(battle.result)}`}
                        >
                          {battle.result === "win" ? "W" : battle.result === "loss" ? "L" : "D"}
                        </div>
                        <div>
                          <div className="font-medium">vs {battle.opponentName}</div>
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
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{analytics.totalBattles}</div>
                      <div className="text-xs text-muted-foreground">Total Battles</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">{analytics.winRate}%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">{analytics.averageAccuracy}%</div>
                      <div className="text-xs text-muted-foreground">Avg Accuracy</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{analytics.averageResponseTimeMs}ms</div>
                      <div className="text-xs text-muted-foreground">Avg Response</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400">{analytics.totalXpEarned}</div>
                      <div className="text-xs text-muted-foreground">Total XP Earned</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-amber-400">{analytics.winStreak}</div>
                      <div className="text-xs text-muted-foreground">Current Streak</div>
                    </CardContent>
                  </Card>
                </div>

                {/* W/L Bar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Win / Loss Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1 h-6 rounded-full overflow-hidden">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${analytics.totalBattles > 0 ? (analytics.wins / analytics.totalBattles) * 100 : 0}%` }}
                      />
                      <div
                        className="bg-yellow-500 transition-all"
                        style={{ width: `${analytics.totalBattles > 0 ? (analytics.draws / analytics.totalBattles) * 100 : 0}%` }}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${analytics.totalBattles > 0 ? (analytics.losses / analytics.totalBattles) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span className="text-green-400">Wins: {analytics.wins}</span>
                      <span className="text-yellow-400">Draws: {analytics.draws}</span>
                      <span className="text-red-400">Losses: {analytics.losses}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Topic Breakdown */}
                {analytics.topicBreakdown.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Topic Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analytics.topicBreakdown.map((topic) => (
                        <div key={topic.topic}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{topic.topic}</span>
                            <span className={topic.accuracy >= 75 ? "text-green-400" : topic.accuracy < 50 ? "text-red-400" : "text-yellow-400"}>
                              {topic.accuracy}%
                            </span>
                          </div>
                          <Progress value={topic.accuracy} className="h-2" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <span className="text-4xl block mb-3">📊</span>
                  Play some battles to see your stats!
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── RANKINGS TAB ── */}
          <TabsContent value="rankings" className="space-y-4">
            {leaderboard.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <span className="text-4xl block mb-3">🏆</span>
                  No ranked players yet. Be the first!
                </CardContent>
              </Card>
            ) : (
              leaderboard.map((entry) => (
                <Card
                  key={entry.rank}
                  className={`${
                    entry.rank <= 3 ? "border-amber-700/40 bg-amber-950/20" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`text-2xl font-bold w-10 text-center ${
                            entry.rank === 1
                              ? "text-amber-400"
                              : entry.rank === 2
                              ? "text-gray-300"
                              : entry.rank === 3
                              ? "text-amber-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          {entry.rank <= 3
                            ? ["🥇", "🥈", "🥉"][entry.rank - 1]
                            : `#${entry.rank}`}
                        </div>
                        <div>
                          <div className="font-medium">{entry.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Level {entry.level} | {entry.wins}W - {entry.losses}L ({entry.winRate}%)
                          </div>
                        </div>
                      </div>
                      <div className="text-xl font-bold text-blue-400">{entry.eloRating}</div>
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
