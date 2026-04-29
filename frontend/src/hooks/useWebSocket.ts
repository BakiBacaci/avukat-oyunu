import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { WS_URL } from '../services/api';

export function useWebSocket(matchId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const { user } = useAuthStore();
  const {
    addMessage, setJudgeHp, setCurrentTurn,
    setMatchStatus, setLastVerdict, setCase,
  } = useGameStore();

  useEffect(() => {
    if (!matchId || !user) return;

    const socket = new WebSocket(`${WS_URL}/ws/${matchId}/${user.id}`);
    ws.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addMessage(data);

      switch (data.type) {
        case 'state_sync':
          setJudgeHp(data.judge_hp);
          setCurrentTurn(data.current_turn);
          setMatchStatus(data.status);
          if (data.case) setCase(data.case);
          break;
        case 'game_started':
          setMatchStatus('active');
          if (data.case) setCase(data.case);
          break;
        case 'ai_verdict':
          setJudgeHp(data.judge_hp);
          setLastVerdict(data);
          if (data.match_finished) setMatchStatus('finished');
          break;
        case 'turn_change':
          setCurrentTurn(data.current_turn);
          break;
        case 'game_over':
          setMatchStatus('finished');
          break;
        case 'ai_evaluating':
          // Optionally add a state for 'AI is evaluating' if we want a UI spinner
          break;
      }
    };

    socket.onerror = () => console.error('[WS] Bağlantı hatası');
    socket.onclose = () => console.log('[WS] Bağlantı kapandı');

    return () => socket.close();
  }, [matchId, user]);

  const send = useCallback((message: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const sendArgument = useCallback((content: string) => {
    send({ type: 'argument', content });
  }, [send]);

  const sendObjection = useCallback((reason?: string) => {
    send({ type: 'objection', reason: reason || '' });
  }, [send]);

  const sendEvidence = useCallback((evidenceId: string, description: string) => {
    send({ type: 'evidence', evidence_id: evidenceId, description });
  }, [send]);

  const sendChat = useCallback((content: string) => {
    send({ type: 'chat', content });
  }, [send]);

  const sendEndTurn = useCallback(() => {
    send({ type: 'end_turn' });
  }, [send]);

  return { sendArgument, sendObjection, sendEvidence, sendChat, sendEndTurn };
}
