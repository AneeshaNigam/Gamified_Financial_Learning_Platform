/** @format */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { BattleProvider } from "@/contexts/BattleContext";
import Landing from "@/pages/Landing";
import Signup from "@/pages/Signup";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyOtp from "@/pages/VerifyOtp";
import OAuthCallback from "@/pages/OAuthCallback";
import Dashboard from "@/pages/DashboardPage";
import Wallet from "@/pages/WalletPage";
import Learning from "@/pages/LearningPage";
import Lesson from "@/pages/LessonPage";
import Quiz from "@/pages/QuizPage";
import Achievements from "@/pages/AchievementsPage";
import Leaderboard from "@/pages/LeaderboardPage";
import Battles from "@/pages/BattlesPage";
import BattleArena from "@/pages/BattleArenaPage";
import BattleResults from "@/pages/BattleResultsPage";
import Tools from "@/pages/ToolsPage";
import Settings from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="moneymaster-theme">
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <WalletProvider>
                <ProgressProvider>
                  <BattleProvider>
                    <Toaster />
                    <Sonner />
                    <Routes>
                      <Route path="/" element={<Landing />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password/:token" element={<ResetPassword />} />
                      <Route path="/verify-otp" element={<VerifyOtp />} />
                      <Route path="/oauth/callback" element={<OAuthCallback />} />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/wallet"
                        element={
                          <ProtectedRoute>
                            <Wallet />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/learning"
                        element={
                          <ProtectedRoute>
                            <Learning />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/lesson/:moduleId/:lessonId"
                        element={
                          <ProtectedRoute>
                            <Lesson />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/quiz/:moduleId"
                        element={
                          <ProtectedRoute>
                            <Quiz />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/achievements"
                        element={
                          <ProtectedRoute>
                            <Achievements />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/leaderboard"
                        element={
                          <ProtectedRoute>
                            <Leaderboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/battles"
                        element={
                          <ProtectedRoute>
                            <Battles />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/battle/arena"
                        element={
                          <ProtectedRoute>
                            <BattleArena />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/battle/results"
                        element={
                          <ProtectedRoute>
                            <BattleResults />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/tools"
                        element={
                          <ProtectedRoute>
                            <Tools />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/settings"
                        element={
                          <ProtectedRoute>
                            <Settings />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BattleProvider>
                </ProgressProvider>
              </WalletProvider>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
