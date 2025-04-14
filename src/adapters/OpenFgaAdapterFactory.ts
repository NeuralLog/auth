/**
 * OpenFgaAdapterFactory
 * 
 * Factory for creating OpenFGA adapters based on the environment.
 */

import { OpenFgaAdapter } from './OpenFgaAdapter';
import { LocalOpenFgaAdapter, LocalOpenFgaAdapterOptions } from './LocalOpenFgaAdapter';
import { KubernetesOpenFgaAdapter, KubernetesOpenFgaAdapterOptions } from './KubernetesOpenFgaAdapter';
import { logger } from '../services/logger';

export type OpenFgaAdapterType = 'local' | 'kubernetes';

export interface OpenFgaAdapterFactoryOptions {
  /**
   * Adapter type
   * @default 'local' in development, 'kubernetes' in production
   */
  adapterType?: OpenFgaAdapterType;
  
  /**
   * Local adapter options
   */
  localOptions?: LocalOpenFgaAdapterOptions;
  
  /**
   * Kubernetes adapter options
   */
  kubernetesOptions?: KubernetesOpenFgaAdapterOptions;
}

export class OpenFgaAdapterFactory {
  /**
   * Create an OpenFGA adapter
   * @param options Factory options
   */
  public static createAdapter(options: OpenFgaAdapterFactoryOptions = {}): OpenFgaAdapter {
    // Determine adapter type based on environment if not specified
    const adapterType = options.adapterType || 
      (process.env.NODE_ENV === 'production' ? 'kubernetes' : 'local');
    
    logger.info(`Creating OpenFGA adapter of type: ${adapterType}`);
    
    switch (adapterType) {
      case 'local':
        return new LocalOpenFgaAdapter(options.localOptions);
      case 'kubernetes':
        return new KubernetesOpenFgaAdapter(options.kubernetesOptions);
      default:
        throw new Error(`Unknown adapter type: ${adapterType}`);
    }
  }
}
