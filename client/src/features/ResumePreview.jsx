function formatDate(value) {
  if (!value) {
    return 'Present';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric'
  }).format(parsed);
}

function Section({ children, title }) {
  return (
    <section className="resume-section">
      <div className="resume-section__header">
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ label }) {
  return <p className="empty-copy">No {label} yet.</p>;
}

export default function ResumePreview({ resume }) {
  const profiles = resume.basics.profiles ?? [];

  return (
    <div className="preview-frame">
      <div className="preview-paper">
        <header className="resume-header">
          <div>
            <p className="resume-name">{resume.basics.name || 'Your Name'}</p>
            <p className="resume-label">{resume.basics.label || 'Your professional title will appear here'}</p>
          </div>
          <div className="resume-contact">
            {resume.basics.email ? <span>{resume.basics.email}</span> : null}
            {resume.basics.phone ? <span>{resume.basics.phone}</span> : null}
            {resume.basics.location?.city || resume.basics.location?.region ? (
              <span>
                {[resume.basics.location.city, resume.basics.location.region].filter(Boolean).join(', ')}
              </span>
            ) : null}
          </div>
        </header>

        <Section title="Summary">
          <p className="summary-copy">{resume.basics.summary || 'Parse a PDF or edit this summary to describe the candidate profile.'}</p>
          {profiles.length ? (
            <div className="profile-links">
              {profiles.map((profile) => (
                <a href={profile.url} key={`${profile.network}-${profile.username}`} rel="noreferrer" target="_blank">
                  {profile.network}: {profile.username}
                </a>
              ))}
            </div>
          ) : null}
        </Section>

        <Section title="Experience">
          {resume.work.length ? (
            <div className="entry-list">
              {resume.work.map((entry, index) => (
                <article className="entry-card" key={`${entry.name}-${entry.position}-${index}`}>
                  <div className="entry-heading">
                    <div>
                      <h4>{entry.position || 'Role title'}</h4>
                      <p>{entry.name || 'Company'}</p>
                    </div>
                    <span>
                      {formatDate(entry.startDate)} - {formatDate(entry.endDate)}
                    </span>
                  </div>
                  {entry.summary ? <p>{entry.summary}</p> : null}
                  {entry.highlights?.length ? (
                    <ul>
                      {entry.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState label="experience entries" />
          )}
        </Section>

        <Section title="Education">
          {resume.education.length ? (
            <div className="entry-list">
              {resume.education.map((entry, index) => (
                <article className="entry-card" key={`${entry.institution}-${entry.area}-${index}`}>
                  <div className="entry-heading">
                    <div>
                      <h4>{entry.studyType || 'Degree'}</h4>
                      <p>{entry.institution || 'Institution'}</p>
                    </div>
                    <span>
                      {formatDate(entry.startDate)} - {formatDate(entry.endDate)}
                    </span>
                  </div>
                  {entry.area ? <p>{entry.area}</p> : null}
                  {entry.courses?.length ? <p>Courses: {entry.courses.join(', ')}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState label="education items" />
          )}
        </Section>

        <Section title="Skills">
          {resume.skills.length ? (
            <div className="skill-grid">
              {resume.skills.map((skill) => (
                <article className="skill-card" key={skill.name}>
                  <h4>{skill.name}</h4>
                  {skill.level ? <p>{skill.level}</p> : null}
                  <div className="tag-row">
                    {(skill.keywords ?? []).map((keyword) => (
                      <span className="tag" key={`${skill.name}-${keyword}`}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState label="skills" />
          )}
        </Section>

        <Section title="Projects">
          {resume.projects.length ? (
            <div className="entry-list">
              {resume.projects.map((project, index) => (
                <article className="entry-card" key={`${project.name}-${project.url}-${index}`}>
                  <div className="entry-heading">
                    <div>
                      <h4>{project.name || 'Project'}</h4>
                      {project.url ? (
                        <a href={project.url} rel="noreferrer" target="_blank">
                          {project.url}
                        </a>
                      ) : null}
                    </div>
                  </div>
                  {project.description ? <p>{project.description}</p> : null}
                  {project.highlights?.length ? (
                    <ul>
                      {project.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="tag-row">
                    {(project.keywords ?? []).map((keyword) => (
                      <span className="tag" key={`${project.name}-${keyword}`}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState label="projects" />
          )}
        </Section>

        <Section title="Awards">
          {resume.awards.length ? (
            <div className="entry-list">
              {resume.awards.map((award, index) => (
                <article className="entry-card" key={`${award.title}-${award.date}-${index}`}>
                  <div className="entry-heading">
                    <div>
                      <h4>{award.title || 'Award'}</h4>
                      <p>{award.awarder || 'Awarder'}</p>
                    </div>
                    <span>{formatDate(award.date)}</span>
                  </div>
                  {award.summary ? <p>{award.summary}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState label="awards" />
          )}
        </Section>
      </div>
    </div>
  );
}