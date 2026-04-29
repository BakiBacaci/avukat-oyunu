import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

const modes = [
  {
    id: 'bot',
    icon: '🤖',
    title: 'Bota Karşı Oyna',
    desc: 'AI rakibe karşı savunma yap. Oyunu öğrenmek için ideal.',
    color: '#27ae60',
    role: 'prosecutor',
  },
  {
    id: '1v1',
    icon: '⚔️',
    title: '1v1 Arkadaşla',
    desc: 'Lobi kodu oluştur, arkadaşın katılsın. Savcı vs Avukat.',
    color: 'var(--red)',
    role: 'prosecutor',
  },
  {
    id: 'multiplayer',
    icon: '🏛️',
    title: 'Çok Oyunculu',
    desc: '4 kişilik oda: Savcı, 2 Avukat, Tanık.',
    color: 'var(--gold)',
    role: 'prosecutor',
  },
];

export default function Home() {
  const { user, logout } = useAuthStore();
  const { setMatch } = useGameStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const createMatch = async (mode: string) => {
    setLoading(mode); setError('');
    try {
      if (mode === 'bot') {
        // Bot modu: maç oluştur, direkt oyuna gir (arkadaş beklemeden)
        const { data } = await api.post('/api/matches/', { mode: '1v1', ai_judge_active: true });
        setMatch(data.id, data.lobby_code, 'prosecutor');
        // Bot olarak defense ekle
        await api.post('/api/matches/join', {
          lobby_code: data.lobby_code,
          role: 'defense',
        }).catch(() => {}); // Bot zaten AI, hata olsa da devam
        // Maçı başlat
        await api.post(`/api/matches/${data.id}/start`).catch(() => {});
        navigate(`/game/${data.id}`);
      } else {
        const { data } = await api.post('/api/matches/', { mode, ai_judge_active: true });
        setMatch(data.id, data.lobby_code, 'prosecutor');
        navigate(`/lobby/${data.lobby_code}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Hata oluştu, tekrar dene.');
    } finally { setLoading(''); }
  };

  const joinMatch = async () => {
    if (!joinCode.trim()) return;
    setLoading('join'); setError('');
    try {
      const { data } = await api.post('/api/matches/join', {
        lobby_code: joinCode.toUpperCase(),
        role: 'defense',
      });
      setMatch(data.id, joinCode.toUpperCase(), 'defense');
      navigate(`/lobby/${joinCode.toUpperCase()}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Lobiye katılınamadı.');
    } finally { setLoading(''); }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <a className="navbar-brand" href="/">⚖️ Avukat Oyunu</a>
        <div className="navbar-links">
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            👤 <strong style={{ color: 'var(--text-primary)' }}>{user?.username}</strong>
            <span style={{ color: 'var(--gold)', marginLeft: '0.75rem' }}>🏆 {user?.wins}G</span>
            <span style={{ color: 'var(--red)', marginLeft: '0.5rem' }}>💀 {user?.losses}M</span>
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
          <p style={{ color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Savcı olarak iddialarını sun, avukat olarak çürüt. AI Hakim her kelimeni tartar —
            sabrı sıfıra düşmeden önce davayı kazan.
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', maxWidth: 600, margin: '0 auto 1.5rem' }}>
            {error}
          </div>
        )}

        {/* Oyun Kartları */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {modes.map((m) => (
            <div key={m.id} className="card" style={{ borderColor: `${m.color}44`, textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{m.icon}</div>
              <h2 style={{ color: m.color, fontSize: '1.2rem', marginBottom: '0.5rem' }}>{m.title}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                {m.desc}
              </p>
              <button
                id={`create-${m.id}`}
                className="btn btn-gold"
                style={{ width: '100%' }}
                onClick={() => createMatch(m.id)}
                disabled={!!loading}
              >
                {loading === m.id ? (
                  <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Yükleniyor...</>
                ) : m.id === 'bot' ? '🤖 Bota Karşı Başla' : 'Maç Oluştur'}
              </button>
            </div>
          ))}
        </div>

        {/* Lobi Kodu ile Katıl */}
        <div className="card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', color: 'var(--gold)', fontFamily: 'Cinzel' }}>
            Lobi Koduna Katıl
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
            Arkadaşından aldığın kodu yaz
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              id="join-code-input"
              type="text"
              className="form-input"
              placeholder="ABC123"
              maxLength={10}
              style={{ flex: 1, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.25em', fontWeight: 700, fontSize: '1.1rem' }}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinMatch()}
            />
            <button
              id="join-btn"
              className="btn btn-gold"
              onClick={joinMatch}
              disabled={!!loading || !joinCode.trim()}
            >
              {loading === 'join' ? '...' : 'Katıl →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
