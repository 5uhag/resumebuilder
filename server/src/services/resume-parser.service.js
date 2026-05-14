import Ajv from 'ajv';
import pdf from 'pdf-parse';
import { extractResumeWithGemini, hasGemini } from './gemini.service.js';
import { HttpError } from '../utils/http-error.js';
import { normalizeResume, resumeSchema } from '../utils/resume-schema.js';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validateResume = ajv.compile(resumeSchema);

const SECTION_ALIASES = {
  accomplishments: 'awards',
  about: 'summary',
  education: 'education',
  experience: 'experience',
  projects: 'projects',
  skills: 'skills',
  summary: 'summary'
};

// LinkedIn PDFs inject these labels near the top — they look like names but aren't
const KNOWN_NON_NAME_WORDS = new Set([
  'contact', 'top skills', 'languages', 'certifications', 'honors-awards',
  'honors & awards', 'recommendations', 'page', 'see more', 'see less',
  'publications', 'volunteering', 'courses', 'interests', 'organizations',
  'activities', 'causes', 'following', 'connections'
]);

const SKILL_GROUPS = {
  'Cloud and Data': ['AWS', 'Azure', 'GCP', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQL'],
  'Developer Tools': ['Docker', 'Git', 'GitHub', 'Jenkins', 'Figma', 'Linux', 'CI/CD', 'Kubernetes'],
  'Programming Languages': ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'PHP'],
  'Web Technologies': ['React', 'Node.js', 'Express', 'Next.js', 'HTML', 'CSS', 'Tailwind', 'Vite', 'REST API']
};

function assertValidResume(candidateResume) {
  const valid = validateResume(candidateResume);

  if (!valid) {
    throw new HttpError(422, 'Parsed resume did not match the JSON Resume structure.', validateResume.errors);
  }
}

function cleanupText(text) {
  return text.replace(/\r/g, '').replace(/\u00a0/g, ' ').trim();
}

function cleanupLine(line) {
  return line.replace(/\s+/g, ' ').trim();
}

function extractLines(text) {
  return cleanupText(text)
    .split('\n')
    .map(cleanupLine)
    .filter(Boolean);
}

function isLikelyHeading(line) {
  const normalized = line.toLowerCase();
  return Object.prototype.hasOwnProperty.call(SECTION_ALIASES, normalized);
}

function splitSections(lines) {
  const sections = {
    intro: []
  };
  let currentSection = 'intro';

  for (const line of lines) {
    const normalized = line.toLowerCase();

    if (isLikelyHeading(normalized)) {
      currentSection = SECTION_ALIASES[normalized];
      sections[currentSection] ||= [];
      continue;
    }

    sections[currentSection] ||= [];
    sections[currentSection].push(line);
  }

  return sections;
}

function looksLikeDateRange(line) {
  return /(present|current|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b|\b\d{4}\b)/i.test(line) && /-|to|present|current/i.test(line);
}

function looksLikeContact(line) {
  return /@|https?:\/\/|www\.|linkedin\.com|github\.com|\+?\d[\d\s().-]{7,}/i.test(line);
}

