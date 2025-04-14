/**
 * API Error class
 */
export class ApiError extends Error {
  statusCode: number;

  /**
   * Create a new API error
   * @param statusCode HTTP status code
   * @param message Error message
   */
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}
