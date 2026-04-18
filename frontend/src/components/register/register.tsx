import React, { useState } from 'react';
 
import './../login/assets/index.scss';
 
const Register = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
 
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
  };
 
  return (
    <div className="auth-container">
      <div className="auth-form">
        <div className="auth-brand">
          <div className="logo">MB</div>
          <div className="brand-text">
            <h2>Zarejestruj się</h2>
            <div className="subtitle">Utwórz konto, aby uzyskać dostęp do kursów</div>
          </div>
        </div>
 
        <form onSubmit={handleRegister} className="login-form">
          <input
            type="text"
            placeholder="Nazwa użytkownika"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Adres e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary btn-login">Zarejestruj się</button>
        </form>
 
        <p className="helper">Masz już konto? <a href="/login">Zaloguj się</a></p>
      </div>
    </div>
  );
};
 
export default Register;
