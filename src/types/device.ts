export type Device = {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  lastConnected?: string;
  createdAt: string;
  updatedAt: string;
};

export type DeviceContent = {
  id: string;
  deviceId: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  text?: string;
  duration: number;
  fontSize?: string;
  fontColor?: string;
  backgroundColor?: string;
  alt?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
