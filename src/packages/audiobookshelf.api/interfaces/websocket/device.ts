export interface DevicePresence {
  deviceId?: string;
  userId?: string;
  name?: string;
  status?: 'online' | 'offline' | 'idle' | string;
  lastSeen?: number;
}
