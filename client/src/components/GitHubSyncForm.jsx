import React, { useState } from 'react';

export default function GitHubSyncForm({ onSubmit, state, syncMeta }) {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');

  const isBusy = state === 'loading';

  async function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim()) {
      return;
    }

    await onSubmit(username.trim(), token.trim());
  }

  return (
    <form className="panel-card form-card" onSubmit={handleSubmit}>
      <p className="section-kicker">Step 2</p>
      <h3>Sync GitHub projects</h3>
      <p>Pull recent repositories and convert README details into resume-friendly highlights.</p>

      <label className="field-block" htmlFor="github-username">
        <span>GitHub username</span>
        <input
          id="github-username"
          placeholder="octocat"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>

      <label className="field-block" htmlFor="github-token">
        <span>Personal access token</span>
        <input
          autoComplete="off"
          id="github-token"
          placeholder="Optional but recommended"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </label>

      <div className="hint-box">
        <strong>Rate limit note</strong>
        <p>{syncMeta?.warning ?? 'Without a token, GitHub gives the server only 60 requests per hour.'}</p>
      </div>

      <button className="secondary-button" disabled={isBusy || !username.trim()} type="submit">
        {isBusy ? 'Syncing GitHub...' : 'Sync repositories'}
      </button>
    </form>
  );
}
