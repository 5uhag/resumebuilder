import { startTransition, useEffect, useState } from 'react';
import { checkHealth, getResumeHistory, loadResume, parseResume, saveResume, syncGithub } from '../services/api.js';

const STORAGE_KEY = 'resume-builder-draft-v1';

function createEmptyResume() {
  return {
    basics: {
      name: '',
      label: '',
      email: '',
      phone: '',
      summary: '',
      location: {
        city: '',
        region: ''
      },
      profiles: []
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    awards: [],
    template: {
      showProjects: true,
      showAwards: true
    }
  };
}

function normalizeResume(candidate) {
  const empty = createEmptyResume();
  const next = candidate ?? {};

  return {
    ...empty,
    ...next,
    basics: {
      ...empty.basics,
      ...(next.basics ?? {}),
      location: {
        ...empty.basics.location,
        ...(next.basics?.location ?? {})
      },
      profiles: Array.isArray(next.basics?.profiles) ? next.basics.profiles : []
    },
    template: {
      ...empty.template,
      ...(next.template ?? {})
    },
    work: Array.isArray(next.work) ? next.work : [],
    education: Array.isArray(next.education) ? next.education : [],
    skills: Array.isArray(next.skills) ? next.skills : [],
    projects: Array.isArray(next.projects) ? next.projects : [],
    awards: Array.isArray(next.awards) ? next.awards : []
  };
}

function loadDraft() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return createEmptyResume();
    }

    return normalizeResume(JSON.parse(raw));
  } catch {
    return createEmptyResume();
  }
}

function mergeProjects(existingResume, nextProjects) {
  const currentProjects = Array.isArray(existingResume.projects) ? existingResume.projects : [];
  const projectMap = new Map(currentProjects.map((project) => [project.url || project.name, project]));

  for (const project of nextProjects) {
    projectMap.set(project.url || project.name, project);
  }

  return {
    ...existingResume,
    projects: Array.from(projectMap.values())
  };
}

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Something failed while talking to the API.';
}

export function useResumeBuilder(token) {
  const [error, setError] = useState('');
  const [parseMeta, setParseMeta] = useState(null);
  const [parseState, setParseState] = useState('idle');
  const [resume, setResume] = useState(loadDraft);
  const [syncMeta, setSyncMeta] = useState(null);
  const [syncState, setSyncState] = useState('idle');
  const [saveState, setSaveState] = useState('idle');
  const [history, setHistory] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    state: 'warming',
    message: 'Checking server status...'
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  }, [resume]);

  useEffect(() => {
    let cancelled = false;

    async function warmUp() {
      try {
        const result = await checkHealth();

        if (!cancelled) {
          setSystemStatus({
            state: 'ready',
            message: result.message || 'Server is awake and ready.'
          });
        }
      } catch {
        if (!cancelled) {
          setSystemStatus({
            state: 'error',
            message: 'Server is not reachable. Start the backend before parsing.'
          });
        }
      }
    }

    warmUp();

    return () => {
      cancelled = true;
    };
  }, []);

  function applyResumeUpdate(updater) {
    startTransition(() => {
      setResume((currentResume) => {
        const nextResume = typeof updater === 'function' ? updater(currentResume) : updater;
        return normalizeResume(nextResume);
      });
    });
  }

  async function parseResumeFile(file) {
    setError('');
    setParseState('loading');

    try {
      const result = await parseResume(file);
      applyResumeUpdate(result.resume);
      setParseMeta(result.meta ?? null);
      setParseState('success');
    } catch (nextError) {
      setParseState('error');
      setError(getErrorMessage(nextError));
    }
  }

  async function syncGithubProjects(username, token) {
    setError('');
    setSyncState('loading');

    try {
      const result = await syncGithub(username, token);
      applyResumeUpdate((currentResume) => mergeProjects(currentResume, result.projects ?? []));
      setSyncMeta(result.meta ?? null);
      setSyncState('success');
    } catch (nextError) {
      setSyncState('error');
      setError(getErrorMessage(nextError));
    }
  }

  function updateBasicsField(field, value) {
    applyResumeUpdate((currentResume) => ({
      ...currentResume,
      basics: {
        ...currentResume.basics,
        [field]: value
      }
    }));
  }

  function updateTemplateSection(section, enabled) {
    applyResumeUpdate((currentResume) => ({
      ...currentResume,
      template: {
        ...(currentResume.template ?? { showProjects: true, showAwards: true }),
        [section]: Boolean(enabled)
      }
    }));
  }

  async function saveCurrentResume(name) {
    if (!token) return;
    setError('');
    setSaveState('loading');
    try {
      const saved = await saveResume(resume, name, token);
      setSaveState('success');
      setHistory((prev) => [saved, ...prev]);
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (nextError) {
      setSaveState('error');
      setError(getErrorMessage(nextError));
    }
  }

  async function fetchHistory() {
    if (!token) return;
    try {
      const result = await getResumeHistory(token);
      setHistory(result.resumes ?? []);
    } catch {
      // silently fail — history is a convenience feature
    }
  }

  async function loadFromHistory(id) {
    if (!token) return;
    try {
      const result = await loadResume(id, token);
      applyResumeUpdate(result.resume);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }

  async function exportAsPdf() {
    const element = document.getElementById('resume-print-target');
    if (!element) return;

    const html2pdf = (await import('html2pdf.js')).default;
    const name = resume.basics.name ? resume.basics.name.replace(/\s+/g, '_') : 'resume';

    html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(element)
      .save();
  }

  return {
    error,
    dismissError: () => setError(''),
    exportAsPdf,
    history,
    fetchHistory,
    loadFromHistory,
    parseMeta,
    parseState,
    resume,
    saveState,
    saveCurrentResume,
    syncMeta,
    syncState,
    systemStatus,
    parseResumeFile,
    syncGithubProjects,
    updateTemplateSection,
    updateBasicsField
  };
}