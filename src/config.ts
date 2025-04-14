/**
 * Configuration for the auth service
 */
export default {
  /**
   * Server configuration
   */
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost'
  },

  /**
   * JWT configuration
   */
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },

  /**
   * MongoDB configuration
   */
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/neurallog-auth'
  },

  /**
   * Redis configuration
   */
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: process.env.REDIS_PREFIX || 'neurallog:'
  },

  /**
   * OpenFGA configuration
   */
  openfga: {
    apiUrl: process.env.OPENFGA_API_URL || 'http://localhost:8080',
    storeId: process.env.OPENFGA_STORE_ID || '',
    modelId: process.env.OPENFGA_MODEL_ID || ''
  },

  /**
   * Logging configuration
   */
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  /**
   * CORS configuration
   */
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
};
