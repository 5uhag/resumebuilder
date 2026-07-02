import axios from 'axios';
import { config } from '../config/env.js';
import { hasGemini, summarizeProjectWithGemini } from './gemini.service.js';
import { HttpError } from '../utils/http-error.js';

function createGithubClient(token) {
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {}),
      'User-Agent': 'resume-builder-mvp'
    },
    timeout: 15000
  });
}

function pickRateLimitHeaders(headers) {
  return {
    limit: Number(headers['x-ratelimit-limit'] || 0),
    remaining: Number(headers['x-ratelimit-remaining'] || 0),
    reset: Number(headers['x-ratelimit-reset'] || 0)
  };
}

function toSentence(value) {
  const trimmed = value.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return '';
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function prettifyRepositoryName(name) {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function extractReadmeHighlights(readmeText) {
  if (!readmeText) {
    return [];
  }

  const lines = readmeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#') && !line.startsWith('```'));

  const bulletLines = lines
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => toSentence(line.replace(/^[-*]\s+/, '')))
    .filter((line) => line.length > 20);

  if (bulletLines.length) {
    return bulletLines.slice(0, 3);
  }

  const paragraphText = lines.join(' ');
  const sentenceMatches = paragraphText.match(/[^.!?]+[.!?]?/g) || [];

  return sentenceMatches.map((line) => toSentence(line)).filter((line) => line.length > 30).slice(0, 3);
}

function summarizeProjectLocally(repository, readmeText) {
  const highlights = [];

  if (repository.description) {
    highlights.push(toSentence(repository.description));
  }

  if (repository.language || repository.topics?.length) {
    const techParts = [repository.language, ...(repository.topics || [])].filter(Boolean).slice(0, 5);
    highlights.push(toSentence(`Primary stack includes ${techParts.join(', ')}`));
  }

  highlights.push(...extractReadmeHighlights(readmeText));

  const normalizedHighlights = Array.from(new Set(highlights.filter(Boolean))).slice(0, 3);
  const keywords = Array.from(new Set([repository.language, ...(repository.topics || [])].filter(Boolean))).slice(0, 8);

  return {
    description:
      repository.description ||
      `Technical project sourced from the ${repository.name} GitHub repository.`,
    highlights: normalizedHighlights.length ? normalizedHighlights : [toSentence(`Built and maintained ${repository.name}`)],
    keywords,
    name: prettifyRepositoryName(repository.name),
    url: repository.html_url
  };
}

async function fetchReadmeText(client, repository) {
  try {
    const response = await client.get(`/repos/${repository.owner.login}/${repository.name}/readme`);
    const content = response.data?.content;
    return content ? Buffer.from(content, 'base64').toString('utf8') : '';
  } catch {
    return '';
  }
}

export async function syncGithubProjects({ token, username }) {
  let effectiveToken = token || config.githubToken;
  let client = createGithubClient(effectiveToken);

  try {
    let repositoriesResponse;
    try {
      repositoriesResponse = await client.get(`/users/${encodeURIComponent(username)}/repos`, {
        params: {
          per_page: 6,
          sort: 'updated',
          type: 'owner'
        }
      });
    } catch (error) {
      if (error.response?.status === 401 && !token && config.githubToken) {
        console.warn('Server GITHUB_TOKEN returned 401. Falling back to unauthenticated request.');
        const fallbackClient = createGithubClient('');
        repositoriesResponse = await fallbackClient.get(`/users/${encodeURIComponent(username)}/repos`, {
          params: {
            per_page: 6,
            sort: 'updated',
            type: 'owner'
          }
        });
        client = fallbackClient;
        effectiveToken = '';
      } else {
        throw error;
      }
    }

    const repositories = repositoriesResponse.data
      .filter((repository) => !repository.fork)
      .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
      .slice(0, 4);

    const projects = [];

    for (const repository of repositories) {
      const readmeText = await fetchReadmeText(client, repository);

      if (hasGemini() && readmeText) {
        try {
          const geminiSummary = await summarizeProjectWithGemini({
            readmeText,
            repository
          });

          projects.push({
            description: geminiSummary.description || repository.description || '',
            highlights: Array.isArray(geminiSummary.highlights) ? geminiSummary.highlights : [],
            keywords: Array.isArray(geminiSummary.keywords) ? geminiSummary.keywords : [],
            name: prettifyRepositoryName(repository.name),
            url: repository.html_url
          });
          continue;
        } catch {
          projects.push(summarizeProjectLocally(repository, readmeText));
          continue;
        }
      }

      projects.push(summarizeProjectLocally(repository, readmeText));
    }

    return {
      meta: {
        rateLimit: pickRateLimitHeaders(repositoriesResponse.headers),
        source: hasGemini() ? 'github+gemini' : 'github',
        usedToken: Boolean(effectiveToken),
        warning: effectiveToken ? '' : 'No GitHub token supplied. Unauthenticated requests are limited to 60 per hour.'
      },
      projects
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new HttpError(404, `GitHub user "${username}" was not found.`);
    }

    if (error.response?.status === 403) {
      throw new HttpError(403, 'GitHub API rate limit reached. Provide a personal access token and try again.');
    }

    if (error.response?.status === 401) {
      throw new HttpError(401, 'The GitHub personal access token you provided is invalid.');
    }

    throw new HttpError(502, 'Unable to fetch GitHub repositories right now.');
  }
}