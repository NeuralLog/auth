import { Schema, model, Document } from 'mongoose';

/**
 * Interface for a KEK blob document
 */
export interface KEKBlobDocument extends Document {
  /**
   * User ID
   */
  userId: string;
  
  /**
   * KEK version ID
   */
  kekVersionId: string;
  
  /**
   * Encrypted KEK blob
   */
  encryptedBlob: string;
  
  /**
   * Tenant ID
   */
  tenantId: string;
  
  /**
   * Creation timestamp
   */
  createdAt: Date;
  
  /**
   * Update timestamp
   */
  updatedAt: Date;
}

/**
 * Schema for a KEK blob
 */
const KEKBlobSchema = new Schema<KEKBlobDocument>(
  {
    userId: {
      type: String,
      required: true
    },
    kekVersionId: {
      type: String,
      required: true
    },
    encryptedBlob: {
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

// Create compound index for user ID and KEK version ID
KEKBlobSchema.index({ userId: 1, kekVersionId: 1 }, { unique: true });

// Create index for tenant ID
KEKBlobSchema.index({ tenantId: 1 });

/**
 * KEK blob model
 */
export const KEKBlob = model<KEKBlobDocument>('KEKBlob', KEKBlobSchema);
