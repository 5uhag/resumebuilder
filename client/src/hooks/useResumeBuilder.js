import { startTransition, useEffect, useState } from 'react';
import { checkHealth, parseResume, syncGithub } from '../services/api.js';

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
    awards: []
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

export function useResumeBuilder() {
  const [error, setError] = useState('');
  const [parseMeta, setParseMeta] = useState(null);
  const [parseState, setParseState] = useState('idle');
  const [resume, setResume] = useState(loadDraft);
  const [syncMeta, setSyncMeta] = useState(null);
  const [syncState, setSyncState] = useState('idle');
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

  function exportResume() {
    const file = new Blob([JSON.stringify(resume, null, 2)], {
      type: 'application/json'
    });
    const url = window.URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'resume.json';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return {
    error,
    dismissError: () => setError(''),
    exportResume,
    parseMeta,
    parseState,
    resume,
    syncMeta,
    syncState,
    systemStatus,
    parseResumeFile,
    syncGithubProjects,
    updateBasicsField
  };
}