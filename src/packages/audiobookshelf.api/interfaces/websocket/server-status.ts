export interface ServerStatus {
  status?: 'ok' | 'busy' | 'maintenance' | 'error' | string;
  message?: string;
  updatedAt?: number;
}
