import type { ThemeMode } from '@/types';

export interface ThemeConfig {
  name: string;
  label: string;
  description: string;
  mapTile: string;
  mapAttribution: string;
  register: 'console' | 'tactical';
}

export const THEMES: Record<ThemeMode, ThemeConfig> = {
  dark: {
    name: 'dark', label: 'DARK OPS',
    description: 'Low-light tactical command console',
    mapTile: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    mapAttribution: '&copy; Esri, DeLorme, NAVTEQ', register: 'console',
  },
  light: {
    name: 'light', label: 'DAYLIGHT',
    description: 'High-visibility naval bridge console',
    mapTile: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    mapAttribution: '&copy; Esri, DeLorme, NAVTEQ', register: 'console',
  },
};

export const STATUS_COLORS: Record<string, string> = {
  normal: '#10B981',
  rerouting: '#F59E0B',
  distressed: '#FF3366',
  stopped: '#64748B',
  stranded: '#FF3366',
  arrived: '#00E5FF',
  out_of_fuel: '#FF3366',
  insufficient_fuel: '#F59E0B',
  assisting: '#A855F7',
};

export const STATUS_LABELS: Record<string, string> = {
  normal: 'Normal',
  rerouting: 'Rerouting',
  distressed: 'Distress',
  stopped: 'Holding',
  stranded: 'Stranded',
  arrived: 'Arrived',
  out_of_fuel: 'No Fuel',
  insufficient_fuel: 'Fuel Critical',
  assisting: 'Assisting',
};

export const CARGO_ICONS: Record<string, string> = {
  'crude oil': '🛢️',
  'LNG': '🔥',
  'containers': '📦',
  'bulk grain': '🌾',
  'automobiles': '🚗',
  'bulk cement': '🏗️',
};
