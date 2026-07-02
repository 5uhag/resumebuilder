import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { config } from './config/env.js';
import { connectDb } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import apiV1Router from './routes/api.v1.routes.js';

if (config.requireMongo && config.mongoUri) {
  connectDb().catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
  });
} else {
  console.warn('Mongo persistence is disabled. Running with PDF parsing and GitHub sync only.');
}

const app = express();
const dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(dirname, '../../client/dist');
const allowedOrigins = config.clientOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      const isVercelPreview = origin ? /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) : false;

      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || isVercelPreview) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: false
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_request, response) => {
  response.status(200).json({
    message: 'Resume builder backend is awake.',
    status: 'ok'
  });
});

app.use('/api/v1', apiV1Router);

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api/')) {
      return next();
    }

    response.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
