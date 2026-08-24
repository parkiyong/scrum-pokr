import { hc } from 'hono/client';
import type { AppType } from './contracts';

/**
 * Typed Hono RPC client instance pointing to current origin.
 */
export const api = hc<AppType>('');

/**
 * Factory function for creating typed RPC client with custom baseURL or custom fetch options.
 */
export function createApiClient(baseUrl: string = '', options?: Parameters<typeof hc>[1]) {
  return hc<AppType>(baseUrl, options);
}

export type { AppType } from './contracts';
