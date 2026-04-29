import { useRef, useEffect, useState } from 'react';
import type { GameMessage } from '../../store/gameStore';

interface Props {
  messages: GameMessage[];
  myRole: string;
  onSendArgument: (text: string) => void;
  currentTurn: string;
  isMyTurn: boolean;
}

const roleLabel: Record<string, string> = {
  prosecutor: 'SAVCI',
  defense: 'AVUKAT',
  witness: 'TANIK',
  system: 'SİSTEM',
  ai_verdict: '⚖️ HAKİM',
};

export default function ChatBox({ messages, myRole, onSendArgument, isMyTurn }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSendArgument(text);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.map((msg, i) => {
          if (!['argument', 'objection', 'ai_verdict', 'system', 'chat'].includes(msg.type)) return null;

          const msgRole = msg.type === 'ai_verdict' ? 'ai_verdict'
            : msg.type === 'objection' ? 'objection'
            : msg.type === 'system' ? 'system'
            : (msg.user_id === myRole ? myRole : 'prosecutor'); // simplified

          return (
            <div key={i} className={`chat-msg ${msgRole === 'ai_verdict' ? 'system' : msgRole}`}>
              <div className="chat-msg-role">
                {msg.type === 'ai_verdict' ? '⚖️ HAKİM KARARI'
                  : msg.type === 'objection' ? '✋ İTİRAZ!'
                  : roleLabel[msgRole] || msgRole}
              </div>
              {msg.type === 'ai_verdict'
                ? msg.reasoning
                : msg.content || ''}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          id="argument-input"
          className="form-input"
          placeholder={isMyTurn ? 'Argümanınızı yazın...' : 'Rakibinizin sırası...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={!isMyTurn}
        />
        <button
          id="send-argument-btn"
          className="btn btn-gold"
          onClick={handleSend}
          disabled={!isMyTurn || !input.trim()}
          style={{ alignSelf: 'flex-end', padding: '0.6rem 1.25rem' }}
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
