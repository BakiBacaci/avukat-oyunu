import { useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', form);
      setAuth(data.user, data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card card-gold" style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>⚖️ Kayıt Ol</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Mahkeme salonuna adımını at
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Kullanıcı Adı</label>
            <input id="reg-username" type="text" className="form-input" placeholder="avukat_ahmet"
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">E-posta</label>
            <input id="reg-email" type="email" className="form-input" placeholder="ornek@email.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Şifre</label>
            <input id="reg-password" type="password" className="form-input" placeholder="Min. 8 karakter"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </div>
          <button id="reg-submit" type="submit" className="btn btn-gold" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'Hesap Oluştur'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Zaten hesabın var mı?{' '}
          <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>Giriş Yap</Link>
        </p>
      </div>
    </div>
  );
}
