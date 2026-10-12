'use strict';

/** Error carrying an HTTP status code so the router can respond correctly. */
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

module.exports = { AppError };
