import { useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/guest', { username: username.trim() });
      setAuth(data.user, data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Bağlantı hatası. Backend uyku modundan çıkıyor olabilir, 30 saniye bekleyip tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card card-gold" style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>⚖️</div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>AVUKAT OYUNU</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Mahkeme salonuna adımını at
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEnter} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Kullanıcı Adın</label>
            <input
              id="username-input"
              type="text"
              className="form-input"
              placeholder="Örn: BakiAvukat"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              autoFocus
              required
            />
          </div>

          <button
            id="enter-btn"
            type="submit"
            className="btn btn-gold"
            disabled={loading || !username.trim()}
            style={{ width: '100%', fontSize: '1.05rem', padding: '0.9rem' }}
          >
            {loading
              ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Bağlanıyor...</>
              : '▶ Mahkemeye Gir'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          Hesap yok, şifre yok. Sadece isminle gir.
        </p>
      </div>
    </div>
  );
}
