/** @format */

import { useProgress } from "@/contexts/ProgressContext";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Lock } from "lucide-react";
import { useMascot } from "@/contexts/MascotContext";
import Rupi from "@/components/mascot/Rupi";

const Achievements = () => {
  const { progress } = useProgress();
  const { user } = useAuth();

  const unlockedCount = progress.achievements.filter((a) => a.unlocked).length;
  const totalCount = progress.achievements.length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Achievements 🏆</h1>
          <p className="text-muted-foreground">
            Track your progress and unlock rewards
          </p>
          <div className="mt-2">
            <Rupi state={unlockedCount > 0 ? 'proud' : 'encouraging'} size="md" animate />
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">Achievements</h3>
            <p className="text-3xl font-bold">
              {unlockedCount}/{totalCount}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">Total XP</h3>
            <p className="text-3xl font-bold">{user?.xp}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">
              Current Level
            </h3>
            <p className="text-3xl font-bold">{user?.level}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">Next Level</h3>
            <p className="text-3xl font-bold">
              {250 - ((user?.xp || 0) % 250)} XP
            </p>
          </Card>
        </div>

        {/* Level Progress */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Level Progress</h3>
            <span className="text-sm text-muted-foreground">
              {(user?.xp || 0) % 250}/250 XP
            </span>
          </div>
          <Progress
            value={(((user?.xp || 0) % 250) / 250) * 100}
            className="h-3"
          />
        </Card>

        {/* Achievements Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Badges</h2>

          {/* Unlocked Achievements */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-success">
              Earned ({unlockedCount})
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.achievements
                .filter((a) => a.unlocked)
                .map((achievement) => (
                  <Card
                    key={achievement.id}
                    className="p-6 bg-gradient-to-br from-primary/10 to-success/10 border-primary/20 hover-lift animate-bounce-in"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-5xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-bold mb-1">{achievement.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-accent">
                            +{achievement.xpReward} XP
                          </span>
                          {achievement.unlockedAt && (
                            <span className="text-xs text-muted-foreground">
                              •{" "}
                              {new Date(
                                achievement.unlockedAt
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
            {unlockedCount === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  No achievements unlocked yet. Keep learning!
                </p>
              </Card>
            )}
          </div>

          {/* Locked Achievements */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
              Locked ({totalCount - unlockedCount})
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.achievements
                .filter((a) => !a.unlocked)
                .map((achievement) => (
                  <Card
                    key={achievement.id}
                    className="p-6 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-5xl grayscale">
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold">{achievement.name}</h4>
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {achievement.description}
                        </p>

                        {achievement.progress !== undefined &&
                          achievement.total && (
                            <div className="mb-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>
                                  {achievement.progress}/{achievement.total}
                                </span>
                              </div>
                              <Progress
                                value={
                                  (achievement.progress / achievement.total) *
                                  100
                                }
                                className="h-2"
                              />
                            </div>
                          )}

                        <div className="text-sm">
                          <span className="font-semibold text-muted-foreground">
                            Reward: +{achievement.xpReward} XP
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Achievements;
