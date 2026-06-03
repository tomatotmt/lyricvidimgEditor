export interface LyricBlock {
  id: string;
  text: string;
  track: number; // 0 to 4 (5 tracks)
  startFrame: number;
  endFrame: number;
  
  // Edit tab - Asset details
  scale: number;
  x: number;
  y: number;
  
  // Edit tab - Shared FX
  effect: string;
  effectIntensity: number;
  effectStartFrame: number;
  effectEndFrame: number;
  
  // Edit tab - Lyric custom
  font: string;
  textEffect: string;
  effectSpeed: number;
  textColor: string;
}

export interface GlobalSettings {
  font: string;
  textEffect: string;
  effectSpeed: number;
  textColor: string;
  backgroundColor: string;
  outlineColor: string;
}

export const FONT_OPTIONS = [
  'Outfit',
  'Inter',
  'New Tegomin',
  'Noto Sans JP',
  'Murecho',
  'Sawarabi Mincho'
];

export const EFFECT_OPTIONS = [
  'None',
  'Pop',
  'Slide',
  'Shake',
  'Zoom',
  'Blur',
  'Glitch',
  'Bounce',
  'Neon',
  'Glow'
];

export const TEXT_EFFECT_OPTIONS = [
  'None',
  'Fade In',
  'Typewriter',
  'Bounce In',
  'Zoom In',
  'Glitch Entry'
];

export const COLOR_PALETTE = [
  '#ffffff',
  '#000000',
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4'
];

export const initialLyrics: LyricBlock[] = [
  {
    id: 'l1',
    text: '諢帙＠縺ｦ 繧ゅ▲縺ｨ 豺ｱ縺・,
    track: 0,
    startFrame: 0,
    endFrame: 60,
    scale: 1,
    x: 0,
    y: -100,
    effect: 'Pop',
    effectIntensity: 5,
    effectStartFrame: 0,
    effectEndFrame: 30,
    font: 'Outfit',
    textEffect: 'Bounce In',
    effectSpeed: 5,
    textColor: '#ffffff'
  },
  {
    id: 'l2',
    text: '螢翫ｌ繧九∪縺ｧ',
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
    textColor: '#ef4444'
  }
];
