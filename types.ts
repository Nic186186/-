export interface GalaxyState {
  velocity: number;
  intensity: number;
}

export interface CosmicReading {
  title: string;
  insight: string;
}

export enum AppState {
  INTRO = 'INTRO',
  PERMISSIONS = 'PERMISSIONS',
  ACTIVE = 'ACTIVE',
  ANALYZING = 'ANALYZING',
  INSIGHT = 'INSIGHT'
}

export interface AudioContextType extends Window {
  webkitAudioContext: typeof AudioContext;
}