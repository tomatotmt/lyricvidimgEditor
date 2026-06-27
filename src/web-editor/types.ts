import {EFFECT_OPTIONS, IMAGE_EFFECT_OPTIONS, TEXT_EFFECT_OPTIONS, THREE_TEXT_EFFECT_OPTIONS} from './effects';

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
  inEffect?: string;
  outEffect?: string;
  effectIntensity: number;
  effectStartFrame: number;
  effectEndFrame: number;
  effectSwitchFrame?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
  fadeInPattern?: string;
  fadeOutPattern?: string;
  font: string;
  textEffect: string;
  effectSpeed: number;
  textColor: string;
  textBackgroundColor?: string;
  outlineColor?: string;
  outlineWidth?: number;
  keyframes?: LyricKeyframe[];
  tokenMode?: LyricTokenMode;
  tokens?: LyricToken[];
  role?: LyricRole;
}

export type LyricRole = 'main' | 'chorus' | 'emphasis' | 'overlap' | 'adlib' | 'english' | 'instrumental';

export type LyricTokenMode = 'auto' | 'word' | 'mora' | 'char';

export interface LyricToken {
  id: string;
  text: string;
  index: number;
  startFrame: number;
  endFrame: number;
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
  | 'effectSwitchFrame'
  | 'fadeInFrames'
  | 'fadeOutFrames'
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
  effectSwitchFrame?: number;
  fadeInFrames?: number;
  fadeOutFrames?: number;
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
  fadeInFrames?: number;
  fadeOutFrames?: number;
  fadeInPattern?: string;
  fadeOutPattern?: string;
}

export type ImageEffectName = (typeof IMAGE_EFFECT_OPTIONS)[number];
export type ImageEffectCategory = 'motion' | 'glitch' | 'color' | 'texture';
export type ImageKeyframeProperty = 'x' | 'y' | 'scale' | 'rotation' | 'opacity' | 'effectIntensity' | 'effectSpeed';

export interface ImageEffectSlot {
  category: ImageEffectCategory;
  enabled: boolean;
  effect: ImageEffectName;
  intensity: number;
}

export interface ImageKeyframe {
  id: string;
  frame: number;
  property: ImageKeyframeProperty;
  value: number;
}

export interface ImageBlock {
  id: string;
  name: string;
  src: string;
  layer: 0 | 1 | 2;
  startFrame: number;
  endFrame: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  effect: ImageEffectName;
  effectIntensity: number;
  effectSpeed: number;
  beatSync: boolean;
  imageEffects?: ImageEffectSlot[];
  keyframes?: ImageKeyframe[];
}

export type BeatMarker = {
  id?: string;
  frame: number;
  strength: number;
  source?: 'detected' | 'manual' | 'grid' | 'imported';
};

export const FONT_OPTIONS = [
  'Outfit',
  'Inter',
  'Impact',
  'Arial Black',
  'Trebuchet MS',
  'Georgia',
  'Courier New',
  'New Tegomin',
  'Noto Sans JP',
  'Murecho',
  'Sawarabi Mincho',
  'Yu Gothic',
  'Yu Mincho',
  'Meiryo',
  'MS Gothic',
  'MS Mincho',
] as const;

export type FontCategory = 'All' | 'Readable' | 'Impact' | 'Emotional' | 'Cute' | 'Japanese' | 'Cyber';

export type FontMetadata = {
  name: string;
  category: Exclude<FontCategory, 'All'>;
  displayName: string;
  sample: string;
  description: string;
  tags: readonly string[];
};

export const FONT_CATEGORIES: readonly FontCategory[] = [
  'All',
  'Readable',
  'Impact',
  'Emotional',
  'Cute',
  'Japanese',
  'Cyber',
] as const;

