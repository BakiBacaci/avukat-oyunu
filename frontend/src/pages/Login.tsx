import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'guest' | 'register'>('guest');
  const { setAuth, token } = useAuthStore();
  const navigate = useNavigate();

  // Zaten giriş yapmışsa yönlendir
  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

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
      <div className="card card-gold" style={{ width: '100%', maxWidth: 420, padding: '0' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <button 
            className={`tab-btn ${activeTab === 'guest' ? 'active' : ''}`}
            onClick={() => setActiveTab('guest')}
            style={{ flex: 1, padding: '1rem', background: 'transparent', border: 'none', color: activeTab === 'guest' ? 'var(--gold)' : 'var(--text-secondary)', borderBottom: activeTab === 'guest' ? '2px solid var(--gold)' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            Misafir Girişi
          </button>
          <button 
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
            style={{ flex: 1, padding: '1rem', background: 'transparent', border: 'none', color: activeTab === 'register' ? 'var(--gold)' : 'var(--text-secondary)', borderBottom: activeTab === 'register' ? '2px solid var(--gold)' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            Hesap Oluştur
          </button>
        </div>

        <div style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚖️</div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '0.4rem', fontFamily: 'Cinzel' }}>AVUKAT OYUNU</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Mahkeme salonuna adımını at
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              {error}
            </div>
          )}

          {activeTab === 'guest' ? (
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
                  : '▶ Oyuna Gir'}
              </button>
              <p style={{ marginTop: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Hesap yok, şifre yok. Sadece isminle hızlıca gir.
              </p>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}>🚧</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Hesap Sistemi Yakında</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Şu anlık oyunu hızlıca test edebilmek için sadece misafir girişi aktiftir. İstediğin bir kullanıcı adını yazarak oynayabilirsin.
              </p>
              <button 
                className="btn btn-ghost" 
                style={{ marginTop: '1.5rem', width: '100%' }}
                onClick={() => setActiveTab('guest')}
              >
                Misafir Olarak Devam Et
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
