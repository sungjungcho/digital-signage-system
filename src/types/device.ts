export type device = {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  lastConnected?: string;
  createdAt: string;
  updatedAt: string;
};

export type devicecontent = {
  id: string;
  deviceId: string;
  type: 'image' | 'video' | 'text' | 'split_layout';
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
  metadata?: string; // 유튜브 등 추가 정보를 JSON으로 저장
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
