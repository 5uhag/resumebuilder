import { Router } from 'express';
import { loginController, registerController } from '../controllers/auth.controller.js';
import {
  getHistoryController,
  healthController,
  loadResumeController,
  parseDownloadedResumeController,
  parseResumeController,
  saveResumeController,
  syncGithubController
} from '../controllers/resume.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadSingleResume } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/health', healthController);

router.post('/auth/register', registerController);
router.post('/auth/login', loginController);

router.post('/resume/parse', uploadSingleResume, parseResumeController);
router.post('/resume/parse-downloaded/:filename', parseDownloadedResumeController);
router.get('/github/sync/:username', syncGithubController);

router.post('/resume/save', requireAuth, saveResumeController);
router.get('/resume/history', requireAuth, getHistoryController);
router.get('/resume/:id', requireAuth, loadResumeController);

export default router;
