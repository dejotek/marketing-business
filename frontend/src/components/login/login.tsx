import React, { useState } from 'react';
 
import './assets/index.scss';
 
const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
 
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
          >
            Zaloguj się
          </button>
        </form>
 
        <p className="helper">
          Nie masz konta? <button>Zarejestruj się</button>
        </p>
      </div>
    </div>
  );
};
 
export default Login;