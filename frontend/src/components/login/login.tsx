import React, { useState } from 'react'
 
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
 
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
  }
 
  return (
    <div className="auth">
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label>
          Hasło
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        <button type="submit">Zaloguj się</button>
      </form>
      <div className="auth-message">{message}</div>
    </div>
  )
}