export const FONT_METADATA: Record<(typeof FONT_OPTIONS)[number], FontMetadata> = {
  Outfit: {
    name: 'Outfit',
    category: 'Readable',
    displayName: 'Outfit',
    sample: '愛して もっと',
    description: '英字と短い字幕がすっきり見える現代的なサンセリフ。',
    tags: ['latin', 'clean', 'modern'],
  },
  Inter: {
    name: 'Inter',
    category: 'Readable',
    displayName: 'Inter',
    sample: 'LYRIC VIDEO',
    description: 'UI的で読みやすく、説明的な字幕に向いています。',
    tags: ['latin', 'subtitle', 'clean'],
  },
  Impact: {
    name: 'Impact',
    category: 'Impact',
    displayName: 'Impact',
    sample: 'SHOUT',
    description: 'サビ頭や強い単語を太く押し出す定番の欧文フォント。',
    tags: ['bold', 'chorus', 'latin'],
  },
  'Arial Black': {
    name: 'Arial Black',
    category: 'Impact',
    displayName: 'Arial Black',
    sample: 'BEAT DROP',
    description: '大きな見出しやビート強調に使いやすい極太サンセリフ。',
    tags: ['bold', 'impact', 'latin'],
  },
  'Trebuchet MS': {
    name: 'Trebuchet MS',
    category: 'Cute',
    displayName: 'Trebuchet MS',
    sample: 'sweet hook',
    description: '少し丸みのあるポップな英字に向いています。',
    tags: ['pop', 'soft', 'latin'],
  },
  Georgia: {
    name: 'Georgia',
    category: 'Emotional',
    displayName: 'Georgia',
    sample: 'silent night',
    description: 'バラードや余韻のある英詞に合うセリフ体。',
    tags: ['serif', 'ballad', 'latin'],
  },
  'Courier New': {
    name: 'Courier New',
    category: 'Cyber',
    displayName: 'Courier New',
    sample: 'decode_01',
    description: 'コード、端末、デコード風の演出に使える等幅フォント。',
    tags: ['mono', 'glitch', 'code'],
  },
  'New Tegomin': {
    name: 'New Tegomin',
    category: 'Japanese',
    displayName: 'New Tegomin',
    sample: '愛して もっと',
    description: '和風、物語調、少し不穏な歌詞に合う日本語フォント。',
    tags: ['japanese', 'serif', 'story'],
  },
  'Noto Sans JP': {
    name: 'Noto Sans JP',
    category: 'Readable',
    displayName: 'Noto Sans JP',
    sample: '壊れるまで',
    description: '日本語字幕の基準にしやすい読みやすいゴシック。',
    tags: ['japanese', 'subtitle', 'clean'],
  },
  Murecho: {
    name: 'Murecho',
    category: 'Cute',
    displayName: 'Murecho',
    sample: 'きらめいて',
    description: '丸みがあり、ポップやかわいい表現に寄せやすい日本語フォント。',
    tags: ['japanese', 'rounded', 'pop'],
  },
  'Sawarabi Mincho': {
    name: 'Sawarabi Mincho',
    category: 'Emotional',
    displayName: 'Sawarabi Mincho',
    sample: '夜に沈む',
    description: '静かな歌詞や叙情的な表現に向いた明朝系フォント。',
    tags: ['japanese', 'serif', 'ballad'],
  },
  'Yu Gothic': {
    name: 'Yu Gothic',
    category: 'Readable',
    displayName: 'Yu Gothic',
    sample: '君の声',
    description: 'Windows環境で安定しやすい日本語ゴシック。',
    tags: ['japanese', 'system', 'subtitle'],
  },
  'Yu Mincho': {
    name: 'Yu Mincho',
    category: 'Emotional',
    displayName: 'Yu Mincho',
    sample: '遠い記憶',
    description: '余白や静けさを出しやすい日本語明朝。',
    tags: ['japanese', 'system', 'serif'],
  },
  Meiryo: {
    name: 'Meiryo',
    category: 'Readable',
    displayName: 'Meiryo',
    sample: '歌詞字幕',
    description: '画面上で読みやすいWindows標準の日本語フォント。',
    tags: ['japanese', 'system', 'readable'],
  },
  'MS Gothic': {
    name: 'MS Gothic',
    category: 'Cyber',
    displayName: 'MS Gothic',
    sample: 'ERROR 404',
    description: 'レトロPC、端末、グリッチ風の日本語演出に使いやすいフォント。',
    tags: ['japanese', 'system', 'glitch'],
  },
  'MS Mincho': {
    name: 'MS Mincho',
    category: 'Japanese',
    displayName: 'MS Mincho',
    sample: '花は散る',
    description: '硬質な和風や古い文書風の表現に向いています。',
    tags: ['japanese', 'system', 'serif'],
  },
};

export const getFontMetadata = (font: string): FontMetadata =>
  FONT_METADATA[font as (typeof FONT_OPTIONS)[number]] ?? {
    name: font,
    category: 'Readable',
    displayName: font,
    sample: '愛して もっと',
    description: 'カスタムフォントまたは環境依存フォントです。',
    tags: ['custom'],
  };

export {EFFECT_OPTIONS, IMAGE_EFFECT_OPTIONS, TEXT_EFFECT_OPTIONS, THREE_TEXT_EFFECT_OPTIONS};

