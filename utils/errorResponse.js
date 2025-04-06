/**
 * Custom ErrorResponse class to standardize error responses
 * @extends Error
 */
class ErrorResponse extends Error {
  /**
   * Create a new ErrorResponse
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    // Capture stack trace, excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorResponse;
