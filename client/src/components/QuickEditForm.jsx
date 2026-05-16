export default function QuickEditForm({ basics, onChange, sectionVisibility, onToggleSection }) {
  return (
    <section className="panel-card form-card">
      <p className="section-kicker">Step 3</p>
      <h3>Quick polish</h3>
      <p>Tweak the core identity fields before export.</p>

      <label className="field-block" htmlFor="basic-name">
        <span>Name</span>
        <input id="basic-name" value={basics.name} onChange={(event) => onChange('name', event.target.value)} />
      </label>

      <label className="field-block" htmlFor="basic-label">
        <span>Professional title</span>
        <input id="basic-label" value={basics.label} onChange={(event) => onChange('label', event.target.value)} />
      </label>

      <label className="field-block" htmlFor="basic-email">
        <span>Email</span>
        <input id="basic-email" value={basics.email} onChange={(event) => onChange('email', event.target.value)} />
      </label>

      <label className="field-block" htmlFor="basic-phone">
        <span>Phone</span>
        <input id="basic-phone" value={basics.phone} onChange={(event) => onChange('phone', event.target.value)} />
      </label>

      <label className="field-block" htmlFor="basic-summary">
        <span>Summary</span>
        <textarea
          id="basic-summary"
          rows="5"
          value={basics.summary}
          onChange={(event) => onChange('summary', event.target.value)}
        />
      </label>

      <div className="template-controls">
        <p className="section-kicker" style={{ marginBottom: '4px' }}>Template sections</p>

        <label className="consent-row">
          <input
            checked={sectionVisibility?.showProjects !== false}
            type="checkbox"
            onChange={(event) => onToggleSection('showProjects', event.target.checked)}
          />
          <span>Show Projects section</span>
        </label>

        <label className="consent-row">
          <input
            checked={sectionVisibility?.showAwards !== false}
            type="checkbox"
            onChange={(event) => onToggleSection('showAwards', event.target.checked)}
          />
          <span>Show Awards section</span>
        </label>
      </div>
    </section>
  );
}