import { syncGithubProjects } from '../services/github.service.js';
import { parseResumeBuffer } from '../services/resume-parser.service.js';
import { HttpError } from '../utils/http-error.js';

function extractGitHubToken(request) {
  const authorizationHeader = request.get('authorization')?.trim();

  if (!authorizationHeader) {
    return '';
  }

  if (authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.slice(7).trim();
  }

  return authorizationHeader;
}

export async function parseResumeController(request, response, next) {
  try {
    if (!request.file?.buffer) {
      throw new HttpError(400, 'Upload a PDF in the "resume" form field.');
    }

    const result = await parseResumeBuffer(request.file.buffer);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function syncGithubController(request, response, next) {
  try {
    const username = request.params.username?.trim();

    if (!username) {
      throw new HttpError(400, 'GitHub username is required.');
    }

    const result = await syncGithubProjects({
      token: extractGitHubToken(request),
      username
    });

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export function healthController(_request, response) {
  response.status(200).json({
    message: 'Resume builder API is ready.',
    status: 'ok'
  });
}