function guessName(lines) {
  return (
    lines.find(
      (line) =>
        !isLikelyHeading(line.toLowerCase()) &&
        !KNOWN_NON_NAME_WORDS.has(line.toLowerCase()) &&
        !looksLikeContact(line) &&
        line.length <= 60 &&
        /^[A-Za-z][A-Za-z\s.'-]+$/.test(line)
    ) || ''
  );
}

function guessLabel(lines, name) {
  return (
    lines.find(
      (line) =>
        line !== name &&
        !looksLikeContact(line) &&
        !isLikelyHeading(line.toLowerCase()) &&
        line.length <= 80 &&
        /engineer|developer|designer|manager|analyst|student|consultant|specialist|lead|intern/i.test(line)
    ) || ''
  );
}

function extractFirstMatch(pattern, text) {
  const match = text.match(pattern);
  return match ? cleanupLine(match[0]) : '';
}

function extractProfiles(urls) {
  const profiles = [];

  for (const url of urls) {
    if (url.includes('linkedin.com')) {
      profiles.push({
        network: 'LinkedIn',
        url,
        username: url.split('/').filter(Boolean).pop() || ''
      });
    }

    if (url.includes('github.com')) {
      profiles.push({
        network: 'GitHub',
        url,
        username: url.split('/').filter(Boolean).pop() || ''
      });
    }
  }

  return profiles;
}

function extractLocation(lines) {
  const locationLine = lines.find(
    (line) => !looksLikeContact(line) && line.includes(',') && line.length < 80 && !looksLikeDateRange(line)
  );

  if (!locationLine) {
    return {
      city: '',
      region: ''
    };
  }

  const [city = '', region = ''] = locationLine.split(',').map(cleanupLine);
  return { city, region };
}

function extractSummary(sections) {
  const summaryLines = sections.summary?.length ? sections.summary : sections.intro?.slice(0, 6) || [];

  return summaryLines
    .filter((line) => !looksLikeContact(line) && !looksLikeDateRange(line) && line.split(' ').length > 4)
    .slice(0, 3)
    .join(' ')
    .trim();
}

function parseDateValue(value) {
  const trimmed = cleanupLine(value);

  if (!trimmed || /present|current/i.test(trimmed)) {
    return '';
  }

  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01-01`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

function parseDateRange(line) {
  const compact = cleanupLine(line).replace(/\s*[|·]\s*/g, ' ');
  const parts = compact.split(/\s+-\s+|\s+to\s+/i).map(cleanupLine).filter(Boolean);

  if (!parts.length) {
    return {
      endDate: '',
      startDate: ''
    };
  }

  return {
    endDate: parseDateValue(parts[1] || ''),
    startDate: parseDateValue(parts[0] || '')
  };
}

function buildExperienceEntries(lines) {
  if (!lines?.length) {
    return [];
  }

  const entries = [];
  let current = null;

  for (const line of lines) {
    if (!current) {
      current = {
        highlights: [],
        name: '',
        position: '',
        summary: '',
        startDate: '',
        endDate: ''
      };
    }

    if (looksLikeDateRange(line)) {
      const dates = parseDateRange(line);
      current.startDate = current.startDate || dates.startDate;
      current.endDate = current.endDate || dates.endDate;
      continue;
    }

    if (!current.position) {
      current.position = line;
      continue;
    }

    if (!current.name && line.length <= 80) {
      current.name = line;
      continue;
    }

    if (/^[-*]/.test(line)) {
      current.highlights.push(cleanupLine(line.replace(/^[-*]\s*/, '')));
      continue;
    }

    if (!current.summary) {
      current.summary = line;
      continue;
    }

    current.highlights.push(line);

    if (current.highlights.length >= 3) {
      entries.push(current);
      current = null;
    }
  }

  if (current && (current.position || current.name || current.summary || current.highlights.length)) {
    entries.push(current);
  }

  return entries
    .map((entry) => ({
      ...entry,
      highlights: entry.highlights.slice(0, 4)
    }))
    .filter((entry) => entry.position || entry.name);
}

function buildEducationEntries(lines) {
  if (!lines?.length) {
    return [];
  }

  const entries = [];
  let current = null;

  for (const line of lines) {
    if (!current) {
      current = {
        area: '',
        courses: [],
        institution: '',
        score: '',
        startDate: '',
        endDate: '',
        studyType: ''
      };
    }

    if (looksLikeDateRange(line)) {
      const dates = parseDateRange(line);
      current.startDate = current.startDate || dates.startDate;
      current.endDate = current.endDate || dates.endDate;
      continue;
    }

    if (!current.institution) {
      current.institution = line;
      continue;
    }

    if (!current.studyType) {
      current.studyType = line;
      continue;
    }

    if (!current.area) {
      current.area = line;
      continue;
    }

    current.courses.push(line);
  }

  if (current && (current.institution || current.studyType || current.area)) {
    entries.push(current);
  }

  return entries;
}

function extractSkills(fullText, sections) {
  const skills = [];
  const normalizedText = fullText.toLowerCase();

  for (const [groupName, keywords] of Object.entries(SKILL_GROUPS)) {
    const matches = keywords.filter((keyword) => normalizedText.includes(keyword.toLowerCase()));

    if (matches.length) {
      skills.push({
        keywords: matches,
        level: matches.length >= 4 ? 'Advanced' : 'Working',
        name: groupName
      });
    }
  }

  if (sections.skills?.length) {
    const additionalKeywords = sections.skills
      .join(', ')
      .split(/,|\||•/)
      .map(cleanupLine)
      .filter((keyword) => keyword.length > 1)
      .slice(0, 12);

    if (additionalKeywords.length) {
      skills.push({
        keywords: Array.from(new Set(additionalKeywords)),
        level: 'Listed in resume',
        name: 'Core Skills'
      });
    }
  }

  return skills;
}

function extractAwards(lines) {
  if (!lines?.length) {
    return [];
  }

  return lines.slice(0, 5).map((line) => ({
    awarder: '',
    date: '',
    summary: '',
    title: line
  }));
}

function extractProjects(lines) {
  if (!lines?.length) {
    return [];
  }

  const projects = [];

  for (const line of lines.slice(0, 6)) {
    if (line.length < 5) {
      continue;
    }

    projects.push({
      description: '',
      highlights: [],
      keywords: [],
      name: line,
      url: ''
    });
  }

  return projects;
}

function buildLocalResume(text) {
  const lines = extractLines(text);
  const sections = splitSections(lines);
  const urls = Array.from(new Set(text.match(/https?:\/\/[^\s)]+/g) || []));

  const basics = {
    email: extractFirstMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, text),
    label: guessLabel(lines, guessName(lines)),
    location: extractLocation(lines),
    name: guessName(lines),
    phone: extractFirstMatch(/(?:\+?\d[\d\s().-]{7,}\d)/, text),
    profiles: extractProfiles(urls),
    summary: extractSummary(sections)
  };

  return {
    awards: extractAwards(sections.awards),
    basics,
    education: buildEducationEntries(sections.education),
    projects: extractProjects(sections.projects),
    skills: extractSkills(text, sections),
    work: buildExperienceEntries(sections.experience)
  };
}

async function extractTextFromPdf(buffer) {
  try {
    const result = await pdf(buffer);
    return cleanupText(result.text || '');
  } catch {
    throw new HttpError(422, 'Unable to extract text from the uploaded PDF.');
  }
}

export async function parseResumeBuffer(buffer) {
  const warnings = [];

  if (hasGemini()) {
    try {
      const aiResume = normalizeResume(await extractResumeWithGemini(buffer));
      assertValidResume(aiResume);
      return {
        meta: {
          source: 'gemini',
          warnings
        },
        resume: aiResume
      };
    } catch (error) {
      warnings.push(`Gemini parse failed, used local PDF fallback: ${error.message}`);
    }
  }

  const text = await extractTextFromPdf(buffer);

  if (!text) {
    throw new HttpError(422, 'The PDF did not contain extractable text and Gemini is not available.');
  }

  const localResume = normalizeResume(buildLocalResume(text));
  assertValidResume(localResume);

  return {
    meta: {
      source: 'pdf-parse',
      warnings
    },
    resume: localResume
  };
}