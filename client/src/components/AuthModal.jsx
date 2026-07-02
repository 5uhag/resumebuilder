import React, { useState } from 'react';
import { login, register } from '../services/api.js';

export default function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(email, password);
      onSuccess(result.token, result.user);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-tabs">
          <button
            className={`modal-tab ${mode === 'login' ? 'modal-tab--active' : ''}`}
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
          >
            Log in
          </button>
          <button
            className={`modal-tab ${mode === 'register' ? 'modal-tab--active' : ''}`}
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
          >
            Sign up
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-label">
            Email
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </label>

          <label className="form-label">
            Password
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 6 characters' : ''}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  );
}
