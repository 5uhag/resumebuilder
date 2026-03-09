import multer from 'multer';

export function notFoundHandler(request, _response, next) {
  const error = new Error(`Route not found: ${request.method} ${request.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _request, response, _next) {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'PDF exceeds the configured upload size limit.' : error.message;
    response.status(400).json({ message });
    return;
  }

  const statusCode = error.statusCode || 500;

  response.status(statusCode).json({
    details: error.details,
    message: error.message || 'Unexpected server error.'
  });
}