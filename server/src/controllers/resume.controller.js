import { Resume } from '../models/Resume.js';
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

export async function saveResumeController(request, response, next) {
  try {
    const { resumeData, name } = request.body ?? {};

    if (!resumeData) {
      throw new HttpError(400, 'resumeData is required.');
    }

    const autoName = name?.trim() || `Resume – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const saved = await Resume.create({
      userId: request.userId,
      name: autoName,
      resumeData
    });

    response.status(201).json({ id: saved._id, name: saved.name, createdAt: saved.createdAt });
  } catch (error) {
    next(error);
  }
}

export async function getHistoryController(request, response, next) {
  try {
    const resumes = await Resume.find({ userId: request.userId })
      .select('name createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(20);

    response.status(200).json({ resumes });
  } catch (error) {
    next(error);
  }
}

export async function loadResumeController(request, response, next) {
  try {
    const resume = await Resume.findOne({ _id: request.params.id, userId: request.userId });

    if (!resume) {
      throw new HttpError(404, 'Resume not found.');
    }

    response.status(200).json({ resume: resume.resumeData, name: resume.name });
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