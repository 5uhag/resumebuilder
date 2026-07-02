import React, { useEffect } from 'react';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ResumeHistory({ history, fetchHistory, onLoad }) {
  useEffect(() => {
    fetchHistory();
  }, []);

  if (history.length === 0) {
    return (
      <div className="panel-card">
        <p className="section-kicker">Saved resumes</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #888)' }}>
          No saved resumes yet. Hit "Save to account" to create your first one.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-card">
      <p className="section-kicker">Saved resumes</p>
      <ul className="history-list">
        {history.map((item) => (
          <li key={item._id || item.id} className="history-item">
            <div className="history-meta">
              <span className="history-name">{item.name}</span>
              <span className="history-date">{formatDate(item.createdAt)}</span>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onLoad(item._id || item.id)}
            >
              Load
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
