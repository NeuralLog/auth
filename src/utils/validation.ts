/**
 * Validation utilities
 */
import { z } from 'zod';
import { ApiError } from './errors';

/**
 * Validate request data against a schema
 * 
 * @param data Data to validate
 * @param schema Zod schema to validate against
 * @returns Validated data
 * @throws ApiError if validation fails
 */
export function validateRequest<T>(data: unknown, schema: z.ZodType<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new ApiError(400, `Validation error: ${errorMessage}`);
    }
    throw new ApiError(400, 'Invalid request data');
  }
}
