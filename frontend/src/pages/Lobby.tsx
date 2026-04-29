import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { WS_URL } from '../services/api';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

interface Participant { user_id: string; username: string; role: string }

const roleLabel: Record<string, string> = {
  prosecutor: '⚖️ Savcı',
  defense: '🛡️ Savunma Avukatı',
  witness: '👁️ Tanık',
};

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { matchId, myRole } = useGameStore();
  const { user } = useAuthStore();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ws = useRef<WebSocket | null>(null);

  // Poll lobi durumunu her 3 saniyede bir
  useEffect(() => {
    if (!code) return;

    const poll = async () => {
      try {
        const { data } = await api.get(`/api/matches/lobby/${code.toUpperCase()}`);
        setParticipants(data.participants || []);

        // Eğer eşleşme başladıysa direkt oyuna yönlendir
        if (data.status === 'active') {
          navigate(`/game/${data.match_id}`);
        }
      } catch {
        // polling hatası sessizce geç
      }
    };

    poll(); // İlk çağrı hemen
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [code, navigate]);

  // WebSocket — game_started ve player_joined eventlerini dinle
  useEffect(() => {
    if (!matchId || !user) return;
    const socket = new WebSocket(`${WS_URL}/ws/${matchId}/${user.id}`);
    ws.current = socket;

    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'game_started') {
        navigate(`/game/${matchId}`);
      }
      if (msg.type === 'player_joined') {
        // Polling zaten güncelliyor ama anında da göster
        setParticipants(prev => {
          const exists = prev.find(p => p.user_id === msg.user_id);
          if (exists) return prev;
          return [...prev, { user_id: msg.user_id, username: msg.username, role: 'defense' }];
        });
      }
    };

    return () => socket.close();
  }, [matchId, user, navigate]);

  const startGame = async () => {
    if (!matchId) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/api/matches/${matchId}/start`);
      navigate(`/game/${matchId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Başlatılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const isHost = participants[0]?.user_id === user?.id || myRole === 'prosecutor';

  return (
    <div className="page">
      <div className="card card-gold" style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>🏛️ Lobi</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Arkadaşının katılmasını bekle
          </p>
        </div>

        {/* Lobi Kodu */}
        <div style={{
          background: 'var(--bg-raised)', borderRadius: 'var(--radius)',
          padding: '1.25rem', textAlign: 'center', marginBottom: '1.5rem',
          border: '1px dashed var(--border-glow)'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            LOBİ KODU — Arkadaşına ver
          </p>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: '2.5rem', color: 'var(--gold)', letterSpacing: '0.3em' }}>
            {code}
          </p>
          <button
            className="btn btn-ghost"
            style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
            onClick={() => navigator.clipboard.writeText(code || '')}
          >
            📋 Kopyala
          </button>
        </div>

        {/* Oyuncular */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            ODADAKI OYUNCULAR ({participants.length})
          </p>
          {participants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 0.5rem' }} />
              Bekleniyor...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {participants.map((p) => (
                <div key={p.user_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--bg-raised)', padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontWeight: 600 }}>
                    {p.user_id === user?.id ? '👤 Sen' : `👤 ${p.username}`}
                  </span>
                  <span className={`role-badge ${p.role}`}>
                    {roleLabel[p.role] || p.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Roller */}
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--gold-dim)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--gold)' }}>Oyun Nasıl Oynanır?</strong><br />
          ⚖️ <strong>Savcı</strong> iddiasını yazar → 🛡️ <strong>Avukat</strong> çürütür →
          🤖 <strong>AI Hakim</strong> puanlar → HP sıfıra düşen kaybeder
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isHost && (
            <button
              id="start-game-btn"
              className="btn btn-gold"
              style={{ flex: 1 }}
              onClick={startGame}
              disabled={loading || participants.length < 1}
            >
              {loading ? '...' : participants.length >= 2 ? '▶ Oyunu Başlat' : '⏳ Arkadaş Bekleniyor'}
            </button>
          )}
          {!isHost && (
            <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-secondary)', padding: '0.75rem' }}>
              ⏳ Host oyunu başlatmayı bekliyor...
            </div>
          )}
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Çıkış</button>
        </div>
      </div>
    </div>
  );
}
