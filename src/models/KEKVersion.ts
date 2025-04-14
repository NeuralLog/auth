import { Schema, model, Document } from 'mongoose';

/**
 * Interface for a KEK version document
 */
export interface KEKVersionDocument extends Document {
  /**
   * Version identifier
   */
  id: string;
  
  /**
   * Creation timestamp
   */
  createdAt: Date;
  
  /**
   * User ID of the admin who created this version
   */
  createdBy: string;
  
  /**
   * Status of this KEK version
   */
  status: 'active' | 'decrypt-only' | 'deprecated';
  
  /**
   * Reason for creating this version
   */
  reason: string;
  
  /**
   * Tenant ID
   */
  tenantId: string;
}

/**
 * Schema for a KEK version
 */
const KEKVersionSchema = new Schema<KEKVersionDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true
    },
    createdBy: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'decrypt-only', 'deprecated'],
      default: 'active'
    },
    reason: {
      type: String,
      required: true
    },
    tenantId: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create compound index for tenant ID and status
KEKVersionSchema.index({ tenantId: 1, status: 1 });

/**
 * KEK version model
 */
export const KEKVersion = model<KEKVersionDocument>('KEKVersion', KEKVersionSchema);
