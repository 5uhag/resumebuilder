import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

const RESUME_SYSTEM_PROMPT = `You are a specialized Resume Extraction and Data Mapping Assistant.
You must map the supplied LinkedIn or resume PDF into JSON Resume style data.
Rules:
- Never invent data.
- Use empty strings for missing text values.
- Use empty arrays for missing collections.
- Standardize dates to ISO 8601 when possible.
- Return JSON only.`;

let client;

function stripCodeFence(value) {
  return value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
}

function getClient() {
  if (!config.geminiApiKey) {
    throw new HttpError(503, 'Gemini API key is not configured.');
  }

  if (!client) {
    client = new GoogleGenerativeAI(config.geminiApiKey);
  }

  return client;
}

export function hasGemini() {
  return Boolean(config.geminiApiKey);
}

export async function extractResumeWithGemini(buffer) {
  const model = getClient().getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: RESUME_SYSTEM_PROMPT
  });

  const result = await model.generateContent({
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: 'application/pdf'
            }
          },
          {
            text: 'Extract the candidate details into a JSON object that includes basics, work, education, skills, projects, and awards.'
          }
        ],
        role: 'user'
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });

  const text = stripCodeFence(result.response.text());
  return JSON.parse(text);
}

export async function summarizeProjectWithGemini({ readmeText, repository }) {
  const model = getClient().getGenerativeModel({
    model: 'gemini-1.5-flash'
  });

  const result = await model.generateContent({
    contents: [
      {
        parts: [
          {
            text: `You are writing resume-ready project summaries.\nRepository name: ${repository.name}\nRepository description: ${repository.description || ''}\nREADME:\n${readmeText}\n\nReturn JSON with keys description, highlights, and keywords. Use at most 3 concise highlights.`
          }
        ],
        role: 'user'
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  });

  const text = stripCodeFence(result.response.text());
  return JSON.parse(text);
}