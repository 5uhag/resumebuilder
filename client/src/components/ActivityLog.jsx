import React, { useState } from 'react';

export default function ActivityLog({ logs, onClear }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <div className="panel-card log-sheet">
      <div className="log-sheet__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="section-kicker" style={{ margin: 0 }}>Activity & System Logs</span>
          <span className="log-sheet__count">{logs.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="secondary-button log-sheet__btn"
            onClick={onClear}
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '12px' }}
          >
            Clear logs
          </button>
          <button
            type="button"
            className="secondary-button log-sheet__btn"
            onClick={() => setIsOpen(!isOpen)}
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '12px' }}
          >
            {isOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="log-sheet__body">
          <div className="log-sheet__console">
            {logs.map((log) => (
              <div key={log.id} className={`log-sheet__line log-sheet__line--${log.type}`}>
                <span className="log-sheet__time">[{log.timestamp}]</span>
                <span className={`log-sheet__badge log-sheet__badge--${log.type}`}>
                  {log.type.toUpperCase()}
                </span>
                <span className="log-sheet__msg">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
