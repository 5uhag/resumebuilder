import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Resume } from '../models/Resume.js';
import { syncGithubProjects } from '../services/github.service.js';
import { parseResumeBuffer } from '../services/resume-parser.service.js';
import { HttpError } from '../utils/http-error.js';

const LOCAL_DOWNLOAD_PROFILES = new Set(['Profile.pdf', 'Profile-1.pdf']);

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

export async function parseDownloadedResumeController(request, response, next) {
  try {
    const filename = request.params.filename?.trim();

    if (!LOCAL_DOWNLOAD_PROFILES.has(filename)) {
      throw new HttpError(404, 'Local demo PDF was not found.');
    }

    const filePath = path.join(os.homedir(), 'Downloads', filename);
    const buffer = await fs.readFile(filePath);
    const result = await parseResumeBuffer(buffer);

    response.status(200).json({
      ...result,
      meta: {
        ...(result.meta ?? {}),
        localFile: filename
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      next(new HttpError(404, 'Downloaded LinkedIn PDF is missing from Downloads.'));
      return;
    }

    next(error);
  }
}
