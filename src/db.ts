import Redis from 'ioredis';
import { logger } from './services/logger';

// Redis connection options
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'auth:';

// Redis client
let redisClient: Redis | null = null;

/**
 * Connect to Redis
 */
export async function connectToDatabase(): Promise<Redis> {
  try {
    if (redisClient) {
      return redisClient;
    }

    logger.info(`Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      db: REDIS_DB,
      keyPrefix: REDIS_KEY_PREFIX
    });

    // Test connection
    await redisClient.ping();

    logger.info('Connected to Redis');

    return redisClient;
  } catch (error) {
    logger.error('Error connecting to Redis:', error);
    throw error;
  }
}

/**
 * Close the Redis connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Closed Redis connection');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
    throw error;
  }
}

// Redis data access methods
export const db = {
  /**
   * Get the Redis client
   * @returns Redis client
   */
  getClient: (): Redis => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }
    return redisClient;
  },

  /**
   * Set a key-value pair
   * @param key Key
   * @param value Value
   * @param expiry Expiry in seconds (optional)
   */
  set: async (key: string, value: string, expiry?: number): Promise<void> => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }

    if (expiry) {
      await redisClient.set(key, value, 'EX', expiry);
    } else {
      await redisClient.set(key, value);
    }
  },

  /**
   * Get a value by key
   * @param key Key
   * @returns Value or null if not found
   */
  get: async (key: string): Promise<string | null> => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }

    return redisClient.get(key);
  },

  /**
   * Delete a key
   * @param key Key
   */
  del: async (key: string): Promise<void> => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }

    await redisClient.del(key);
  },

  /**
   * Check if a key exists
   * @param key Key
   * @returns True if key exists, false otherwise
   */
  exists: async (key: string): Promise<boolean> => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }

    const result = await redisClient.exists(key);
    return result === 1;
  },

  /**
   * Add a member to a set
   * @param key Set key
   * @param member Member to add
   */
  sadd: async (key: string, member: string): Promise<void> => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }

    await redisClient.sadd(key, member);
  },

  /**
   * Get all members of a set
   * @param key Set key
   * @returns Array of members
   */
  smembers: async (key: string): Promise<string[]> => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }

    return redisClient.smembers(key);
  },

  /**
   * Remove a member from a set
   * @param key Set key
   * @param member Member to remove
   */
  srem: async (key: string, member: string): Promise<void> => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }

    await redisClient.srem(key, member);
  },

  /**
   * Store a JSON object
   * @param key Key
   * @param value Object to store
   * @param expiry Expiry in seconds (optional)
   */
  setJSON: async (key: string, value: any, expiry?: number): Promise<void> => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }

    const jsonValue = JSON.stringify(value);

    if (expiry) {
      await redisClient.set(key, jsonValue, 'EX', expiry);
    } else {
      await redisClient.set(key, jsonValue);
    }
  },

  /**
   * Get a JSON object
   * @param key Key
   * @returns Object or null if not found
   */
  getJSON: async <T>(key: string): Promise<T | null> => {
    if (!redisClient) {
      throw new Error('Redis not connected');
    }

    const value = await redisClient.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Error parsing JSON for key ${key}:`, error);
      return null;
    }
  }
};
