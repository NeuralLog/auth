import axios from 'axios';
import { AuthClient } from './index';

/**
 * Get authentication headers for API requests
 */
export const getAuthHeaders = (token: string | null, tenantId: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'X-Tenant-ID': tenantId
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Create an authenticated API client
 */
export const createAuthenticatedClient = (baseURL: string, token: string | null, tenantId: string) => {
  return axios.create({
    baseURL,
    headers: getAuthHeaders(token, tenantId)
  });
};

/**
 * Export other components from the main index
 */
export * from './index';
