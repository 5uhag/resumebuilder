import { useDeferredValue, useState } from 'react';
import AuthModal from './components/AuthModal.jsx';
import FileUpload from './components/FileUpload.jsx';
import GitHubSyncForm from './components/GitHubSyncForm.jsx';
import QuickEditForm from './components/QuickEditForm.jsx';
import ResumeHistory from './components/ResumeHistory.jsx';
import ResumePreview from './features/ResumePreview.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useResumeBuilder } from './hooks/useResumeBuilder.js';

function buildHealthLabel(systemStatus) {
  if (systemStatus.state === 'warming') return 'AI engine warming up';
  if (systemStatus.state === 'ready') return 'Backend ready';
  return 'Backend unavailable';
}

function buildParseSource(meta) {
  if (!meta?.source) return 'No resume parsed yet';
  return meta.source === 'gemini'
    ? 'Parsed with Gemini structured output'
    : 'Parsed with local PDF fallback';
}

export default function App() {
  const { token, user, isLoggedIn, persist, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const {
    error,
    dismissError,
    exportResume,
    history,
    fetchHistory,
    loadFromHistory,
    parseState,
    parseMeta,
    resume,
    saveState,
    saveCurrentResume,
    syncMeta,
    syncState,
    systemStatus,
    parseResumeFile,
    syncGithubProjects,
    updateBasicsField
  } = useResumeBuilder(token);

  const deferredResume = useDeferredValue(resume);

  function handleAuthSuccess(newToken, newUser) {
    persist(newToken, newUser);
    setShowAuth(false);
  }

  async function handleSave() {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    await saveCurrentResume();
  }

  return (
    <div className="app-shell">
      {showAuth && (
        <AuthModal
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
        />
      )}

      <header className="app-topbar">
        <span className="topbar-brand">Resume Builder</span>
        <div className="topbar-actions">
          {isLoggedIn ? (
            <>
              <span className="topbar-user">{user?.email}</span>
              <button className="ghost-button" type="button" onClick={logout}>Log out</button>
            </>
          ) : (
            <button className="secondary-button" type="button" onClick={() => setShowAuth(true)}>
              Log in / Sign up
            </button>
          )}
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy panel-card panel-card--hero">
          <p className="eyebrow">PRD to MVP</p>
          <h1>Resume Builder that parses LinkedIn PDFs, syncs GitHub, and exports JSON Resume.</h1>
          <p className="hero-text">
            Parse your LinkedIn PDF, pull in your latest GitHub projects, edit the basics, then save to your account or export as JSON.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={handleSave} disabled={saveState === 'loading'}>
              {saveState === 'loading' ? 'Saving…' : saveState === 'success' ? 'Saved!' : 'Save to account'}
            </button>
            <button className="primary-button" type="button" onClick={exportResume}>
              Export JSON Resume
            </button>
            <button className="secondary-button" type="button" onClick={() => window.print()}>
              Print / Save as PDF
            </button>
            <span className={`status-pill status-pill--${systemStatus.state}`}>
              {buildHealthLabel(systemStatus)}
            </span>
          </div>
        </div>

        <div className="panel-card panel-card--signal">
          <p className="signal-label">Status</p>
          <h2>{systemStatus.message}</h2>
          <dl className="signal-grid">
            <div>
              <dt>Parser</dt>
              <dd>{buildParseSource(parseMeta)}</dd>
            </div>
            <div>
              <dt>GitHub Sync</dt>
              <dd>{syncMeta?.usedToken ? 'Authenticated with PAT' : 'Public API mode'}</dd>
            </div>
            <div>
              <dt>Persistence</dt>
              <dd>{isLoggedIn ? `Logged in as ${user?.email}` : 'Browser draft (not logged in)'}</dd>
            </div>
            <div>
              <dt>Export</dt>
              <dd>JSON Resume download</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="workspace-grid">
        <aside className="workspace-sidebar">
          <FileUpload onSubmit={parseResumeFile} state={parseState} />
          <GitHubSyncForm onSubmit={syncGithubProjects} state={syncState} syncMeta={syncMeta} />
          <QuickEditForm basics={resume.basics} onChange={updateBasicsField} />

          {isLoggedIn && (
            <ResumeHistory
              history={history}
              fetchHistory={fetchHistory}
              onLoad={loadFromHistory}
            />
          )}

          <div className="panel-card panel-card--actions">
            <p className="section-kicker">Current draft</p>
            <h3>Save to your account or export.</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="primary-button" type="button" onClick={handleSave} disabled={saveState === 'loading'}>
                {saveState === 'loading' ? 'Saving…' : 'Save to account'}
              </button>
              <button className="secondary-button" type="button" onClick={exportResume}>
                Download JSON
              </button>
            </div>
          </div>
        </aside>

        <main className="workspace-main">
          {error ? (
            <div className="alert-banner" role="alert">
              <div>
                <strong>Action blocked.</strong>
                <p>{error}</p>
              </div>
              <button className="ghost-button" type="button" onClick={dismissError}>
                Dismiss
              </button>
            </div>
          ) : null}

          <div className="preview-toolbar">
            <button className="secondary-button" type="button" onClick={() => window.print()}>
              Print / Save as PDF
            </button>
          </div>

          <div className="meta-row">
            <span className="meta-chip">{buildParseSource(parseMeta)}</span>
            {parseMeta?.warnings?.map((warning) => (
              <span className="meta-chip meta-chip--warn" key={warning}>
                {warning}
              </span>
            ))}
            {syncMeta?.warning ? <span className="meta-chip meta-chip--warn">{syncMeta.warning}</span> : null}
            {syncMeta?.rateLimit ? (
              <span className="meta-chip">
                GitHub remaining: {syncMeta.rateLimit.remaining}/{syncMeta.rateLimit.limit}
              </span>
            ) : null}
          </div>

          <ResumePreview resume={deferredResume} />
        </main>
      </section>
    </div>
  );
}
