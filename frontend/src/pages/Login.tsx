import { useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', form);
      setAuth(data.user, data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card card-gold" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚖️ Avukat Oyunu</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Mahkeme kapıları açılıyor...
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Kullanıcı Adı</label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              placeholder="kullanici_adi"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Şifre</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button id="login-submit" type="submit" className="btn btn-gold" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Giriş Yap'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Hesabın yok mu?{' '}
          <Link to="/register" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
            Kayıt Ol
          </Link>
        </p>
      </div>
    </div>
  );
}
