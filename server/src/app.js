import cors from 'cors';
import express from 'express';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import apiV1Router from './routes/api.v1.routes.js';

const app = express();

app.use(
  cors({
    origin: config.clientOrigin,
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
app.use(notFoundHandler);
app.use(errorHandler);

export default app;