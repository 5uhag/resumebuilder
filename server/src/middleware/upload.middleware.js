import multer from 'multer';
import { config } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

const storage = multer.memoryStorage();

export const uploadSingleResume = multer({
  fileFilter: (_request, file, callback) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      callback(new HttpError(400, 'Only PDF uploads are supported.'));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024
  },
  storage
}).single('resume');