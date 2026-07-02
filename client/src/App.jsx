import React, { useDeferredValue } from 'react';
import AuthPage from './components/AuthPage.jsx';
import FileUpload from './components/FileUpload.jsx';
import GitHubSyncForm from './components/GitHubSyncForm.jsx';
import QuickEditForm from './components/QuickEditForm.jsx';
import ResumeHistory from './components/ResumeHistory.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import ResumePreview from './features/ResumePreview.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useResumeBuilder } from './hooks/useResumeBuilder.js';

function buildParseSource(meta) {
  if (!meta?.source) return 'No resume parsed yet';
  return meta.source === 'gemini'
    ? 'Parsed with Gemini structured output'
    : 'Parsed with local PDF fallback';
}

export default function App() {
  const { token, user, isLoggedIn, persist, logout } = useAuth();

  const {
    logs,
    clearLogs,
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
    parseDownloadedProfile,
    parseResumeFile,
    syncGithubProjects,
    updateTemplateSection,
    updateBasicsField,
    exportAsPdf
  } = useResumeBuilder(token);

  const deferredResume = useDeferredValue(resume);
  const isBackendReady = systemStatus.state === 'ready';

  function handleAuthSuccess(newToken, newUser) {
    persist(newToken, newUser);
  }

  async function handleSave() {
    await saveCurrentResume();
  }

  if (!isLoggedIn) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="topbar-brand">Resume Builder</span>
        <div className="topbar-actions">
          <div className="status-light" title={systemStatus.message}>
            <span
              className={`status-light__dot ${isBackendReady ? 'status-light__dot--green' : 'status-light__dot--red'}`}
              aria-hidden="true"
            />
            <span className="status-light__label">{isBackendReady ? 'Backend up' : 'Backend down'}</span>
          </div>
          <span className="topbar-user">{user?.email}</span>
          <button className="ghost-button" type="button" onClick={logout}>Log out</button>
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy panel-card panel-card--hero">
          <div className="hero-layout">
            <div>
              <p className="eyebrow">PRD to MVP</p>
              <h1>Resume Builder that parses LinkedIn PDFs, syncs GitHub, and outputs ATS-ready resumes.</h1>
              <p className="hero-text">
                Parse your LinkedIn PDF, pull in your latest GitHub projects, edit the basics, then save and download as an ATS-focused PDF.
              </p>
              <div className="hero-actions">
                <button className="primary-button" type="button" onClick={handleSave} disabled={saveState === 'loading'}>
                  {saveState === 'loading' ? 'Saving…' : saveState === 'success' ? 'Saved!' : 'Save to account'}
                </button>
                <button className="secondary-button" type="button" onClick={exportAsPdf}>
                  Download PDF
                </button>
              </div>
            </div>

            <aside className="hero-side">
              <p className="section-kicker">Quick Snapshot</p>
              <ul className="hero-side-list">
                <li>
                  <span>Parser</span>
                  <strong>{buildParseSource(parseMeta)}</strong>
                </li>
                <li>
                  <span>GitHub sync</span>
                  <strong>{syncMeta?.usedToken ? 'Authenticated PAT' : 'Public API mode'}</strong>
                </li>
                <li>
                  <span>Export format</span>
                  <strong>ATS-focused PDF</strong>
                </li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <aside className="workspace-sidebar">
          <FileUpload onLocalDemo={parseDownloadedProfile} onSubmit={parseResumeFile} state={parseState} />
          <GitHubSyncForm onSubmit={syncGithubProjects} state={syncState} syncMeta={syncMeta} />

          <QuickEditForm
            basics={resume.basics}
            onChange={updateBasicsField}
            sectionVisibility={resume.template ?? { showProjects: true, showAwards: true }}
            onToggleSection={updateTemplateSection}
          />

          <ResumeHistory
            history={history}
            fetchHistory={fetchHistory}
            onLoad={loadFromHistory}
          />

          <div className="panel-card panel-card--actions">
            <p className="section-kicker">Current draft</p>
            <h3>Save to your account or download PDF.</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="primary-button" type="button" onClick={handleSave} disabled={saveState === 'loading'}>
                {saveState === 'loading' ? 'Saving…' : 'Save to account'}
              </button>
              <button className="secondary-button" type="button" onClick={exportAsPdf}>Download PDF</button>
            </div>
          </div>
        </aside>

        <main className="workspace-main">
          <ActivityLog logs={logs} onClear={clearLogs} />

          <div className="preview-toolbar">
            <button className="secondary-button" type="button" onClick={exportAsPdf}>
              Download PDF
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

          <ResumePreview
            resume={deferredResume}
            showProjects={deferredResume.template?.showProjects !== false}
            showAwards={deferredResume.template?.showAwards !== false}
          />
        </main>
      </section>
    </div>
  );
}
