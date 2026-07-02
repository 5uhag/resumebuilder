import React, { useState } from 'react';
import { login, register } from '../services/api.js';

export default function AuthPage({ onSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await register(email, password);
      onSuccess(result.token, result.user);
    } catch (nextError) {
      setError(nextError.response?.data?.message || nextError.message || 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  }

  function handleLocalDemo() {
    onSuccess('local-demo-token', {
      email: 'local-demo@example.com',
      localOnly: true
    });
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Welcome</p>
        <h1>Sign in to start building your ATS resume</h1>
        <p className="auth-copy">
          Parse your profile PDF, sync GitHub projects, and control resume sections before exporting PDF.
        </p>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${mode === 'login' ? 'modal-tab--active' : ''}`}
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Log in
          </button>
          <button
            className={`modal-tab ${mode === 'register' ? 'modal-tab--active' : ''}`}
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
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
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'register' ? 'At least 6 characters' : ''}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>

          <button className="secondary-button" type="button" onClick={handleLocalDemo} disabled={loading}>
            Continue locally
          </button>
        </form>
      </div>
    </div>
  );
}
