import { Router } from 'express';
import { healthController, parseResumeController, syncGithubController } from '../controllers/resume.controller.js';
import { uploadSingleResume } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/health', healthController);
router.post('/resume/parse', uploadSingleResume, parseResumeController);
router.get('/github/sync/:username', syncGithubController);

export default router;