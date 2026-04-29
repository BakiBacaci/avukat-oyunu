import { useState } from 'react';

interface Props {
  onObjection: (reason?: string) => void;
  disabled?: boolean;
}

export default function ObjectionButton({ onObjection, disabled }: Props) {
  const [fired, setFired] = useState(false);

  const handleClick = () => {
    if (disabled || fired) return;
    setFired(true);
    onObjection('İtiraz!');
    setTimeout(() => setFired(false), 3000); // 3 sn cooldown
  };

  return (
    <button
      id="objection-btn"
      className="btn btn-danger"
      onClick={handleClick}
      disabled={disabled || fired}
      style={{
        opacity: fired ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {fired ? '⏳ Bekleniyor...' : '✋ İTİRAZ!'}
      {fired && (
        <span
          style={{
            position: 'absolute',
            bottom: 0, left: 0,
            height: '3px',
            background: 'rgba(255,255,255,0.4)',
            animation: 'cooldown 3s linear forwards',
          }}
        />
      )}
      <style>{`
        @keyframes cooldown {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </button>
  );
}
