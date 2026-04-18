import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { toast } from "sonner";
import api from "@/services/api";
import { useAuth } from "./AuthContext";

/* ── Types ── */
interface QuizScore {
  quizId: string;
  score: number;
  total: number;
  timeSpent: number;
  date: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  total?: number;
}

interface ProgressData {
  currentModule: number;
  completedModules: number[];
  completedLessons: string[];
  quizScores: QuizScore[];
  achievements: Achievement[];
  // Behavior tracking (adaptive engine)
  totalXP?: number;
  accuracy?: number;
  averageResponseTime?: number;
  topicStats?: Record<string, { correct: number; wrong: number }>;
}

interface ProgressContextType {
  progress: ProgressData;
  completeLesson: (moduleId: number, lessonId: string) => Promise<void>;
  completeQuiz: (
    quizId: string,
    score: number,
    total: number,
    timeSpent: number
  ) => Promise<void>;
  checkAchievements: () => Promise<void>;
  getModuleProgress: (moduleId: number) => number;
  isLessonUnlocked: (moduleId: number, lessonId: string) => boolean;
  refreshProgress: () => Promise<void>;
}

const defaultProgress: ProgressData = {
  currentModule: 1,
  completedModules: [],
  completedLessons: [],
  quizScores: [],
  achievements: [],
};

const ProgressContext = createContext<ProgressContextType | undefined>(
  undefined
);

/* ── Provider ── */
export const ProgressProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressData>(defaultProgress);

  const refreshProgress = useCallback(async () => {
    try {
      const data = await api.get<ProgressData>("/learning/progress");
      setProgress(data);
    } catch {
      /* not logged in */
    }
  }, []);

  const loadAchievements = useCallback(async () => {
    try {
      const data = await api.get<Achievement[]>("/achievements");
      setProgress((prev) => ({ ...prev, achievements: data }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshProgress();
      loadAchievements();
    }
  }, [user, refreshProgress, loadAchievements]);

  const completeLesson = async (moduleId: number, lessonId: string) => {
    try {
      const result = await api.post<{ progress: ProgressData; xpEarned: number; moneyEarned: number }>(
        `/learning/lessons/${moduleId}/${lessonId}/complete`
      );
      if (result.progress) {
        setProgress(result.progress);
      } else {
        await refreshProgress();
      }
      toast.success(`Lesson complete! +${result.xpEarned || 50} XP`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to complete lesson");
    }
  };

  const completeQuiz = async (
    quizId: string,
    _score: number,
    _total: number,
    timeSpent: number
  ) => {
    try {
      /* quizId format: "quiz-1", extract moduleId */
      const moduleId = parseInt(quizId.split("-")[1], 10);
      const result = await api.post<{
        score: number;
        total: number;
        percentage: number;
        xpEarned: number;
        moneyEarned: number;
        passed: boolean;
      }>(`/learning/quizzes/${moduleId}/submit`, {
        answers: [], /* the server will score based on submitted answers */
        timeSpent,
      });

      await refreshProgress();
      await loadAchievements();

      toast.success(
        `Quiz submitted! Score: ${result.score}/${result.total} (+${result.xpEarned} XP)`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit quiz");
    }
  };

  const checkAchievements = async () => {
    try {
      const data = await api.post<Achievement[]>("/achievements/check");
      setProgress((prev) => ({ ...prev, achievements: data }));
    } catch {
      /* ignore */
    }
  };

  const getModuleProgress = (moduleId: number): number => {
    const moduleLessons = progress.completedLessons.filter((l) =>
      l.startsWith(`${moduleId}.`)
    );
    return (moduleLessons.length / 3) * 100; /* 3 lessons per module */
  };

  const isLessonUnlocked = (moduleId: number, lessonId: string): boolean => {
    if (moduleId === 1 && lessonId === "1") return true;

    const previousLesson = parseInt(lessonId) - 1;
    if (previousLesson > 0) {
      return progress.completedLessons.includes(
        `${moduleId}.${previousLesson}`
      );
    }

    return progress.completedModules.includes(moduleId - 1);
  };

  return (
    <ProgressContext.Provider
      value={{
        progress,
        completeLesson,
        completeQuiz,
        checkAchievements,
        getModuleProgress,
        isLessonUnlocked,
        refreshProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context)
    throw new Error("useProgress must be used within ProgressProvider");
  return context;
};
