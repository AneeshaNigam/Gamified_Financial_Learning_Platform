/** @format */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import {
  ClientBattleState,
  initialBattleState,
  BattlePhase,
  MatchFoundPayload,
  BattleStartPayload,
  QuestionPayload,
  ScoreUpdatePayload,
  TimerSyncPayload,
  BattleEndPayload,
  QueueStatusPayload,
  RoomUpdatePayload,
  BattleStateSyncPayload,
  AnswerAckPayload,
} from "@/features/battle/types/battle.types";

/* ── Actions ── */

type BattleAction =
  | { type: "SET_PHASE"; phase: BattlePhase }
  | { type: "QUEUE_STATUS"; payload: QueueStatusPayload }
  | { type: "MATCH_FOUND"; payload: MatchFoundPayload }
  | { type: "BATTLE_START"; payload: BattleStartPayload }
  | { type: "QUESTION_RECEIVED"; payload: QuestionPayload }
  | { type: "ANSWER_SELECTED"; optionId: string }
  | { type: "ANSWER_LOCKED" }
  | { type: "SCORE_UPDATE"; payload: ScoreUpdatePayload }
  | { type: "TIMER_SYNC"; remaining: number }
  | { type: "BATTLE_END"; payload: BattleEndPayload }
  | { type: "ROOM_CREATED"; code: string; roomId: string }
  | { type: "ROOM_UPDATE"; payload: RoomUpdatePayload }
  | { type: "STATE_SYNC"; payload: BattleStateSyncPayload }
  | { type: "RESET" };

/* ── Reducer ── */

function battleReducer(
  state: ClientBattleState,
  action: BattleAction
): ClientBattleState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "QUEUE_STATUS":
      return {
        ...state,
        phase: action.payload.inQueue ? "queuing" : state.phase,
        queuePosition: action.payload.position,
        queueEstimate: action.payload.estimatedWaitSeconds,
      };

    case "MATCH_FOUND":
      return {
        ...state,
        phase: "match_found",
        roomId: action.payload.roomId,
        battleId: action.payload.battleId,
        opponent: action.payload.opponent,
      };

    case "BATTLE_START":
      return {
        ...state,
        phase: "countdown",
        battleId: action.payload.battleId,
        roomId: action.payload.roomId,
        config: action.payload.config,
        opponent: action.payload.opponent,
        myScore: 0,
        opponentScore: 0,
      };

    case "QUESTION_RECEIVED":
      return {
        ...state,
        phase: "in_battle",
        currentQuestion: action.payload,
        timeRemaining: action.payload.timeLimit,
        selectedAnswer: null,
        answerLocked: false,
        lastResult: null,
      };

    case "ANSWER_SELECTED":
      if (state.answerLocked) return state;
      return { ...state, selectedAnswer: action.optionId };

    case "ANSWER_LOCKED":
      return { ...state, answerLocked: true };

    case "SCORE_UPDATE": {
      const myUserId = localStorage.getItem("userId");
      const myScoreEntry = action.payload.scores.find(
        (s) => s.userId === myUserId
      );
      const opponentScoreEntry = action.payload.scores.find(
        (s) => s.userId !== myUserId
      );
      return {
        ...state,
        phase: "reviewing_answer",
        lastResult: action.payload,
        myScore: myScoreEntry?.score ?? state.myScore,
        opponentScore: opponentScoreEntry?.score ?? state.opponentScore,
      };
    }

    case "TIMER_SYNC":
      return { ...state, timeRemaining: action.remaining };

    case "BATTLE_END":
      return {
        ...state,
        phase: "battle_end",
        battleResult: action.payload,
      };

    case "ROOM_CREATED":
      return {
        ...state,
        phase: "room_lobby",
        roomCode: action.code,
        roomId: action.roomId,
      };

    case "ROOM_UPDATE":
      return {
        ...state,
        roomId: action.payload.roomId,
        roomPlayers: action.payload.players,
        roomCode: action.payload.code,
      };

    case "STATE_SYNC": {
      const p = action.payload;
      const myUserId = localStorage.getItem("userId");
      const myScore = p.scores.find((s) => s.userId === myUserId)?.score ?? 0;
      const oppScore = p.scores.find((s) => s.userId !== myUserId)?.score ?? 0;
      return {
        ...state,
        phase: p.currentQuestion ? "in_battle" : state.phase,
        battleId: p.battleId,
        roomId: p.roomId,
        myScore: myScore,
        opponentScore: oppScore,
        timeRemaining: p.timeRemaining,
        currentQuestion: p.currentQuestion
          ? {
              index: p.currentQuestion.index,
              questionText: p.currentQuestion.questionText,
              options: p.currentQuestion.options,
              timeLimit: p.currentQuestion.timeLimit,
              serverTimestamp: p.serverTimestamp,
              totalQuestions: 0,
            }
          : state.currentQuestion,
        answerLocked: p.currentQuestion?.alreadyAnswered ?? false,
      };
    }

    case "RESET":
      return { ...initialBattleState };

    default:
      return state;
  }
}

/* ── Context ── */

interface BattleContextType {
  state: ClientBattleState;
  joinQueue: (mode?: "quick_match" | "ranked") => void;
  leaveQueue: () => void;
  createRoom: (config?: any) => void;
  joinRoom: (code: string) => void;
  setReady: () => void;
  leaveRoom: () => void;
  selectAnswer: (optionId: string) => void;
  submitAnswer: () => void;
  forfeit: () => void;
  reset: () => void;
}

