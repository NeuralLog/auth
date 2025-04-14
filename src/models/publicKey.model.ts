import { Schema, model, Document } from 'mongoose';

/**
 * Public key interface
 */
export interface PublicKey {
  /**
   * User ID
   */
  userId: string;
  
  /**
   * Public key as a base64 string
   */
  publicKey: string;
  
  /**
   * Purpose of the key (e.g., 'admin-promotion')
   */
  purpose: string;
  
  /**
   * Tenant ID
   */
  tenantId: string;
  
  /**
   * Creation timestamp
   */
  createdAt: Date;
  
  /**
   * Last update timestamp
   */
  updatedAt: Date;
}

/**
 * Public key document interface
 */
export interface PublicKeyDocument extends PublicKey, Document {}

/**
 * Public key schema
 */
const publicKeySchema = new Schema<PublicKeyDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    publicKey: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      required: true,
      default: 'admin-promotion'
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Create a compound index on userId, purpose, and tenantId
publicKeySchema.index({ userId: 1, purpose: 1, tenantId: 1 }, { unique: true });

/**
 * Public key model
 */
export const PublicKeyModel = model<PublicKeyDocument>('PublicKey', publicKeySchema);
