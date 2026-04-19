import React, { useState } from 'react';

import { useNavigate, Link } from 'react-router-dom';
import { setCurrentUserId } from '../../utils/auth';
import axiosInstance from '../../utils/axiosInstance';

import './assets/index.scss';

const Login = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const form = (e.currentTarget as HTMLFormElement);
      const fd = new FormData(form);
      const idVal = (identifier && identifier.length) ? identifier : String(fd.get('identifier') || '');
      const pwVal = (password && password.length) ? password : String(fd.get('password') || '');

      if (idVal !== identifier) setIdentifier(idVal);
      if (pwVal !== password) setPassword(pwVal);

      const res = await axiosInstance.post('/auth/local', { identifier: idVal, password: pwVal });
      const data = res && res.data ? res.data : res;
      const jwt = data.jwt || (data && data.data && data.data.jwt);
      if (!jwt) throw new Error('Brak tokenu JWT w odpowiedzi');
      try { localStorage.setItem('jwt', jwt); } catch(e) {}

      const user = data.user || data.user || (data && data.data && data.data.user) || null;
      if (user && (user.id || user.email)) {
        const uid = user.id || user.email;
        console.log(user)
        try { localStorage.setItem('userInfo', JSON.stringify({ id: uid, ...user })); } catch(e) {}
        setCurrentUserId(String(uid));
      }

      navigate('/app/dashboard');
    } catch (err: any) {
      console.error('Login error', err);
      const server = err?.response?.data;
      const status = err?.response?.status;
      const msg = server?.error?.message || server?.message || err?.message || 'Wystąpił błąd logowania';
      setError(`${status || 'ERR'}: ${typeof server === 'object' ? JSON.stringify(server) : msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <div className="auth-brand">
          <div className="logo">MB</div>
          <div className="brand-text">
            <h2>Marketing Business</h2>
            <div className="subtitle">Wprowadź dane aby kontynuować</div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <input
            name="identifier"
            type="email"
            placeholder="Adres e-mail"
            autoComplete="username email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Hasło"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="btn btn-primary btn-login"
            disabled={loading}
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        {error && <p className="helper" style={{ color: 'red' }}>{error}</p>}

        <p className="helper">
          Nie masz konta? <Link to="/register">Zarejestruj się</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;