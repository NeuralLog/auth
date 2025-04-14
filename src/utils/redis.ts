/**
 * Redis client for the NeuralLog auth service
 */

import Redis from 'ioredis';
import { logger } from './logger';

/**
 * Redis client
 */
export class RedisClient {
  /**
   * Redis client
   */
  private readonly client: Redis;
  
  /**
   * Constructor
   */
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
    
    this.client.on('error', (error) => {
      logger.error('Redis error:', error);
    });
    
    this.client.on('connect', () => {
      logger.info('Connected to Redis');
    });
  }
  
  /**
   * Get a value
   * 
   * @param key Key
   * @returns Value or null if not found
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
  
  /**
   * Set a value
   * 
   * @param key Key
   * @param value Value
   * @param expireSeconds Expiration time in seconds
   */
  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    if (expireSeconds) {
      await this.client.set(key, value, 'EX', expireSeconds);
    } else {
      await this.client.set(key, value);
    }
  }
  
  /**
   * Delete a key
   * 
   * @param key Key
   * @returns Number of keys deleted
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }
  
  /**
   * Set expiration time
   * 
   * @param key Key
   * @param seconds Expiration time in seconds
   * @returns 1 if the timeout was set, 0 if key does not exist
   */
  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }
  
  /**
   * Get a JSON value
   * 
   * @param key Key
   * @returns Parsed JSON value or null if not found
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    
    if (!value) {
      return null;
    }
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Error parsing JSON:', error);
      return null;
    }
  }
  
  /**
   * Set a JSON value
   * 
   * @param key Key
   * @param value Value
   * @param expireSeconds Expiration time in seconds
   */
  async setJSON<T>(key: string, value: T, expireSeconds?: number): Promise<void> {
    const jsonValue = JSON.stringify(value);
    await this.set(key, jsonValue, expireSeconds);
  }
  
  /**
   * Add a member to a set
   * 
   * @param key Key
   * @param member Member
   * @returns Number of members added
   */
  async sadd(key: string, member: string): Promise<number> {
    return this.client.sadd(key, member);
  }
  
  /**
   * Remove a member from a set
   * 
   * @param key Key
   * @param member Member
   * @returns Number of members removed
   */
  async srem(key: string, member: string): Promise<number> {
    return this.client.srem(key, member);
  }
  
  /**
   * Get all members of a set
   * 
   * @param key Key
   * @returns Set members
   */
  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }
  
  /**
   * Check if a member is in a set
   * 
   * @param key Key
   * @param member Member
   * @returns Whether the member is in the set
   */
  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }
  
  /**
   * Increment a value
   * 
   * @param key Key
   * @param increment Increment amount
   * @returns New value
   */
  async incr(key: string, increment: number = 1): Promise<number> {
    if (increment === 1) {
      return this.client.incr(key);
    } else {
      return this.client.incrby(key, increment);
    }
  }
  
  /**
   * Close the connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }
}
