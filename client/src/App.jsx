import { useDeferredValue } from 'react';
import FileUpload from './components/FileUpload.jsx';
import GitHubSyncForm from './components/GitHubSyncForm.jsx';
import QuickEditForm from './components/QuickEditForm.jsx';
import ResumePreview from './features/ResumePreview.jsx';
import { useResumeBuilder } from './hooks/useResumeBuilder.js';

function buildHealthLabel(systemStatus) {
  if (systemStatus.state === 'warming') {
    return 'AI engine warming up';
  }

  if (systemStatus.state === 'ready') {
    return 'Backend ready';
  }

  return 'Backend unavailable';
}

function buildParseSource(meta) {
  if (!meta?.source) {
    return 'No resume parsed yet';
  }

  return meta.source === 'gemini'
    ? 'Parsed with Gemini structured output'
    : 'Parsed with local PDF fallback';
}

export default function App() {
  const {
    error,
    dismissError,
    parseState,
    parseMeta,
    resume,
    syncMeta,
    syncState,
    systemStatus,
    parseResumeFile,
    syncGithubProjects,
    updateBasicsField,
    exportResume
  } = useResumeBuilder();

  const deferredResume = useDeferredValue(resume);

  return (
    <div className="app-shell">
      <section className="hero-grid">
        <div className="hero-copy panel-card panel-card--hero">
          <p className="eyebrow">PRD to MVP</p>
          <h1>Resume Builder that parses LinkedIn PDFs, syncs GitHub, and exports JSON Resume.</h1>
          <p className="hero-text">
            Mongo is intentionally out of the loop for now. Drafts stay in browser storage, the server handles PDF parsing and GitHub sync, and the preview updates immediately.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={exportResume}>
              Export JSON Resume
            </button>
            <span className={`status-pill status-pill--${systemStatus.state}`}>
              {buildHealthLabel(systemStatus)}
            </span>
          </div>
        </div>

        <div className="panel-card panel-card--signal">
          <p className="signal-label">Warm-up</p>
          <h2>{systemStatus.message}</h2>
          <p className="signal-copy">
            The client pings the server at load so the first real parse does not surprise the user with a cold-start delay.
          </p>
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
              <dd>Browser draft only</dd>
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

          <div className="panel-card panel-card--actions">
            <p className="section-kicker">Current draft</p>
            <h3>Ship the JSON now, add Mongo later.</h3>
            <p>
              The app is already useful without persistence: parse the PDF, pull current repos, adjust the basics, and export a portable resume payload.
            </p>
            <button className="secondary-button" type="button" onClick={exportResume}>
              Download current resume.json
            </button>
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