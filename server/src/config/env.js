import dotenv from 'dotenv';

dotenv.config();

export const config = {
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  githubToken: process.env.GITHUB_TOKEN || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtSecret: process.env.JWT_SECRET || 'resume-builder-dev-secret',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 50),
  mongoUri: process.env.MONGO_URI || '',
  port: Number(process.env.PORT || 4000)
};