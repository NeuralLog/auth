/**
 * OpenFGAAdapterFactory
 * 
 * Factory for creating OpenFGA adapters based on the environment.
 */

import { OpenFGAAdapter } from './OpenFGAAdapter';
import { LocalOpenFGAAdapter, LocalOpenFGAAdapterOptions } from './LocalOpenFGAAdapter';
import { KubernetesOpenFGAAdapter, KubernetesOpenFGAAdapterOptions } from './KubernetesOpenFGAAdapter';
import { logger } from '../services/logger';

export type OpenFGAAdapterType = 'local' | 'kubernetes';

export interface OpenFGAAdapterFactoryOptions {
  /**
   * Adapter type
   * @default 'local' in development, 'kubernetes' in production
   */
  adapterType?: OpenFGAAdapterType;
  
  /**
   * Local adapter options
   */
  localOptions?: LocalOpenFGAAdapterOptions;
  
  /**
   * Kubernetes adapter options
   */
  kubernetesOptions?: KubernetesOpenFGAAdapterOptions;
}

export class OpenFGAAdapterFactory {
  /**
   * Create an OpenFGA adapter
   * @param options Factory options
   */
  public static createAdapter(options: OpenFGAAdapterFactoryOptions = {}): OpenFGAAdapter {
    // Determine adapter type based on environment if not specified
    const adapterType = options.adapterType || 
      (process.env.NODE_ENV === 'production' ? 'kubernetes' : 'local');
    
    logger.info(`Creating OpenFGA adapter of type: ${adapterType}`);
    
    switch (adapterType) {
      case 'local':
        return new LocalOpenFGAAdapter(options.localOptions);
      case 'kubernetes':
        return new KubernetesOpenFGAAdapter(options.kubernetesOptions);
      default:
        throw new Error(`Unknown adapter type: ${adapterType}`);
    }
  }
}