export const FADE_PATTERN_OPTIONS = [
  'None',
  'Linear',
] as const;

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
    id: 'sample-main',
    text: '夜明けまで 走って',
    track: 0,
    startFrame: 0,
    endFrame: 88,
    scale: 1.05,
    x: -40,
    y: -118,
    rotation: 0,
    effect: 'Slide',
    inEffect: 'Slide',
    outEffect: 'Blur',
    effectIntensity: 5,
    effectStartFrame: 0,
    effectEndFrame: 88,
    effectSwitchFrame: 62,
    fadeInFrames: 10,
    fadeOutFrames: 12,
    fadeInPattern: 'Linear',
    fadeOutPattern: 'Linear',
    font: 'Noto Sans JP',
    textEffect: 'Karaoke Sweep',
    effectSpeed: 6,
    textColor: '#ffffff',
    textBackgroundColor: 'rgba(15,23,42,.55)',
    outlineColor: '#0f172a',
    outlineWidth: 3,
    tokenMode: 'word',
    keyframes: [
      {id: 'sample-main-x-start', frame: 0, property: 'x', value: -90},
      {id: 'sample-main-x-end', frame: 88, property: 'x', value: 40},
      {id: 'sample-main-scale-start', frame: 0, property: 'scale', value: 0.96},
      {id: 'sample-main-scale-end', frame: 88, property: 'scale', value: 1.12},
    ],
  },
  {
    id: 'sample-overlap',
    text: '君の声が 重なる',
    track: 1,
    startFrame: 46,
    endFrame: 136,
    scale: 0.92,
    x: 36,
    y: 88,
    rotation: -2,
    effect: 'Glow',
    inEffect: 'Glow',
    outEffect: 'Shadow Drift',
    effectIntensity: 6,
    effectStartFrame: 46,
    effectEndFrame: 136,
    effectSwitchFrame: 108,
    fadeInFrames: 12,
    fadeOutFrames: 16,
    fadeInPattern: 'Linear',
    fadeOutPattern: 'Linear',
    font: 'Sawarabi Mincho',
    textEffect: 'Word Highlight',
    effectSpeed: 5,
    textColor: '#bfdbfe',
    textBackgroundColor: 'transparent',
    outlineColor: '#1e3a8a',
    outlineWidth: 2,
    tokenMode: 'word',
    keyframes: [
      {id: 'sample-overlap-color-a', frame: 46, property: 'textColor', value: '#bfdbfe'},
      {id: 'sample-overlap-color-b', frame: 96, property: 'textColor', value: '#fef3c7'},
      {id: 'sample-overlap-y-a', frame: 46, property: 'y', value: 116},
      {id: 'sample-overlap-y-b', frame: 136, property: 'y', value: 76},
    ],
  },
  {
    id: 'sample-emphasis',
    text: 'BEAT DROP',
    track: 2,
    startFrame: 118,
    endFrame: 178,
    scale: 1.38,
    x: 0,
    y: 0,
    rotation: 0,
    effect: 'Shake',
    inEffect: 'Shake',
    outEffect: 'Zoom',
    effectIntensity: 8,
    effectStartFrame: 118,
    effectEndFrame: 178,
    effectSwitchFrame: 152,
    fadeInFrames: 4,
    fadeOutFrames: 10,
    fadeInPattern: 'Linear',
    fadeOutPattern: 'Linear',
    font: 'Impact',
    textEffect: 'Bass Drop',
    effectSpeed: 8,
    textColor: '#facc15',
    textBackgroundColor: 'rgba(127,29,29,.68)',
    outlineColor: '#000000',
    outlineWidth: 5,
    tokenMode: 'word',
    keyframes: [
      {id: 'sample-emphasis-intensity-a', frame: 118, property: 'effectIntensity', value: 4},
      {id: 'sample-emphasis-intensity-b', frame: 142, property: 'effectIntensity', value: 10},
      {id: 'sample-emphasis-rotation-a', frame: 118, property: 'rotation', value: -3},
      {id: 'sample-emphasis-rotation-b', frame: 178, property: 'rotation', value: 3},
    ],
  },
  {
    id: 'sample-fx',
    text: '光の中へ',
    track: 3,
    startFrame: 172,
    endFrame: 262,
    scale: 0.86,
    x: 0,
    y: -20,
    rotation: 0,
    effect: '3D Text Tunnel',
    inEffect: '3D Text Tunnel',
    outEffect: 'Slow Zoom',
    effectIntensity: 7,
    effectStartFrame: 172,
    effectEndFrame: 262,
    effectSwitchFrame: 226,
    fadeInFrames: 14,
    fadeOutFrames: 18,
    fadeInPattern: 'Linear',
    fadeOutPattern: 'Linear',
    font: 'Murecho',
    textEffect: 'Neon Depth Chase',
    effectSpeed: 6,
    textColor: '#67e8f9',
    textBackgroundColor: 'transparent',
    outlineColor: '#083344',
    outlineWidth: 3,
    tokenMode: 'mora',
    keyframes: [
      {id: 'sample-fx-outline-a', frame: 172, property: 'outlineWidth', value: 1},
      {id: 'sample-fx-outline-b', frame: 226, property: 'outlineWidth', value: 5},
      {id: 'sample-fx-color-a', frame: 172, property: 'textColor', value: '#67e8f9'},
      {id: 'sample-fx-color-b', frame: 262, property: 'textColor', value: '#f0abfc'},
    ],
  },
];