const BattleContext = createContext<BattleContextType | null>(null);

export function BattleProvider({ children }: { children: ReactNode }) {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const [state, dispatch] = useReducer(battleReducer, initialBattleState);

  /* ── Socket Event Listeners ── */

  useEffect(() => {
    if (!socket || !connected) return;

    // Store userId for score lookups
    if (user?._id) localStorage.setItem("userId", user._id);

    const handlers: Record<string, (...args: any[]) => void> = {
      queue_status: (payload: QueueStatusPayload) =>
        dispatch({ type: "QUEUE_STATUS", payload }),

      match_found: (payload: MatchFoundPayload) => {
        dispatch({ type: "MATCH_FOUND", payload });
        // Auto-confirm readiness
        socket.emit("battle_ready", { roomId: payload.roomId });
      },

      battle_start: (payload: BattleStartPayload) =>
        dispatch({ type: "BATTLE_START", payload }),

      question_send: (payload: QuestionPayload) =>
        dispatch({ type: "QUESTION_RECEIVED", payload }),

      answer_ack: (_payload: AnswerAckPayload) => {
        // Answer was accepted — lock it
        dispatch({ type: "ANSWER_LOCKED" });
      },

      score_update: (payload: ScoreUpdatePayload) =>
        dispatch({ type: "SCORE_UPDATE", payload }),

      timer_sync: (payload: TimerSyncPayload) =>
        dispatch({ type: "TIMER_SYNC", remaining: payload.remaining }),

      battle_end: (payload: BattleEndPayload) =>
        dispatch({ type: "BATTLE_END", payload }),

      battle_state_sync: (payload: BattleStateSyncPayload) =>
        dispatch({ type: "STATE_SYNC", payload }),

      room_created: (payload: { roomCode: string; roomId: string }) =>
        dispatch({ type: "ROOM_CREATED", code: payload.roomCode, roomId: payload.roomId }),

      room_joined: (payload: RoomUpdatePayload) =>
        dispatch({ type: "ROOM_UPDATE", payload }),

      room_update: (payload: RoomUpdatePayload) =>
        dispatch({ type: "ROOM_UPDATE", payload }),

      queue_timeout: () => {
        dispatch({ type: "RESET" });
      },

      queue_error: (payload: { message: string }) => {
        console.error("Queue error:", payload.message);
        dispatch({ type: "SET_PHASE", phase: "idle" });
      },

      room_error: (payload: { message: string }) => {
        console.error("Room error:", payload.message);
      },

      opponent_disconnect: () => {
        // Show notification — don't change phase
      },

      opponent_reconnect: () => {
        // Show notification
      },
    };

    // Register all handlers
    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }

    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler);
      }
    };
  }, [socket, connected, user]);

  /* ── Actions ── */

  const joinQueue = useCallback(
    (mode: "quick_match" | "ranked" = "quick_match") => {
      if (!socket?.connected) return;
      dispatch({ type: "SET_PHASE", phase: "queuing" });
      socket.emit("join_queue", { mode });
    },
    [socket]
  );

  const leaveQueue = useCallback(() => {
    if (!socket?.connected) return;
    socket.emit("leave_queue");
    dispatch({ type: "RESET" });
  }, [socket]);

  const createRoom = useCallback(
    (config?: any) => {
      if (!socket?.connected) return;
      socket.emit("create_room", { config });
    },
    [socket]
  );

  const joinRoom = useCallback(
    (code: string) => {
      if (!socket?.connected) return;
      dispatch({ type: "SET_PHASE", phase: "room_waiting" });
      socket.emit("join_room", { code });
    },
    [socket]
  );

  const setReady = useCallback(() => {
    if (!socket?.connected || !state.roomId) return;
    socket.emit("player_ready", { roomId: state.roomId });
  }, [socket, state.roomId]);

  const leaveRoom = useCallback(() => {
    if (!socket?.connected || !state.roomId) return;
    socket.emit("leave_room", { roomId: state.roomId });
    dispatch({ type: "RESET" });
  }, [socket, state.roomId]);

  const selectAnswer = useCallback(
    (optionId: string) => {
      dispatch({ type: "ANSWER_SELECTED", optionId });
    },
    []
  );

  const submitAnswer = useCallback(() => {
    if (!socket?.connected || !state.roomId || !state.currentQuestion || state.answerLocked)
      return;
    if (!state.selectedAnswer) return;

    socket.emit("answer_submit", {
      roomId: state.roomId,
      questionIndex: state.currentQuestion.index,
      optionId: state.selectedAnswer,
      clientTimestamp: Date.now(),
    });

    dispatch({ type: "ANSWER_LOCKED" });
  }, [socket, state.roomId, state.currentQuestion, state.selectedAnswer, state.answerLocked]);

  const forfeit = useCallback(() => {
    if (!socket?.connected || !state.roomId) return;
    socket.emit("battle_forfeit", { roomId: state.roomId });
  }, [socket, state.roomId]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return (
    <BattleContext.Provider
      value={{
        state,
        joinQueue,
        leaveQueue,
        createRoom,
        joinRoom,
        setReady,
        leaveRoom,
        selectAnswer,
        submitAnswer,
        forfeit,
        reset,
      }}
    >
      {children}
    </BattleContext.Provider>
  );
}

export function useBattle() {
  const context = useContext(BattleContext);
  if (!context) {
    throw new Error("useBattle must be used within <BattleProvider>");
  }
  return context;
}
