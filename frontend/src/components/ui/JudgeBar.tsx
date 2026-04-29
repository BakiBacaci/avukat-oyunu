interface Props { hp: number }

export default function JudgeBar({ hp }: Props) {
  const level = hp > 60 ? 'high' : hp > 30 ? 'medium' : 'low';
  return (
    <div className="judge-bar-wrap">
      <div className="judge-bar-label">
        <span>⚖️ Hakim Sabrı</span>
        <span style={{ color: hp <= 30 ? 'var(--red)' : 'var(--gold)' }}>{hp} / 100</span>
      </div>
      <div className="judge-bar-track">
        <div className={`judge-bar-fill ${level}`} style={{ width: `${hp}%` }} />
      </div>
      {hp <= 20 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--red)', textAlign: 'center', marginTop: '0.25rem' }}>
          ⚠️ Hakim sabırsızlanıyor — karar yakın!
        </p>
      )}
    </div>
  );
}
