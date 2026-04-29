import { create } from 'zustand';

export interface GameMessage {
  type: string;
  user_id?: string;
  content?: string;
  reasoning?: string;
  prosecutor_score?: number;
  defense_score?: number;
  advantage?: string;
  judge_hp?: number;
  judge_hp_delta?: number;
  match_finished?: boolean;
  winner_role?: string;
  current_turn?: string;
  evidence_id?: string;
}

interface GameState {
  matchId: string | null;
  lobbyCode: string | null;
  myRole: string | null;
  judgeHp: number;
  currentTurn: string;
  matchStatus: string;
  messages: GameMessage[];
  caseInfo: { title: string; description: string } | null;
  lastVerdict: GameMessage | null;

  setMatch: (matchId: string, lobbyCode: string, role: string) => void;
  setCase: (info: { title: string; description: string }) => void;
  addMessage: (msg: GameMessage) => void;
  setJudgeHp: (hp: number) => void;
  setCurrentTurn: (turn: string) => void;
  setMatchStatus: (status: string) => void;
  setLastVerdict: (verdict: GameMessage) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  matchId: null,
  lobbyCode: null,
  myRole: null,
  judgeHp: 100,
  currentTurn: 'prosecutor',
  matchStatus: 'waiting',
  messages: [],
  caseInfo: null,
  lastVerdict: null,

  setMatch: (matchId, lobbyCode, role) => set({ matchId, lobbyCode, myRole: role }),
  setCase: (info) => set({ caseInfo: info }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setJudgeHp: (hp) => set({ judgeHp: hp }),
  setCurrentTurn: (turn) => set({ currentTurn: turn }),
  setMatchStatus: (status) => set({ matchStatus: status }),
  setLastVerdict: (verdict) => set({ lastVerdict: verdict }),
  resetGame: () =>
    set({
      matchId: null, lobbyCode: null, myRole: null,
      judgeHp: 100, currentTurn: 'prosecutor', matchStatus: 'waiting',
      messages: [], caseInfo: null, lastVerdict: null,
    }),
}));
