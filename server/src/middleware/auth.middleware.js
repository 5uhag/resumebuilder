import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

export function requireAuth(request, _response, next) {
  const header = request.get('authorization')?.trim();

  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authentication required.'));
  }

  const token = header.slice(7).trim();

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    request.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token.'));
  }
}
