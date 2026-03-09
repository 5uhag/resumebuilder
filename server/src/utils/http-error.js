export class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.details = details;
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}