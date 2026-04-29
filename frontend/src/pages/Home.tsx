import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

const modes = [
  {
    id: '1v1',
    icon: '⚔️',
    title: '1v1 Düello',
    desc: 'Savcı vs Savunma Avukatı. Sıra tabanlı argüman çürütme.',
    color: 'var(--red)',
  },
  {
    id: 'multiplayer',
    icon: '🏛️',
    title: 'Çok Oyunculu',
    desc: 'Savcı, 2 Avukat ve Gizli Ajandası olan Tanık ile büyük lobi.',
    color: 'var(--gold)',
  },
];

export default function Home() {
  const { user, logout } = useAuthStore();
  const { setMatch } = useGameStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const createMatch = async (mode: string) => {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/api/matches/', { mode, ai_judge_active: true });
      setMatch(data.id, data.lobby_code, 'prosecutor');
      navigate(`/lobby/${data.lobby_code}`);
    } catch {
      setError('Maç oluşturulamadı.');
    } finally { setLoading(false); }
  };

  const joinMatch = async () => {
    if (!joinCode.trim()) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/api/matches/join', { lobby_code: joinCode.toUpperCase(), role: 'defense' });
      setMatch(data.id, joinCode.toUpperCase(), 'defense');
      navigate(`/lobby/${joinCode.toUpperCase()}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Lobiye katılınamadı.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <a className="navbar-brand" href="/">⚖️ Avukat Oyunu</a>
        <div className="navbar-links">
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            👤 {user?.username}
            <span style={{ color: 'var(--gold)', marginLeft: '0.75rem' }}>🏆 {user?.wins}W</span>
            <span style={{ color: 'var(--red)', marginLeft: '0.5rem' }}>💀 {user?.losses}L</span>
          </span>
          <button className="btn btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={logout}>
            Çıkış
          </button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚖️</div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>MAHKEME SALONU</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Delillerini topla, argümanlarını hazırla. AI Hakim her kelini tartar.
            Sabrı sıfıra düşmeden önce davayı kazan.
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem', maxWidth: 600, margin: '0 auto 1.5rem' }}>{error}</div>}

        {/* Mode Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {modes.map((m) => (
            <div key={m.id} className="card" style={{ borderColor: `${m.color}33`, textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{m.icon}</div>
              <h2 style={{ color: m.color, fontSize: '1.3rem', marginBottom: '0.5rem' }}>{m.title}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>{m.desc}</p>
              <button
                id={`create-${m.id}`}
                className="btn btn-gold"
                style={{ width: '100%' }}
                onClick={() => createMatch(m.id)}
                disabled={loading}
              >
                {loading ? '...' : 'Maç Oluştur'}
              </button>
            </div>
          ))}
        </div>

        {/* Join with code */}
        <div className="card" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)', fontFamily: 'Inter' }}>
            Lobi Koduyla Katıl
          </h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              id="join-code-input"
              type="text"
              className="form-input"
              placeholder="ABC123"
              maxLength={10}
              style={{ flex: 1, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.2em', fontWeight: 700 }}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button id="join-btn" className="btn btn-gold" onClick={joinMatch} disabled={loading || !joinCode.trim()}>
              Katıl
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
