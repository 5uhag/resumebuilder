import { startTransition, useEffect, useState } from 'react';
import {
  checkHealth,
  getHealthUrl,
  getResumeHistory,
  loadResume,
  parseDownloadedResume,
  parseResume,
  saveResume,
  syncGithub
} from '../services/api.js';

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

function isLocalDemoToken(token) {
  return token === 'local-demo-token';
}

export function useResumeBuilder(token) {
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
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

  function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      { id: Math.random().toString(36).substring(2, 9), timestamp, type, message },
      ...prev
    ]);
  }

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  }, [resume]);

  useEffect(() => {
    let cancelled = false;

    async function warmUp() {
      const url = getHealthUrl();
      addLog('info', `Checking backend server status at: ${url}...`);
      try {
        const result = await checkHealth();

        if (!cancelled) {
          setSystemStatus({
            state: 'ready',
            message: result.message || 'Server is awake and ready.'
          });
          addLog('success', `Backend server is ready at: ${url}`);
        }
      } catch (err) {
        if (!cancelled) {
          setSystemStatus({
            state: 'error',
            message: 'Server is not reachable. Start the backend before parsing.'
          });
          addLog('error', `Server is not reachable at ${url}. Details: ${err.message}. Please check that VITE_API_BASE_URL matches your Render backend URL, and CLIENT_ORIGIN on the backend allows this origin.`);
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
    addLog('info', `Uploading and parsing resume PDF: "${file.name}"...`);

    try {
      const result = await parseResume(file);
      applyResumeUpdate(result.resume);
      setParseMeta(result.meta ?? null);
      setParseState('success');
      addLog('success', `Resume parsed successfully using ${result.meta?.source === 'gemini' ? 'Gemini' : 'local parser'}.`);
      if (result.meta?.warnings?.length) {
        result.meta.warnings.forEach((warning) => addLog('warn', warning));
      }
    } catch (nextError) {
      setParseState('error');
      const msg = getErrorMessage(nextError);
      setError(msg);
      addLog('error', `Failed to parse resume: ${msg}`);
    }
  }

  async function parseDownloadedProfile(filename) {
    setError('');
    setParseState('loading');
    addLog('info', `Parsing downloaded LinkedIn PDF: "${filename}"...`);

    try {
      const result = await parseDownloadedResume(filename);
      applyResumeUpdate(result.resume);
      setParseMeta(result.meta ?? null);
      setParseState('success');
      addLog('success', `Downloaded profile parsed successfully for ${result.resume?.basics?.name || filename}.`);
      if (result.meta?.warnings?.length) {
        result.meta.warnings.forEach((warning) => addLog('warn', warning));
      }
    } catch (nextError) {
      setParseState('error');
      const msg = getErrorMessage(nextError);
      setError(msg);
      addLog('error', `Failed to parse downloaded profile: ${msg}`);
    }
  }

  async function syncGithubProjects(username, token) {
    setError('');
    setSyncState('loading');
    addLog('info', `Syncing projects from GitHub for user "${username}"...`);

    try {
      const result = await syncGithub(username, token);
      applyResumeUpdate((currentResume) => mergeProjects(currentResume, result.projects ?? []));
      setSyncMeta(result.meta ?? null);
      setSyncState('success');
      addLog('success', `Successfully synced ${result.projects?.length ?? 0} projects from GitHub.`);
      if (result.meta?.warning) {
        addLog('warn', result.meta.warning);
      }
    } catch (nextError) {
      setSyncState('error');
      const msg = getErrorMessage(nextError);
      setError(msg);
      addLog('error', `GitHub sync failed: ${msg}`);
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
    if (isLocalDemoToken(token)) {
      setSaveState('success');
      addLog('success', 'Local draft is already saved in this browser. Add Mongo later for account history.');
      setTimeout(() => setSaveState('idle'), 2000);
      return;
    }

    setError('');
    setSaveState('loading');
    addLog('info', 'Saving resume draft to account...');
    try {
      const saved = await saveResume(resume, name, token);
      setSaveState('success');
      setHistory((prev) => [saved, ...prev]);
      addLog('success', `Resume draft "${saved.name || 'Untitled'}" saved successfully.`);
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (nextError) {
      setSaveState('error');
      const msg = getErrorMessage(nextError);
      setError(msg);
      addLog('error', `Failed to save resume: ${msg}`);
    }
  }

  async function fetchHistory() {
    if (!token || isLocalDemoToken(token)) return;
    try {
      const result = await getResumeHistory(token);
      setHistory(result.resumes ?? []);
    } catch {
      // silently fail — history is a convenience feature
    }
  }

  async function loadFromHistory(id) {
    if (!token || isLocalDemoToken(token)) return;
    addLog('info', 'Loading selected resume from history...');
    try {
      const result = await loadResume(id, token);
      applyResumeUpdate(result.resume);
      addLog('success', `Successfully loaded resume "${result.name || 'Untitled'}" from history.`);
    } catch (nextError) {
      const msg = getErrorMessage(nextError);
      setError(msg);
      addLog('error', `Failed to load resume: ${msg}`);
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
    logs,
    clearLogs: () => setLogs([]),
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
    parseDownloadedProfile,
    parseResumeFile,
    syncGithubProjects,
    updateTemplateSection,
    updateBasicsField
  };
}
