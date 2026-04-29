import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../services/api';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { matchId, myRole } = useGameStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const startGame = async () => {
    if (!matchId) return;
    setLoading(true);
    try {
      await api.post(`/api/matches/${matchId}/start`);
      navigate(`/game/${matchId}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Başlatılamadı.');
    } finally { setLoading(false); }
  };

  const roleName: Record<string, string> = {
    prosecutor: '⚖️ Savcı',
    defense: '🛡️ Savunma Avukatı',
    witness: '👁️ Tanık',
    judge: '🔨 Hakim',
  };

  return (
    <div className="page">
      <div className="card card-gold" style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>🏛️ Lobi</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Diğer oyuncuların bağlanmasını bekle</p>
        </div>

        {/* Lobby Code */}
        <div style={{
          background: 'var(--bg-raised)', borderRadius: 'var(--radius)',
          padding: '1.25rem', textAlign: 'center', marginBottom: '1.5rem',
          border: '1px dashed var(--border-glow)'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>LOBİ KODU</p>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: '2.5rem', color: 'var(--gold)', letterSpacing: '0.3em' }}>
            {code}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Bu kodu arkadaşlarınla paylaş
          </p>
        </div>

        {/* Player Info */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>SENİN ROLÜN</p>
          <div className={`role-badge ${myRole}`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            {roleName[myRole || 'defense'] || myRole}
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {user?.username}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            id="start-game-btn"
            className="btn btn-gold"
            style={{ flex: 1 }}
            onClick={startGame}
            disabled={loading}
          >
            {loading ? '...' : '▶ Oyunu Başlat'}
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            Çıkış
          </button>
        </div>
      </div>
    </div>
  );
}
