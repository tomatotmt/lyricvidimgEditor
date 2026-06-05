import {EFFECT_OPTIONS, TEXT_EFFECT_OPTIONS, THREE_TEXT_EFFECT_OPTIONS} from './effects';

export interface LyricBlock {
  id: string;
  text: string;
  track: number;
  startFrame: number;
  endFrame: number;
  scale: number;
  x: number;
  y: number;
  rotation?: number;
  effect: string;
  effectIntensity: number;
  effectStartFrame: number;
  effectEndFrame: number;
  font: string;
  textEffect: string;
  effectSpeed: number;
  textColor: string;
  textBackgroundColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  keyframes?: LyricKeyframe[];
}

export type LyricKeyframeProperty =
  | 'x'
  | 'y'
  | 'scale'
  | 'rotation'
  | 'textColor'
  | 'textBackgroundColor'
  | 'outlineColor'
  | 'outlineWidth'
  | 'effectIntensity'
  | 'effectStartFrame'
  | 'effectEndFrame'
  | 'effectSpeed';

export interface LyricKeyframe {
  id: string;
  frame: number;
  property?: LyricKeyframeProperty;
  value?: string | number;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  textColor?: string;
  textBackgroundColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  effectIntensity?: number;
  effectStartFrame?: number;
  effectEndFrame?: number;
  effectSpeed?: number;
}

export interface GlobalSettings {
  font: string;
  textEffect: string;
  effectSpeed: number;
  textColor: string;
  backgroundColor: string;
  outlineColor: string;
  textBackgroundColor?: string;
  outlineWidth?: number;
}

export const FONT_OPTIONS = [
  'Outfit',
  'Inter',
  'New Tegomin',
  'Noto Sans JP',
  'Murecho',
  'Sawarabi Mincho',
];

export {EFFECT_OPTIONS, TEXT_EFFECT_OPTIONS, THREE_TEXT_EFFECT_OPTIONS};

export const COLOR_PALETTE = [
  '#ffffff',
  '#000000',
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

export const initialLyrics: LyricBlock[] = [
  {
    id: 'l1',
    text: '愛して もっと 深く',
    track: 0,
    startFrame: 0,
    endFrame: 60,
    scale: 1,
    x: 0,
    y: -100,
    effect: 'Heartbeat Pulse',
    effectIntensity: 5,
    effectStartFrame: 0,
    effectEndFrame: 60,
    font: 'Outfit',
    textEffect: 'Pop In',
    effectSpeed: 5,
    textColor: '#ffffff',
    textBackgroundColor: 'transparent',
    outlineColor: '#000000',
    outlineWidth: 2,
    rotation: 0,
  },
  {
    id: 'l2',
    text: '壊れるまで',
    track: 1,
    startFrame: 45,
    endFrame: 120,
    scale: 1.2,
    x: 0,
    y: 100,
    effect: 'Glitch',
    effectIntensity: 8,
    effectStartFrame: 50,
    effectEndFrame: 100,
    font: 'Outfit',
    textEffect: 'Glitch Entry',
    effectSpeed: 8,
    textColor: '#ef4444',
    textBackgroundColor: 'transparent',
    outlineColor: '#000000',
    outlineWidth: 2,
    rotation: 0,
  },
];
