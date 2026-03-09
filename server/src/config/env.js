import dotenv from 'dotenv';

dotenv.config();

export const config = {
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 50),
  port: Number(process.env.PORT || 4000)
};