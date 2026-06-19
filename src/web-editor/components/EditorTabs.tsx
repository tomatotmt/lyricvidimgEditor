import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Player} from '@remotion/player';
import {
  COLOR_PALETTE,
  EFFECT_OPTIONS,
  FADE_PATTERN_OPTIONS,
  FONT_CATEGORIES,
  FontCategory,
  FONT_OPTIONS,
  GlobalSettings,
  LyricBlock,
  LyricKeyframeProperty,
  LyricRole,
  LyricTokenMode,
  TEXT_EFFECT_OPTIONS,
  THREE_TEXT_EFFECT_OPTIONS,
  getFontMetadata,
  BeatMarker,
} from '../types';
import {getLyricTokens, withGeneratedTokens} from '../lyricTokens';
import {
  buildAnimatedStyle,
  EFFECT_CATEGORIES,
  EffectCategory,
  EffectPurpose,
  EFFECT_PURPOSES,
  getEffectCategory,
  getDisplayEffectAnimation,
  getEffectMetadata,
  getTextEffectCategory,
  getTextEffectAnimation,
  TEXT_EFFECT_CATEGORIES,
} from '../effects';
import {LyricComposition} from './LyricComposition';

interface EditorTabsProps {
  lyrics: LyricBlock[];
  setLyrics: React.Dispatch<React.SetStateAction<LyricBlock[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  globalSettings: GlobalSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  audioFile: {name: string; url: string; duration?: number} | null;
  setAudioFile: (file: {name: string; url: string; duration?: number} | null) => void;
  beatMarkers: BeatMarker[];
  setBeatMarkers: React.Dispatch<React.SetStateAction<BeatMarker[]>>;
  durationInFrames: number;
  currentFrame: number;
  trackCount: number;
  setTrackCount: React.Dispatch<React.SetStateAction<number>>;
  applyProjectStateUpdate: (update: {
    lyrics: LyricBlock[];
    globalSettings: GlobalSettings;
    trackCount?: number;
    selectedId?: string | null;
  }) => void;
  activeTab: 'edit' | 'input' | 'output' | 'help';
  setActiveTab: (tab: 'edit' | 'input' | 'output' | 'help') => void;
  onAddLyric: () => void;
  onDeleteLyric: () => void;
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.08)',
  paddingTop: 12,
};

const buttonStyle: React.CSSProperties = {
  padding: 10,
  border: 'none',
  borderRadius: 8,
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
};

type ExportStatus = {
  kind: 'idle' | 'rendering' | 'done' | 'error';
  message: string;
};

type ProjectImportReport = {
  fileName: string;
  lyricCount: number;
  fixedCount: number;
  messages: string[];
};

type WorkflowReport = {
  title: string;
  changedBlocks: number;
  messages: string[];
  diffs?: WorkflowDiff[];
};

type WorkflowDiff = {
  id: string;
  text: string;
  changes: string[];
};

type WorkflowPreview = WorkflowReport & {
  nextLyrics: LyricBlock[];
  nextGlobalSettings: GlobalSettings;
  nextTrackCount: number;
};

type LrcDurationMode = 'nextMinus' | 'next' | 'minHold' | 'tail';
type TimingAdjustScope = 'selected' | 'fromSelected' | 'all';
type StylePresetCategory =
  | 'All'
  | 'ballad'
  | 'rock'
  | 'vocaloid'
  | 'rap'
  | 'edm'
  | 'anime'
  | 'cityPop'
  | 'idol'
  | 'enka'
  | 'dark'
  | 'chill'
  | 'bandBallad';
type StylePresetName = string;

type LrcEntry = {
  index: number;
  text: string;
  startFrame: number;
};

type LyricIssue = {
  id: string;
  kind: 'empty' | 'short' | 'long' | 'outOfRange' | 'beatMissing' | 'overlap' | 'audioMissing';
  severity: 'error' | 'warning' | 'info';
  lyricId?: string;
  message: string;
};

type EmphasisCandidate = {
  term: string;
  count: number;
  sourceLyricIds: string[];
  score: number;
};

type DensitySegment = {
  id: string;
  startFrame: number;
  endFrame: number;
  lyricIds: string[];
  charCount: number;
  maxOverlap: number;
  level: 'low' | 'medium' | 'high';
  recommendation: string;
};

type LyricSectionKind = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'dense' | 'space';

type LyricSection = {
  id: string;
  kind: LyricSectionKind;
  label: string;
  startFrame: number;
  endFrame: number;
  lyricIds: string[];
  charCount: number;
  repeatedLines: number;
};

type StylePreset = {
  label: string;
  description: string;
  category: Exclude<StylePresetCategory, 'All'>;
  variant: string;
  global: Partial<GlobalSettings>;
  roleStyles: Partial<Record<LyricRole, Partial<LyricBlock>>>;
};

type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<FileSystemFileHandle>;

type WritableFile = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

type FileSystemFileHandle = {
  createWritable: () => Promise<WritableFile>;
};

const hasSaveFilePicker = (value: Window): value is Window & {showSaveFilePicker: SaveFilePicker} =>
  'showSaveFilePicker' in value;

const KEYFRAME_PROPERTIES: Array<{value: LyricKeyframeProperty; label: string; type: 'number' | 'color' | 'text'}> = [
  {value: 'x', label: 'X位置', type: 'number'},
  {value: 'y', label: 'Y位置', type: 'number'},
  {value: 'scale', label: '倍率', type: 'number'},
  {value: 'rotation', label: '角度', type: 'number'},
  {value: 'textColor', label: '文字色', type: 'color'},
  {value: 'textBackgroundColor', label: '文字背景色', type: 'color'},
  {value: 'outlineColor', label: '枠線色', type: 'color'},
  {value: 'outlineWidth', label: '枠線幅', type: 'number'},
  {value: 'effectIntensity', label: 'エフェクト強度', type: 'number'},
  {value: 'effectStartFrame', label: 'エフェクト開始', type: 'number'},
  {value: 'effectEndFrame', label: 'エフェクト終了', type: 'number'},
  {value: 'effectSwitchFrame', label: '登場/退場切替', type: 'number'},
  {value: 'fadeInFrames', label: 'フェードINフレーム', type: 'number'},
  {value: 'fadeOutFrames', label: 'フェードOUTフレーム', type: 'number'},
  {value: 'effectSpeed', label: '表示速度', type: 'number'},
];

const EFFECT_PURPOSE_LABELS: Record<EffectPurpose, string> = {
  All: 'すべて',
  Karaoke: '歌唱追従',
  Beat: 'ビート',
  Chorus: 'サビ',
  Emotional: 'エモーショナル',
  Impact: 'インパクト',
  Glitch: 'グリッチ',
  '3D': '3D',
  Subtle: '控えめ',
};

const EFFECT_CATEGORY_LABELS: Record<EffectCategory, string> = {
  All: 'すべて',
  Basic: '基本',
  Motion: '動き',
  'Light / Color': '光・色',
  'Glitch / AI': 'グリッチ',
  Character: '文字単位',
  '3D': '3D',
  Cinematic: 'シネマ',
};

const LYRIC_ROLE_LABELS: Record<LyricRole, string> = {
  main: 'メイン',
  chorus: 'サビ',
  emphasis: '強調',
  overlap: '重ね',
  adlib: '合いの手',
  english: '英語',
  instrumental: '間奏',
};

const classifyLyricRole = (text: string, order: number, allTexts: string[]): LyricRole => {
  const normalized = text.trim();
  if (/^\s*(\[.*\]|\(.*\)|（.*）)\s*$/.test(normalized)) return 'instrumental';
  if (/^[A-Za-z0-9\s'",.!?&-]+$/.test(normalized) && /[A-Za-z]/.test(normalized)) return 'english';
  if (/^(hey|yeah|wow|oh|ah|la|na|yo|ha)[!！ー\s]*$/i.test(normalized)) return 'adlib';
  if (/[!！]{1,}$/.test(normalized) || normalized.length <= 5) return 'emphasis';
  const previousOccurrences = allTexts.slice(0, order).filter((item) => item === normalized).length;
  if (previousOccurrences >= 1 && normalized.length >= 6) return 'chorus';
  return 'main';
};

const roleToTrack = (role: LyricRole, overlapsMain: boolean) => {
  if (overlapsMain) return 1;
  if (role === 'emphasis' || role === 'adlib') return 2;
  if (role === 'instrumental') return 3;
  return 0;
};

const getLrcEndFrame = (
  entry: LrcEntry,
  nextStartFrame: number | undefined,
  durationMode: LrcDurationMode,
  earlyEndFrames: number,
  minDisplayFrames: number,
) => {
  const minEnd = entry.startFrame + Math.max(1, minDisplayFrames);
  if (nextStartFrame === undefined) return entry.startFrame + Math.max(minDisplayFrames, 75);
  if (durationMode === 'next') return Math.max(minEnd, nextStartFrame);
  if (durationMode === 'minHold') return Math.min(Math.max(minEnd, entry.startFrame + 1), Math.max(entry.startFrame + 1, nextStartFrame - 1));
  if (durationMode === 'tail') return Math.max(minEnd, nextStartFrame + Math.max(0, earlyEndFrames));
  return Math.max(minEnd, nextStartFrame - Math.max(0, earlyEndFrames));
};

const fitLyricTiming = (
  lyric: LyricBlock,
  startFrame: number,
  endFrame: number,
): LyricBlock => {
  const safeEndFrame = Math.max(startFrame + 1, endFrame);
  const effectEndFrame = Math.min(safeEndFrame, Math.max(startFrame + 1, startFrame + 45));
  return withGeneratedTokens({
    ...lyric,
    startFrame,
    endFrame: safeEndFrame,
    effectStartFrame: startFrame,
    effectEndFrame,
    effectSwitchFrame: Math.min(effectEndFrame, Math.max(startFrame + 1, startFrame + 22)),
  }, lyric.tokenMode ?? 'auto');
};

const shiftLyricFrames = (lyric: LyricBlock, deltaFrames: number, maxFrame: number): LyricBlock => {
  const duration = Math.max(1, lyric.endFrame - lyric.startFrame);
  const actualDelta = Math.round(Math.min(maxFrame - lyric.endFrame, Math.max(-lyric.startFrame, deltaFrames)));
  const startFrame = Math.max(0, Math.min(maxFrame - duration, lyric.startFrame + actualDelta));
  const endFrame = Math.max(startFrame + 1, Math.min(maxFrame, lyric.endFrame + actualDelta));
  return {
    ...lyric,
    startFrame,
    endFrame,
    effectStartFrame: Math.max(startFrame, Math.min(endFrame - 1, lyric.effectStartFrame + actualDelta)),
    effectEndFrame: Math.max(startFrame + 1, Math.min(endFrame, lyric.effectEndFrame + actualDelta)),
    effectSwitchFrame: lyric.effectSwitchFrame === undefined
      ? undefined
      : Math.max(startFrame + 1, Math.min(endFrame - 1, lyric.effectSwitchFrame + actualDelta)),
    tokens: lyric.tokens?.map((token) => ({
      ...token,
      startFrame: Math.max(startFrame, Math.min(endFrame - 1, token.startFrame + actualDelta)),
      endFrame: Math.max(startFrame + 1, Math.min(endFrame, token.endFrame + actualDelta)),
    })),
    keyframes: lyric.keyframes?.map((keyframe) => ({
      ...keyframe,
      frame: Math.max(startFrame, Math.min(endFrame, keyframe.frame + actualDelta)),
    })),
  };
};

const EMPHASIS_KEYWORDS = [
  '愛',
  '君',
  '僕',
  '夢',
  '夜',
  '朝',
  '光',
  '影',
  '声',
  '涙',
  '心',
  '未来',
  '世界',
  '痛み',
  '孤独',
  '希望',
  '奇跡',
  '永遠',
  '壊れ',
  '走れ',
  '叫べ',
  '会いたい',
  'さよなら',
  'ありがとう',
  'love',
  'dream',
  'heart',
  'night',
  'light',
  'voice',
  'forever',
  'never',
  'again',
];

const normalizeCandidate = (value: string) =>
  value
    .replace(/[()[\]{}（）「」『』【】"'“”]/g, '')
    .replace(/[、。,.!?！？:：;；…\s]+/g, ' ')
    .trim();

const extractTermsFromText = (text: string) => {
  const normalized = normalizeCandidate(text);
  const terms = new Set<string>();
  EMPHASIS_KEYWORDS.forEach((keyword) => {
    if (normalized.toLowerCase().includes(keyword.toLowerCase())) terms.add(keyword);
  });
  normalized.split(/\s+/).forEach((word) => {
    const cleaned = word.trim();
    if (!cleaned) return;
    if (/^[A-Za-z0-9-]{3,}$/.test(cleaned)) terms.add(cleaned);
    if (Array.from(cleaned).every((char) => char.charCodeAt(0) > 127) && cleaned.length >= 2 && cleaned.length <= 6) terms.add(cleaned);
  });
  if (terms.size === 0 && normalized.length >= 2 && normalized.length <= 8) {
    terms.add(normalized);
  }
  return [...terms].filter((term) => term.length >= 2);
};

const getDensityLevel = (charsPerSecond: number, maxOverlap: number): DensitySegment['level'] => {
  if (charsPerSecond >= 18 || maxOverlap >= 3) return 'high';
  if (charsPerSecond >= 8 || maxOverlap >= 2) return 'medium';
  return 'low';
};

const getDensityRecommendation = (level: DensitySegment['level']) => {
  if (level === 'high') return '文字量多め。歌唱中演出は軽く、フェード短めが安全です。';
  if (level === 'medium') return '標準密度。歌詞追従系や軽い強調が扱いやすい区間です。';
  return '余白多め。余韻、Glow、3D、強調語ブロックを置きやすい区間です。';
};

const SECTION_KIND_LABELS: Record<LyricSectionKind, string> = {
  intro: '導入',
  verse: 'A/Bメロ',
  chorus: 'サビ候補',
  bridge: 'ブリッジ',
  outro: 'アウトロ',
  dense: '高密度',
  space: '余白',
};

const sectionKindColor = (kind: LyricSectionKind) => {
  if (kind === 'chorus') return '#b45309';
  if (kind === 'dense') return '#7f1d1d';
  if (kind === 'space') return '#164e63';
  if (kind === 'intro' || kind === 'outro') return '#374151';
  if (kind === 'bridge') return '#5b21b6';
  return '#1f2937';
};

const STYLE_PRESET_CATEGORY_LABELS: Record<StylePresetCategory, string> = {
  All: 'すべて',
  ballad: 'バラード',
  rock: 'ロック',
  vocaloid: 'ボカロ',
  rap: 'ラップ',
  edm: 'EDM',
  anime: 'アニメOP',
  cityPop: 'シティポップ',
  idol: 'アイドル',
  enka: '和風/演歌寄り',
  dark: 'ダーク/病み系',
  chill: 'チル/Lo-fi',
  bandBallad: 'バンドバラード',
};

const STYLE_PRESET_CATEGORIES: readonly StylePresetCategory[] = [
  'All',
  'ballad',
  'rock',
  'vocaloid',
  'rap',
  'edm',
  'anime',
  'cityPop',
  'idol',
  'enka',
  'dark',
  'chill',
  'bandBallad',
] as const;

type StylePresetBase = Omit<StylePreset, 'variant'>;
type StylePresetVariant = {
  id: string;
  label: string;
  description: string;
  global: Partial<GlobalSettings>;
  roleStyles: Partial<Record<LyricRole, Partial<LyricBlock>>>;
};

const mergeRoleStyles = (
  base: StylePresetBase['roleStyles'],
  variant: StylePresetVariant['roleStyles'],
): StylePreset['roleStyles'] => {
  const roles = new Set<LyricRole>([
    ...(Object.keys(base) as LyricRole[]),
    ...(Object.keys(variant) as LyricRole[]),
  ]);
  const merged: StylePreset['roleStyles'] = {};
  roles.forEach((role) => {
    merged[role] = {...base[role], ...variant[role]};
  });
  return merged;
};

const STYLE_PRESET_VARIANTS: readonly StylePresetVariant[] = [
  {
    id: 'standard',
    label: '標準',
    description: 'カテゴリの基本形です。',
    global: {},
    roleStyles: {},
  },
  {
    id: 'readable',
    label: '可読性重視',
    description: '長い歌詞でも読みやすい字幕寄りにします。',
    global: {textEffect: 'Karaoke Sweep', effectSpeed: 5, outlineWidth: 4, fadeInFrames: 8, fadeOutFrames: 10},
    roleStyles: {
      main: {inEffect: 'Fade In', outEffect: 'Blur', textEffect: 'Karaoke Sweep', effectIntensity: 4, tokenMode: 'auto'},
      chorus: {textEffect: 'Phrase Pulse', effectIntensity: 5},
      emphasis: {textEffect: 'Flash & Fade', effectIntensity: 6},
    },
  },
  {
    id: 'chorus',
    label: 'サビ強調',
    description: 'サビと強調語を大きめに押し出します。',
    global: {textEffect: 'Chorus Burst', effectSpeed: 7, outlineWidth: 5, fadeInFrames: 6, fadeOutFrames: 8},
    roleStyles: {
      main: {textEffect: 'Phrase Pulse', effectIntensity: 6},
      chorus: {inEffect: 'Bounce', outEffect: 'Zoom', textEffect: 'Chorus Burst', effectIntensity: 8, scale: 1.08},
      emphasis: {inEffect: 'Pop', outEffect: 'Zoom', textEffect: 'Shout Impact', effectIntensity: 9, scale: 1.18},
    },
  },
  {
    id: 'beat',
    label: 'ビート同期',
    description: '拍に反応する発光と短いフェードを使います。',
    global: {textEffect: 'Beat Glow', effectSpeed: 8, fadeInFrames: 4, fadeOutFrames: 6},
    roleStyles: {
      main: {inEffect: 'Neon', outEffect: 'Zoom', textEffect: 'Beat Glow', effectIntensity: 7},
      chorus: {inEffect: 'Glow', outEffect: 'Color Cycle', textEffect: 'Beat Strobe', effectIntensity: 8},
      emphasis: {inEffect: 'Pop', outEffect: 'Zoom', textEffect: 'Bass Drop', effectIntensity: 9},
    },
  },
  {
    id: 'cinematic',
    label: '余韻/シネマ',
    description: 'ゆっくりした動きと残響感を足します。',
    global: {textEffect: 'Whisper Fade', effectSpeed: 4, fadeInFrames: 12, fadeOutFrames: 16},
    roleStyles: {
      main: {inEffect: 'Cinematic Pan', outEffect: 'Slow Zoom', textEffect: 'Whisper Fade', effectIntensity: 4},
      chorus: {inEffect: 'Slow Zoom', outEffect: 'Glow', textEffect: 'Phrase Pulse', effectIntensity: 6},
      emphasis: {inEffect: 'Glow', outEffect: 'Blur', textEffect: 'Ghostly Rise', effectIntensity: 6},
    },
  },
] as const;

const STYLE_PRESET_BASES: Record<Exclude<StylePresetCategory, 'All'>, StylePresetBase> = {
  ballad: {
    label: 'バラード',
    category: 'ballad',
    description: '余韻と可読性を重視。明朝寄り、Glow、ゆっくりしたフェード。',
    global: {font: 'Sawarabi Mincho', textEffect: 'Whisper Fade', effectSpeed: 4, textColor: '#f8fafc', backgroundColor: '#05070b', outlineColor: '#172554', outlineWidth: 2, fadeInFrames: 14, fadeOutFrames: 18},
    roleStyles: {
      main: {font: 'Sawarabi Mincho', inEffect: 'Glow', outEffect: 'Slow Zoom', textEffect: 'Whisper Fade', effectIntensity: 4, textColor: '#f8fafc'},
      chorus: {font: 'Sawarabi Mincho', inEffect: 'Slow Zoom', outEffect: 'Glow', textEffect: 'Phrase Pulse', effectIntensity: 5, textColor: '#dbeafe'},
      emphasis: {font: 'Noto Sans JP', inEffect: 'Pop', outEffect: 'Blur', textEffect: 'Flash & Fade', effectIntensity: 6, textColor: '#fde68a'},
    },
  },
  rock: {
    label: 'ロック',
    category: 'rock',
    description: '太字・強い輪郭・Shake系。サビやキメを強く押し出します。',
    global: {font: 'Arial Black', textEffect: 'Shout Impact', effectSpeed: 8, textColor: '#ffffff', backgroundColor: '#12090b', outlineColor: '#000000', outlineWidth: 5, fadeInFrames: 6, fadeOutFrames: 8},
    roleStyles: {
      main: {font: 'Arial Black', inEffect: 'Slide', outEffect: 'Zoom', textEffect: 'Kinetic Impact', effectIntensity: 6, textColor: '#ffffff'},
      chorus: {font: 'Impact', inEffect: 'Shake', outEffect: 'Zoom', textEffect: 'Chorus Burst', effectIntensity: 8, textColor: '#fecaca'},
      emphasis: {font: 'Impact', inEffect: 'Shake', outEffect: 'Zoom', textEffect: 'Bass Drop', effectIntensity: 9, textColor: '#facc15'},
    },
  },
  vocaloid: {
    label: 'ボカロ',
    category: 'vocaloid',
    description: 'ネオン・デジタル感・文字追従。高速な歌詞にも合わせやすい設定。',
    global: {font: 'Murecho', textEffect: 'Karaoke Sweep', effectSpeed: 7, textColor: '#67e8f9', backgroundColor: '#030712', outlineColor: '#083344', outlineWidth: 3, fadeInFrames: 6, fadeOutFrames: 8},
    roleStyles: {
      main: {font: 'Murecho', inEffect: 'Neon', outEffect: 'Glitch', textEffect: 'Karaoke Sweep', effectIntensity: 6, textColor: '#67e8f9'},
      chorus: {font: 'Noto Sans JP', inEffect: 'Neon Flicker', outEffect: 'Color Cycle', textEffect: 'Vocaloid Grid City', effectIntensity: 7, textColor: '#a5b4fc'},
      emphasis: {font: 'Impact', inEffect: 'Pop', outEffect: 'Glitch', textEffect: 'Beat Pop', effectIntensity: 8, textColor: '#f0abfc'},
    },
  },
  rap: {
    label: 'ラップ',
    category: 'rap',
    description: '単語の粒立ち重視。Word Highlightと短いフェードでテンポよく見せます。',
    global: {font: 'Outfit', textEffect: 'Word Highlight', effectSpeed: 8, textColor: '#f9fafb', backgroundColor: '#070707', outlineColor: '#111827', outlineWidth: 4, fadeInFrames: 4, fadeOutFrames: 6},
    roleStyles: {
      main: {font: 'Outfit', inEffect: 'Pop', outEffect: 'Slide', textEffect: 'Word Highlight', effectIntensity: 5, tokenMode: 'word', textColor: '#f9fafb'},
      chorus: {font: 'Arial Black', inEffect: 'Bounce', outEffect: 'Zoom', textEffect: 'Phrase Pulse', effectIntensity: 7, textColor: '#bfdbfe'},
      emphasis: {font: 'Impact', inEffect: 'Shake', outEffect: 'Zoom', textEffect: 'Kinetic Impact', effectIntensity: 8, tokenMode: 'word', textColor: '#facc15'},
    },
  },
  edm: {
    label: 'EDM',
    category: 'edm',
    description: 'Beat系とネオン発光。拍がある曲で強く反応する初期設定。',
    global: {font: 'Outfit', textEffect: 'Beat Glow', effectSpeed: 8, textColor: '#ccfbf1', backgroundColor: '#020617', outlineColor: '#0f172a', outlineWidth: 3, fadeInFrames: 5, fadeOutFrames: 8},
    roleStyles: {
      main: {font: 'Outfit', inEffect: 'Neon', outEffect: 'Zoom', textEffect: 'Beat Glow', effectIntensity: 7, textColor: '#ccfbf1'},
      chorus: {font: 'Arial Black', inEffect: 'Glow', outEffect: 'Color Cycle', textEffect: 'Beat Strobe', effectIntensity: 8, textColor: '#bfdbfe'},
      emphasis: {font: 'Impact', inEffect: 'Pop', outEffect: 'Zoom', textEffect: 'Bass Drop', effectIntensity: 9, textColor: '#facc15'},
    },
  },
  anime: {
    label: 'アニメOP',
    category: 'anime',
    description: '明るい色・大きめの動き・サビ強調。読みやすさと勢いの両立。',
    global: {font: 'Noto Sans JP', textEffect: 'Pop In', effectSpeed: 7, textColor: '#ffffff', backgroundColor: '#08111d', outlineColor: '#1e3a8a', outlineWidth: 4, fadeInFrames: 6, fadeOutFrames: 10},
    roleStyles: {
      main: {font: 'Noto Sans JP', inEffect: 'Slide', outEffect: 'Glow', textEffect: 'Pop In', effectIntensity: 6, textColor: '#ffffff'},
      chorus: {font: 'Murecho', inEffect: 'Bounce', outEffect: 'Zoom', textEffect: 'Chorus Burst', effectIntensity: 8, textColor: '#fde68a'},
      emphasis: {font: 'Impact', inEffect: 'Pop', outEffect: 'Zoom', textEffect: 'Shout Impact', effectIntensity: 8, textColor: '#facc15'},
    },
  },
  cityPop: {
    label: 'シティポップ',
    category: 'cityPop',
    description: '都会的な夜景感、ネオン、軽いグルーヴを重視します。',
    global: {font: 'Outfit', textEffect: 'Lyric Scan', effectSpeed: 6, textColor: '#fdf2f8', backgroundColor: '#071013', outlineColor: '#164e63', outlineWidth: 3, fadeInFrames: 8, fadeOutFrames: 12},
    roleStyles: {
      main: {font: 'Outfit', inEffect: 'Floating', outEffect: 'Slow Zoom', textEffect: 'Lyric Scan', effectIntensity: 5, textColor: '#fdf2f8'},
      chorus: {font: 'Trebuchet MS', inEffect: 'Neon', outEffect: 'Color Cycle', textEffect: 'Phrase Pulse', effectIntensity: 7, textColor: '#a7f3d0'},
      emphasis: {font: 'Impact', inEffect: 'Pop', outEffect: 'Zoom', textEffect: 'Flash & Fade', effectIntensity: 7, textColor: '#f9a8d4'},
    },
  },
  idol: {
    label: 'アイドル',
    category: 'idol',
    description: '明るく可愛い色、跳ねる動き、サビの華やかさを優先します。',
    global: {font: 'Murecho', textEffect: 'Pop In', effectSpeed: 7, textColor: '#ffffff', backgroundColor: '#2a0f2f', outlineColor: '#be185d', outlineWidth: 4, fadeInFrames: 5, fadeOutFrames: 8},
    roleStyles: {
      main: {font: 'Murecho', inEffect: 'Bounce', outEffect: 'Glow', textEffect: 'Pop In', effectIntensity: 6, textColor: '#ffffff'},
      chorus: {font: 'Noto Sans JP', inEffect: 'Color Cycle', outEffect: 'Zoom', textEffect: 'Chorus Burst', effectIntensity: 8, textColor: '#fde68a'},
      emphasis: {font: 'Arial Black', inEffect: 'Pop', outEffect: 'Zoom', textEffect: 'Beat Pop', effectIntensity: 8, textColor: '#f0abfc'},
    },
  },
  enka: {
    label: '和風/演歌寄り',
    category: 'enka',
    description: '和文の重み、間、ゆったりした登場を重視します。',
    global: {font: 'Yu Mincho', textEffect: 'Whisper Fade', effectSpeed: 4, textColor: '#fff7ed', backgroundColor: '#100b08', outlineColor: '#3f1d0b', outlineWidth: 3, fadeInFrames: 14, fadeOutFrames: 18},
    roleStyles: {
      main: {font: 'Yu Mincho', inEffect: 'Solemn Scale', outEffect: 'Shadow Drift', textEffect: 'Whisper Fade', effectIntensity: 4, textColor: '#fff7ed'},
      chorus: {font: 'New Tegomin', inEffect: 'Slow Zoom', outEffect: 'Glow', textEffect: 'Ghostly Rise', effectIntensity: 6, textColor: '#fde68a'},
      emphasis: {font: 'New Tegomin', inEffect: 'Glow', outEffect: 'Blur', textEffect: 'Flash & Fade', effectIntensity: 6, textColor: '#fca5a5'},
    },
  },
  dark: {
    label: 'ダーク/病み系',
    category: 'dark',
    description: '暗い背景、歪み、壊れそうな文字の質感を使います。',
    global: {font: 'MS Gothic', textEffect: 'TV Static Reveal', effectSpeed: 6, textColor: '#e9d5ff', backgroundColor: '#050006', outlineColor: '#1e1b4b', outlineWidth: 4, fadeInFrames: 8, fadeOutFrames: 12},
    roleStyles: {
      main: {font: 'MS Gothic', inEffect: 'Glitch', outEffect: 'Blur', textEffect: 'TV Static Reveal', effectIntensity: 6, textColor: '#e9d5ff'},
      chorus: {font: 'Arial Black', inEffect: 'Chromatic Aberration', outEffect: 'Glitch', textEffect: 'Liquid Melt', effectIntensity: 8, textColor: '#fca5a5'},
      emphasis: {font: 'Impact', inEffect: 'Shake', outEffect: 'Glitch', textEffect: 'Shatter Fade', effectIntensity: 9, textColor: '#fb7185'},
    },
  },
  chill: {
    label: 'チル/Lo-fi',
    category: 'chill',
    description: '控えめな動き、淡い色、余白を残す見せ方にします。',
    global: {font: 'Inter', textEffect: 'Whisper Fade', effectSpeed: 3, textColor: '#dbeafe', backgroundColor: '#07111a', outlineColor: '#0f172a', outlineWidth: 2, fadeInFrames: 14, fadeOutFrames: 18},
    roleStyles: {
      main: {font: 'Inter', inEffect: 'Floating', outEffect: 'Slow Zoom', textEffect: 'Whisper Fade', effectIntensity: 3, textColor: '#dbeafe'},
      chorus: {font: 'Georgia', inEffect: 'Glow', outEffect: 'Blur', textEffect: 'Phrase Pulse', effectIntensity: 5, textColor: '#bbf7d0'},
      emphasis: {font: 'Outfit', inEffect: 'Pop', outEffect: 'Blur', textEffect: 'Flash & Fade', effectIntensity: 5, textColor: '#fde68a'},
    },
  },
  bandBallad: {
    label: 'バンドバラード',
    category: 'bandBallad',
    description: 'バンドの熱量とバラードの余韻を両立します。',
    global: {font: 'Yu Gothic', textEffect: 'Phrase Pulse', effectSpeed: 5, textColor: '#fef3c7', backgroundColor: '#0f1115', outlineColor: '#111827', outlineWidth: 4, fadeInFrames: 10, fadeOutFrames: 14},
    roleStyles: {
      main: {font: 'Yu Gothic', inEffect: 'Slow Zoom', outEffect: 'Glow', textEffect: 'Phrase Pulse', effectIntensity: 5, textColor: '#fef3c7'},
      chorus: {font: 'Arial Black', inEffect: 'Slide', outEffect: 'Zoom', textEffect: 'Chorus Burst', effectIntensity: 7, textColor: '#ffffff'},
      emphasis: {font: 'Impact', inEffect: 'Shake', outEffect: 'Zoom', textEffect: 'Shout Impact', effectIntensity: 8, textColor: '#facc15'},
    },
  },
};

const STYLE_PRESET_OPTIONS = (STYLE_PRESET_CATEGORIES.filter((category) => category !== 'All') as Exclude<StylePresetCategory, 'All'>[])
  .flatMap((category) => STYLE_PRESET_VARIANTS.map((variant) => {
    const base = STYLE_PRESET_BASES[category];
    const id = `${category}-${variant.id}`;
    return {
      id,
      label: variant.id === 'standard' ? base.label : `${base.label} / ${variant.label}`,
      description: `${base.description} ${variant.description}`,
      category,
      variant: variant.label,
      global: {...base.global, ...variant.global},
      roleStyles: mergeRoleStyles(base.roleStyles, variant.roleStyles),
    };
  }));

const STYLE_PRESETS: Record<StylePresetName, StylePreset> = Object.fromEntries(
  STYLE_PRESET_OPTIONS.map((preset) => [preset.id, preset])
);

const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  All: 'すべて',
  Readable: '読みやすい',
  Impact: 'インパクト',
  Emotional: 'エモーショナル',
  Cute: 'ポップ',
  Japanese: '和風',
  Cyber: 'サイバー',
};

const TOKEN_MODE_LABELS: Record<LyricTokenMode, string> = {
  auto: 'Auto',
  word: 'Word',
  mora: 'Mora',
  char: 'Character',
};

const keyframeLabel = (property: LyricKeyframeProperty | undefined) =>
  KEYFRAME_PROPERTIES.find((item) => item.value === property)?.label ?? property ?? '設定';

const LYRIC_ROLE_VALUES: readonly LyricRole[] = ['main', 'chorus', 'emphasis', 'overlap', 'adlib', 'english', 'instrumental'];

const toFiniteNumber = (value: unknown, fallback: number) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const clampFrameValue = (value: unknown, fallback: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(toFiniteNumber(value, fallback))));

const normalizeGlobalSettings = (raw: unknown, fallback: GlobalSettings): GlobalSettings => {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<GlobalSettings>;
  return {
    ...fallback,
    ...value,
    font: FONT_OPTIONS.includes(value.font as (typeof FONT_OPTIONS)[number]) ? String(value.font) : fallback.font,
    textEffect: TEXT_EFFECT_OPTIONS.includes(value.textEffect as (typeof TEXT_EFFECT_OPTIONS)[number]) ? String(value.textEffect) : fallback.textEffect,
    effectSpeed: Math.max(1, Math.min(10, toFiniteNumber(value.effectSpeed, fallback.effectSpeed))),
    textColor: typeof value.textColor === 'string' ? value.textColor : fallback.textColor,
    backgroundColor: typeof value.backgroundColor === 'string' ? value.backgroundColor : fallback.backgroundColor,
    outlineColor: typeof value.outlineColor === 'string' ? value.outlineColor : fallback.outlineColor,
    outlineWidth: Math.max(0, Math.min(12, toFiniteNumber(value.outlineWidth, fallback.outlineWidth ?? 2))),
    fadeInFrames: Math.max(0, Math.round(toFiniteNumber(value.fadeInFrames, fallback.fadeInFrames ?? 8))),
    fadeOutFrames: Math.max(0, Math.round(toFiniteNumber(value.fadeOutFrames, fallback.fadeOutFrames ?? 8))),
  };
};

const normalizeImportedLyric = (
  raw: unknown,
  index: number,
  fallback: GlobalSettings,
  durationInFrames: number,
): {lyric: LyricBlock; fixes: string[]} => {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<LyricBlock>;
  const fixes: string[] = [];
  const text = typeof value.text === 'string' && value.text.trim() ? value.text : `Lyric ${index + 1}`;
  if (text !== value.text) fixes.push(`${index + 1}: 空の歌詞を仮テキストへ補正`);

  const startFrame = clampFrameValue(value.startFrame, index * 45, 0, Math.max(0, durationInFrames - 1));
  const endFrame = Math.max(startFrame + 1, clampFrameValue(value.endFrame, startFrame + 45, startFrame + 1, durationInFrames));
  if (startFrame !== value.startFrame || endFrame !== value.endFrame) fixes.push(`${index + 1}: start/endFrameを動画尺内へ補正`);

  const tokenMode: LyricTokenMode = ['auto', 'word', 'mora', 'char'].includes(String(value.tokenMode))
    ? value.tokenMode as LyricTokenMode
    : 'auto';
  const effect = EFFECT_OPTIONS.includes(value.effect as (typeof EFFECT_OPTIONS)[number]) ? String(value.effect) : 'None';
  const inEffect = EFFECT_OPTIONS.includes(value.inEffect as (typeof EFFECT_OPTIONS)[number]) ? String(value.inEffect) : effect;
  const outEffect = EFFECT_OPTIONS.includes(value.outEffect as (typeof EFFECT_OPTIONS)[number]) ? String(value.outEffect) : 'None';
  const textEffect = TEXT_EFFECT_OPTIONS.includes(value.textEffect as (typeof TEXT_EFFECT_OPTIONS)[number]) ? String(value.textEffect) : fallback.textEffect;
  const font = FONT_OPTIONS.includes(value.font as (typeof FONT_OPTIONS)[number]) ? String(value.font) : fallback.font;
  if (effect !== value.effect || textEffect !== value.textEffect || font !== value.font) fixes.push(`${index + 1}: 未知のフォント/エフェクトを既知の値へ補正`);

  const baseLyric: LyricBlock = {
    id: typeof value.id === 'string' && value.id ? value.id : `imported-${Date.now()}-${index}`,
    text,
    track: Math.max(0, Math.round(toFiniteNumber(value.track, 0))),
    startFrame,
    endFrame,
    scale: Math.max(0.1, Math.min(4, toFiniteNumber(value.scale, 1))),
    x: toFiniteNumber(value.x, 0),
    y: toFiniteNumber(value.y, 0),
    rotation: toFiniteNumber(value.rotation, 0),
    effect,
    inEffect,
    outEffect,
    effectIntensity: Math.max(0, Math.min(10, toFiniteNumber(value.effectIntensity, 5))),
    effectStartFrame: clampFrameValue(value.effectStartFrame, startFrame, startFrame, endFrame - 1),
    effectEndFrame: clampFrameValue(value.effectEndFrame, endFrame, startFrame + 1, endFrame),
    effectSwitchFrame: clampFrameValue(value.effectSwitchFrame, Math.round((startFrame + endFrame) / 2), startFrame + 1, Math.max(startFrame + 1, endFrame - 1)),
    fadeInFrames: Math.max(0, Math.round(toFiniteNumber(value.fadeInFrames, fallback.fadeInFrames ?? 8))),
    fadeOutFrames: Math.max(0, Math.round(toFiniteNumber(value.fadeOutFrames, fallback.fadeOutFrames ?? 8))),
    fadeInPattern: value.fadeInPattern ?? fallback.fadeInPattern ?? 'Linear',
    fadeOutPattern: value.fadeOutPattern ?? fallback.fadeOutPattern ?? 'Linear',
    font,
    textEffect,
    effectSpeed: Math.max(1, Math.min(10, toFiniteNumber(value.effectSpeed, fallback.effectSpeed))),
    textColor: typeof value.textColor === 'string' ? value.textColor : fallback.textColor,
    textBackgroundColor: typeof value.textBackgroundColor === 'string' ? value.textBackgroundColor : fallback.textBackgroundColor ?? 'transparent',
    outlineColor: typeof value.outlineColor === 'string' ? value.outlineColor : fallback.outlineColor,
    outlineWidth: Math.max(0, Math.min(12, toFiniteNumber(value.outlineWidth, fallback.outlineWidth ?? 2))),
    tokenMode,
    role: LYRIC_ROLE_VALUES.includes(value.role as LyricRole) ? value.role : undefined,
    keyframes: Array.isArray(value.keyframes)
      ? value.keyframes
          .map((keyframe, keyframeIndex) => {
            const item = keyframe as NonNullable<LyricBlock['keyframes']>[number];
            const property = KEYFRAME_PROPERTIES.some((candidate) => candidate.value === item.property) ? item.property : undefined;
            return {
              ...item,
              id: item.id ?? `imported-kf-${index}-${keyframeIndex}`,
              property,
              frame: clampFrameValue(item.frame, startFrame, startFrame, endFrame),
            };
          })
          .filter((keyframe) => keyframe.property || keyframe.x !== undefined || keyframe.y !== undefined || keyframe.scale !== undefined)
      : undefined,
  };

  const tokens = Array.isArray(value.tokens)
    ? value.tokens
        .map((token, tokenIndex) => {
          const item = token as NonNullable<LyricBlock['tokens']>[number];
          const tokenStart = clampFrameValue(item.startFrame, startFrame, startFrame, endFrame - 1);
          return {
            id: item.id ?? `imported-token-${index}-${tokenIndex}`,
            text: typeof item.text === 'string' ? item.text : '',
            index: Math.round(toFiniteNumber(item.index, tokenIndex)),
            startFrame: tokenStart,
            endFrame: clampFrameValue(item.endFrame, tokenStart + 1, tokenStart + 1, endFrame),
          };
        })
        .filter((token) => token.text.trim())
        .sort((a, b) => a.startFrame - b.startFrame || a.index - b.index)
    : undefined;

  if (Array.isArray(value.tokens) && tokens?.length !== value.tokens.length) fixes.push(`${index + 1}: tokenを範囲内へ補正`);
  return {
    lyric: tokens && tokens.length > 0 ? {...baseLyric, tokens} : withGeneratedTokens(baseLyric, tokenMode),
    fixes,
  };
};

const normalizeBeatMarkers = (markers: unknown[]): BeatMarker[] =>
  markers
    .map((marker) => marker as Partial<BeatMarker>)
    .filter((marker) => Number.isFinite(marker.frame))
    .map((marker, index) => ({
      id: marker.id ?? `imported-beat-${Math.round(Number(marker.frame))}-${index}`,
      frame: Math.max(0, Math.round(Number(marker.frame))),
      strength: Math.max(0.1, Math.min(1, Number(marker.strength ?? 0.7))),
      source: marker.source ?? 'imported',
    }))
    .sort((a, b) => a.frame - b.frame);

const numericKeyframes = new Set<LyricKeyframeProperty>([
  'x',
  'y',
  'scale',
  'rotation',
  'outlineWidth',
  'effectIntensity',
  'effectStartFrame',
  'effectEndFrame',
  'effectSwitchFrame',
  'fadeInFrames',
  'fadeOutFrames',
  'effectSpeed',
]);

const EffectPreview: React.FC<{
  effect: string;
  kind: 'effect' | 'textEffect';
}> = ({effect, kind}) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setFrame((value) => (value + 1) % 90), 33);
    return () => window.clearInterval(id);
  }, []);

  const context = {
    frame,
    startFrame: 0,
    endFrame: 90,
    speed: 5,
    intensity: 6,
    beatIntensity: Math.pow(Math.max(0, Math.sin(frame * 0.35)), 8),
  };
  const isThreePreview =
    kind === 'textEffect' && THREE_TEXT_EFFECT_OPTIONS.includes(effect as (typeof THREE_TEXT_EFFECT_OPTIONS)[number]);
  const previewLyric: LyricBlock = {
    id: `preview-${effect}`,
    text: 'テスト',
    track: 0,
    startFrame: 0,
    endFrame: 90,
    scale: isThreePreview ? 0.72 : 1,
    x: 0,
    y: 0,
    rotation: 0,
    effect: kind === 'effect' ? effect : 'None',
    inEffect: kind === 'effect' ? effect : 'None',
    outEffect: 'None',
    effectIntensity: 6,
    effectStartFrame: 0,
    effectEndFrame: 90,
    effectSwitchFrame: 45,
    fadeInFrames: 8,
    fadeOutFrames: 8,
    fadeInPattern: 'Linear',
    fadeOutPattern: 'Linear',
    font: 'Noto Sans JP',
    textEffect: kind === 'textEffect' ? effect : 'None',
    effectSpeed: 5,
    textColor: '#ffffff',
    textBackgroundColor: 'transparent',
    outlineColor: '#000000',
    outlineWidth: 2,
  };
  const previewSettings: GlobalSettings = {
    font: 'Noto Sans JP',
    textEffect: 'None',
    effectSpeed: 5,
    textColor: '#ffffff',
    backgroundColor: '#05070b',
    outlineColor: '#000000',
    textBackgroundColor: 'transparent',
    outlineWidth: 2,
  };
  const animation =
    isThreePreview
      ? null
      : kind === 'effect'
      ? getDisplayEffectAnimation(effect, context, '#ffffff')
      : getTextEffectAnimation(effect, context, 'テスト');
  const style = animation ? buildAnimatedStyle(animation, '', '0 0 10px rgba(0,0,0,.6)', '#ffffff') : {};

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        height: isThreePreview ? 96 : 54,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 8,
        background: '#05070b',
        marginBottom: 8,
      }}
    >
      {isThreePreview ? (
        <Player
          component={LyricComposition}
          inputProps={{lyrics: [previewLyric], globalSettings: previewSettings}}
          durationInFrames={90}
          fps={30}
          compositionWidth={640}
          compositionHeight={220}
          autoPlay
          loop
          initiallyMuted
          controls={false}
          acknowledgeRemotionLicense
          style={{width: '100%', height: '100%'}}
        />
      ) : (
        <span
          style={{
            display: 'inline-block',
            fontSize: 24,
            fontWeight: 900,
            transformOrigin: 'center',
            ...style,
          }}
        >
          {animation?.text ?? 'テスト'}
        </span>
      )}
    </div>
  );
};

const EffectPicker: React.FC<{
  label: string;
  value: string;
  options: readonly string[];
  kind: 'effect' | 'textEffect';
  onChange: (value: string) => void;
}> = ({label, value, options, kind, onChange}) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(value);
  const [query, setQuery] = useState('');
  const [purpose, setPurpose] = useState<EffectPurpose>('All');
  const [category, setCategory] = useState<EffectCategory>('All');
  const categories = kind === 'effect' ? EFFECT_CATEGORIES : TEXT_EFFECT_CATEGORIES;
  const getCategory = kind === 'effect' ? getEffectCategory : getTextEffectCategory;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    const metadata = getEffectMetadata(option, kind);
    const searchable = [
      metadata.name,
      metadata.displayName,
      metadata.description,
      ...metadata.tags,
    ].join(' ').toLowerCase();
    const matchesCategory = category === 'All' || getCategory(option) === category;
    const matchesPurpose = purpose === 'All' || metadata.purpose === purpose;
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    return matchesCategory && matchesPurpose && matchesQuery;
  });
  const previewEffect = filteredOptions.includes(hovered) ? hovered : filteredOptions[0] ?? value;
  const selectedMetadata = getEffectMetadata(value, kind);
  const previewMetadata = getEffectMetadata(previewEffect, kind);

  return (
    <div style={fieldStyle}>
      <label>{label}</label>
      <button
        type="button"
        onClick={() => {
          setHovered(value);
          setQuery('');
          setPurpose(value === 'None' ? 'All' : getEffectMetadata(value, kind).purpose);
          setCategory(value === 'None' ? 'All' : getCategory(value));
          setOpen((current) => !current);
        }}
        style={{
          width: '100%',
          padding: '9px 10px',
          borderRadius: 8,
          border: '1px solid #374151',
          background: '#111827',
          color: '#f3f4f6',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{display: 'block', fontWeight: 800}}>{selectedMetadata.displayName}</span>
        <span style={{display: 'block', color: '#9ca3af', fontSize: 11, marginTop: 3}}>
          {EFFECT_PURPOSE_LABELS[selectedMetadata.purpose]} / {EFFECT_CATEGORY_LABELS[getCategory(value)]}
        </span>
      </button>
      {open && (
        <div
          style={{
            border: '1px solid #374151',
            borderRadius: 8,
            background: '#0b1020',
            padding: 8,
            boxShadow: '0 12px 28px rgba(0,0,0,.35)',
          }}
        >
          <EffectPreview effect={previewEffect} kind={kind} />
          <div style={{marginBottom: 8}}>
            <div style={{fontSize: 12, color: '#f3f4f6', fontWeight: 800}}>{previewMetadata.displayName}</div>
            <div style={{fontSize: 11, color: '#9ca3af', lineHeight: 1.5}}>{previewMetadata.description}</div>
          </div>
          <input
            type="search"
            placeholder="エフェクト名・用途で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #374151',
              background: '#111827',
              color: '#f3f4f6',
              marginBottom: 8,
            }}
          />
          <div style={{fontSize: 10, color: '#64748b', fontWeight: 800, margin: '2px 0 6px'}}>目的</div>
          <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8}}>
            {EFFECT_PURPOSES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setPurpose(item);
                  setHovered(value);
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: 999,
                  border: '1px solid #374151',
                  background: purpose === item ? '#0f766e' : '#111827',
                  color: purpose === item ? '#ffffff' : '#cbd5e1',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {EFFECT_PURPOSE_LABELS[item]}
              </button>
            ))}
          </div>
          <div style={{fontSize: 10, color: '#64748b', fontWeight: 800, margin: '2px 0 6px'}}>種類</div>
          <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8}}>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setCategory(item);
                  setHovered(value);
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: 999,
                  border: '1px solid #374151',
                  background: category === item ? '#2563eb' : '#111827',
                  color: category === item ? '#ffffff' : '#cbd5e1',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {EFFECT_CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>
          <div style={{maxHeight: 260, overflowY: 'auto', paddingRight: 2}}>
            {filteredOptions.length === 0 && (
              <div style={{padding: '12px 10px', color: '#9ca3af', fontSize: 12}}>該当するエフェクトがありません。</div>
            )}
            {filteredOptions.map((option) => {
              const metadata = getEffectMetadata(option, kind);
              return (
                <button
                  key={option}
                  type="button"
                  onMouseEnter={() => setHovered(option)}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    border: 'none',
                    borderRadius: 6,
                    background: option === value ? '#2563eb' : 'transparent',
                    color: option === value ? '#ffffff' : '#d1d5db',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{display: 'block', fontSize: 13, fontWeight: 800}}>{metadata.displayName}</span>
                  <span style={{display: 'block', fontSize: 11, color: option === value ? '#dbeafe' : '#94a3b8', lineHeight: 1.4}}>
                    {metadata.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FontPicker: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({label, value, onChange}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FontCategory>('All');
  const selectedMetadata = getFontMetadata(value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredFonts = FONT_OPTIONS.filter((font) => {
    const metadata = getFontMetadata(font);
    const searchable = [
      metadata.name,
      metadata.displayName,
      metadata.description,
      ...metadata.tags,
    ].join(' ').toLowerCase();
    const matchesCategory = category === 'All' || metadata.category === category;
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  return (
    <div style={fieldStyle}>
      <label>{label}</label>
      <button
        type="button"
        onClick={() => {
          setCategory(selectedMetadata.category);
          setQuery('');
          setOpen((current) => !current);
        }}
        style={{
          width: '100%',
          padding: '9px 10px',
          borderRadius: 8,
          border: '1px solid #374151',
          background: '#111827',
          color: '#f3f4f6',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{display: 'block', fontFamily: value, fontSize: 20, fontWeight: 800, lineHeight: 1.2}}>
          {selectedMetadata.sample}
        </span>
        <span style={{display: 'block', color: '#9ca3af', fontSize: 11, marginTop: 4}}>
          {selectedMetadata.displayName} / {FONT_CATEGORY_LABELS[selectedMetadata.category]}
        </span>
      </button>
      {open && (
        <div
          style={{
            border: '1px solid #374151',
            borderRadius: 8,
            background: '#0b1020',
            padding: 8,
            boxShadow: '0 12px 28px rgba(0,0,0,.35)',
          }}
        >
          <input
            type="search"
            placeholder="フォント名・用途で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #374151',
              background: '#111827',
              color: '#f3f4f6',
              marginBottom: 8,
            }}
          />
          <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8}}>
            {FONT_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                style={{
                  padding: '5px 8px',
                  borderRadius: 999,
                  border: '1px solid #374151',
                  background: category === item ? '#7c3aed' : '#111827',
                  color: category === item ? '#ffffff' : '#cbd5e1',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {FONT_CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>
          <div style={{maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6}}>
            {filteredFonts.length === 0 && (
              <div style={{padding: '12px 10px', color: '#9ca3af', fontSize: 12}}>該当するフォントがありません。</div>
            )}
            {filteredFonts.map((font) => {
              const metadata = getFontMetadata(font);
              return (
                <button
                  key={font}
                  type="button"
                  onClick={() => {
                    onChange(font);
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: 10,
                    border: 'none',
                    borderRadius: 6,
                    background: font === value ? '#2563eb' : 'transparent',
                    color: font === value ? '#ffffff' : '#d1d5db',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{display: 'block', fontFamily: font, fontSize: 22, fontWeight: 800, lineHeight: 1.25}}>
                    {metadata.sample}
                  </span>
                  <span style={{display: 'block', fontSize: 12, fontWeight: 800, marginTop: 4}}>
                    {metadata.displayName}
                  </span>
                  <span style={{display: 'block', fontSize: 11, color: font === value ? '#dbeafe' : '#94a3b8', lineHeight: 1.4}}>
                    {metadata.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const EditorTabs: React.FC<EditorTabsProps> = ({
  lyrics,
  setLyrics,
  selectedId,
  setSelectedId,
  globalSettings,
  setGlobalSettings,
  audioFile,
  setAudioFile,
  beatMarkers,
  setBeatMarkers,
  durationInFrames,
  currentFrame,
  trackCount,
  setTrackCount,
  applyProjectStateUpdate,
  activeTab,
  setActiveTab,
  onAddLyric,
  onDeleteLyric,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const selectedBlock = lyrics.find((lyric) => lyric.id === selectedId);
  const selectedTokens = selectedBlock ? getLyricTokens(selectedBlock) : [];
  const [keyframeProperty, setKeyframeProperty] = useState<LyricKeyframeProperty>('x');
  const [keyframeValue, setKeyframeValue] = useState('');
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    kind: 'idle',
    message: '透明背景のProRes 4444 MOVを書き出します。',
  });
  const [lrcDurationMode, setLrcDurationMode] = useState<LrcDurationMode>('nextMinus');
  const [lrcEarlyEndFrames, setLrcEarlyEndFrames] = useState(6);
  const [lrcMinDisplayFrames, setLrcMinDisplayFrames] = useState(24);
  const [lrcAutoClassify, setLrcAutoClassify] = useState(true);
  const [timingAdjustScope, setTimingAdjustScope] = useState<TimingAdjustScope>('selected');
  const [timingAdjustFrames, setTimingAdjustFrames] = useState(3);
  const [selectedStylePresetCategory, setSelectedStylePresetCategory] = useState<StylePresetCategory>('All');
  const [selectedStylePreset, setSelectedStylePreset] = useState<StylePresetName>('vocaloid-standard');
  const [projectImportReport, setProjectImportReport] = useState<ProjectImportReport | null>(null);
  const [workflowReport, setWorkflowReport] = useState<WorkflowReport | null>(null);
  const [workflowPreview, setWorkflowPreview] = useState<WorkflowPreview | null>(null);

  useEffect(() => {
    setWorkflowPreview(null);
  }, [globalSettings, lrcAutoClassify, lrcDurationMode, lrcEarlyEndFrames, lrcMinDisplayFrames, lyrics, selectedStylePreset, selectedStylePresetCategory]);

  const filteredStylePresetOptions = useMemo(
    () => STYLE_PRESET_OPTIONS.filter((preset) => selectedStylePresetCategory === 'All' || preset.category === selectedStylePresetCategory),
    [selectedStylePresetCategory]
  );

  useEffect(() => {
    if (filteredStylePresetOptions.some((preset) => preset.id === selectedStylePreset)) return;
    setSelectedStylePreset(filteredStylePresetOptions[0]?.id ?? 'vocaloid-standard');
  }, [filteredStylePresetOptions, selectedStylePreset]);

  const lyricIssues = useMemo<LyricIssue[]>(() => {
    const issues: LyricIssue[] = [];
    const sortedLyrics = [...lyrics].sort((a, b) => a.startFrame - b.startFrame || a.track - b.track);
    sortedLyrics.forEach((lyric) => {
      const duration = lyric.endFrame - lyric.startFrame;
      if (!lyric.text.trim()) {
        issues.push({id: `${lyric.id}-empty`, kind: 'empty', severity: 'error', lyricId: lyric.id, message: '空の歌詞ブロックがあります。'});
      }
      if (duration < 18) {
        issues.push({id: `${lyric.id}-short`, kind: 'short', severity: 'warning', lyricId: lyric.id, message: `表示時間が短めです: ${duration}f`});
      }
      if (lyric.text.length >= 28) {
        issues.push({id: `${lyric.id}-long`, kind: 'long', severity: 'warning', lyricId: lyric.id, message: `1行が長めです: ${lyric.text.length}文字`});
      }
      if (lyric.endFrame > durationInFrames) {
        issues.push({id: `${lyric.id}-out`, kind: 'outOfRange', severity: 'warning', lyricId: lyric.id, message: '動画尺の外まで表示されています。'});
      }
      if (/Beat|Bass|Pulse/i.test(`${lyric.effect} ${lyric.textEffect}`) && beatMarkers.length === 0) {
        issues.push({id: `${lyric.id}-beat`, kind: 'beatMissing', severity: 'info', lyricId: lyric.id, message: 'Beat系演出ですが、ビート情報がありません。'});
      }
      const sameTrackOverlaps = lyrics.some((other) =>
        other.id !== lyric.id &&
        other.track === lyric.track &&
        other.startFrame < lyric.endFrame &&
        other.endFrame > lyric.startFrame
      );
      if (sameTrackOverlaps) {
        issues.push({id: `${lyric.id}-overlap`, kind: 'overlap', severity: 'warning', lyricId: lyric.id, message: `同じトラックで重なっています: ${LYRIC_ROLE_LABELS[lyric.role ?? 'main']}`});
      }
    });
    if (!audioFile) {
      issues.push({id: 'audio-missing', kind: 'audioMissing', severity: 'info', message: '音楽ファイルを読み込むと、歌詞の見直しがしやすくなります。'});
    }
    return issues;
  }, [audioFile, beatMarkers.length, durationInFrames, lyrics]);

  const issueCounts = useMemo(() => ({
    error: lyricIssues.filter((issue) => issue.severity === 'error').length,
    warning: lyricIssues.filter((issue) => issue.severity === 'warning').length,
    info: lyricIssues.filter((issue) => issue.severity === 'info').length,
  }), [lyricIssues]);

  const emphasisCandidates = useMemo<EmphasisCandidate[]>(() => {
    const candidateMap = new Map<string, EmphasisCandidate>();
    lyrics
      .filter((lyric) => lyric.role !== 'emphasis' && lyric.track !== 2)
      .forEach((lyric) => {
        extractTermsFromText(lyric.text).forEach((term) => {
          const key = term.toLowerCase();
          const existing = candidateMap.get(key) ?? {term, count: 0, sourceLyricIds: [], score: 0};
          existing.count += 1;
          existing.sourceLyricIds.push(lyric.id);
          existing.score +=
            (lyric.role === 'chorus' ? 4 : 0) +
            (lyric.role === 'adlib' ? 3 : 0) +
            (lyric.text.length <= 10 ? 2 : 0) +
            (/[!！]/.test(lyric.text) ? 3 : 0) +
            Math.min(6, term.length);
          candidateMap.set(key, existing);
        });
      });
    return [...candidateMap.values()]
      .filter((candidate) => !lyrics.some((lyric) => lyric.role === 'emphasis' && lyric.text.trim().toLowerCase() === candidate.term.toLowerCase()))
      .sort((a, b) => b.score - a.score || b.count - a.count || a.term.localeCompare(b.term))
      .slice(0, 12);
  }, [lyrics]);

  const densitySegments = useMemo<DensitySegment[]>(() => {
    const segmentCount = 8;
    const segmentLength = Math.max(1, Math.ceil(durationInFrames / segmentCount));
    return Array.from({length: segmentCount}, (_, index) => {
      const startFrame = index * segmentLength;
      const endFrame = Math.min(durationInFrames, startFrame + segmentLength);
      const activeLyrics = lyrics.filter((lyric) => lyric.startFrame < endFrame && lyric.endFrame > startFrame);
      const charCount = activeLyrics.reduce((sum, lyric) => sum + lyric.text.replace(/\s/g, '').length, 0);
      let maxOverlap = 0;
      for (let frame = startFrame; frame < endFrame; frame += Math.max(1, Math.round((endFrame - startFrame) / 6))) {
        maxOverlap = Math.max(maxOverlap, activeLyrics.filter((lyric) => lyric.startFrame <= frame && lyric.endFrame > frame).length);
      }
      const seconds = Math.max(1 / 30, (endFrame - startFrame) / 30);
      const level = getDensityLevel(charCount / seconds, maxOverlap);
      return {
        id: `density-${index}`,
        startFrame,
        endFrame,
        lyricIds: activeLyrics.map((lyric) => lyric.id),
        charCount,
        maxOverlap,
        level,
        recommendation: getDensityRecommendation(level),
      };
    });
  }, [durationInFrames, lyrics]);

  const lyricSections = useMemo<LyricSection[]>(() => {
    const editableLyrics = [...lyrics]
      .filter((lyric) => lyric.role !== 'emphasis' && lyric.track !== 2)
      .sort((a, b) => a.startFrame - b.startFrame || a.track - b.track);
    if (editableLyrics.length === 0) return [];

    const normalizedCounts = new Map<string, number>();
    editableLyrics.forEach((lyric) => {
      const key = normalizeCandidate(lyric.text).toLowerCase();
      if (!key) return;
      normalizedCounts.set(key, (normalizedCounts.get(key) ?? 0) + 1);
    });

    const groups: LyricBlock[][] = [];
    editableLyrics.forEach((lyric) => {
      const previousGroup = groups[groups.length - 1];
      const previousLyric = previousGroup?.[previousGroup.length - 1];
      const gap = previousLyric ? lyric.startFrame - previousLyric.endFrame : 0;
      if (!previousGroup || gap >= 60) {
        groups.push([lyric]);
      } else {
        previousGroup.push(lyric);
      }
    });

    return groups.map((group, index) => {
      const startFrame = group[0]?.startFrame ?? 0;
      const endFrame = group[group.length - 1]?.endFrame ?? startFrame + 1;
      const charCount = group.reduce((sum, lyric) => sum + lyric.text.replace(/\s/g, '').length, 0);
      const repeatedLines = group.filter((lyric) => (normalizedCounts.get(normalizeCandidate(lyric.text).toLowerCase()) ?? 0) >= 2).length;
      const seconds = Math.max(1 / 30, (endFrame - startFrame) / 30);
      const charsPerSecond = charCount / seconds;
      const isFirst = index === 0;
      const isLast = index === groups.length - 1;
      const kind: LyricSectionKind = repeatedLines >= Math.max(2, Math.ceil(group.length * 0.35))
        ? 'chorus'
        : charsPerSecond >= 18
        ? 'dense'
        : charsPerSecond <= 4 && group.length <= 2
        ? 'space'
        : isFirst && startFrame > 30
        ? 'intro'
        : isLast && endFrame > durationInFrames * 0.75
        ? 'outro'
        : group.length <= 2
        ? 'bridge'
        : 'verse';
      return {
        id: `section-${index}`,
        kind,
        label: `${SECTION_KIND_LABELS[kind]} ${index + 1}`,
        startFrame,
        endFrame,
        lyricIds: group.map((lyric) => lyric.id),
        charCount,
        repeatedLines,
      };
    });
  }, [durationInFrames, lyrics]);

  const applyDensityToLyric = (lyric: LyricBlock): LyricBlock => {
    const duration = Math.max(1, lyric.endFrame - lyric.startFrame);
    const charsPerSecond = lyric.text.replace(/\s/g, '').length / (duration / 30);
    if (charsPerSecond >= 16 || duration < 36) {
      return {
        ...lyric,
        effect: lyric.role === 'emphasis' ? lyric.effect : 'None',
        inEffect: lyric.role === 'emphasis' ? lyric.inEffect : 'None',
        outEffect: lyric.role === 'emphasis' ? lyric.outEffect : 'None',
        textEffect: lyric.role === 'emphasis' ? lyric.textEffect : 'Karaoke Sweep',
        fadeInFrames: Math.min(lyric.fadeInFrames ?? 8, 6),
        fadeOutFrames: Math.min(lyric.fadeOutFrames ?? 8, 6),
      };
    }
    if (charsPerSecond <= 5 && duration >= 60 && lyric.role !== 'emphasis') {
      return {
        ...lyric,
        inEffect: lyric.inEffect === 'None' ? 'Glow' : lyric.inEffect,
        outEffect: lyric.outEffect === 'None' ? 'Slow Zoom' : lyric.outEffect,
        textEffect: lyric.textEffect === 'None' ? 'Phrase Pulse' : lyric.textEffect,
        fadeInFrames: Math.max(lyric.fadeInFrames ?? 8, 10),
        fadeOutFrames: Math.max(lyric.fadeOutFrames ?? 8, 12),
      };
    }
    return lyric;
  };

  const applyDensityFriendlyEffects = () => {
    setLyrics((prev) => prev.map(applyDensityToLyric));
    setWorkflowReport({
      title: '密度に合わせて演出を整理',
      changedBlocks: lyrics.length,
      messages: ['詰まった区間は軽い演出へ、余白区間は余韻演出へ寄せました。'],
    });
  };

  const focusSection = (section: LyricSection) => {
    const firstId = section.lyricIds[0];
    if (!firstId) return;
    setSelectedId(firstId);
    setActiveTab('edit');
  };

  const applySectionTreatment = (section: LyricSection, treatment: 'chorus' | 'space') => {
    setLyrics((prev) =>
      prev.map((lyric) => {
        if (!section.lyricIds.includes(lyric.id)) return lyric;
        if (treatment === 'chorus') {
          return withGeneratedTokens({
            ...lyric,
            role: 'chorus',
            inEffect: lyric.inEffect === 'None' ? 'Bounce' : lyric.inEffect,
            outEffect: lyric.outEffect === 'None' ? 'Zoom' : lyric.outEffect,
            textEffect: 'Chorus Burst',
            effectIntensity: Math.max(lyric.effectIntensity, 7),
            textColor: lyric.textColor === globalSettings.textColor ? '#fde68a' : lyric.textColor,
          }, lyric.tokenMode ?? 'auto');
        }
        return withGeneratedTokens({
          ...lyric,
          role: lyric.role ?? 'main',
          inEffect: lyric.inEffect === 'None' ? 'Glow' : lyric.inEffect,
          outEffect: lyric.outEffect === 'None' ? 'Slow Zoom' : lyric.outEffect,
          textEffect: lyric.textEffect === 'None' || lyric.textEffect === globalSettings.textEffect ? 'Phrase Pulse' : lyric.textEffect,
          effectIntensity: Math.max(4, Math.min(lyric.effectIntensity, 6)),
          fadeInFrames: Math.max(lyric.fadeInFrames ?? 8, 12),
          fadeOutFrames: Math.max(lyric.fadeOutFrames ?? 8, 14),
        }, lyric.tokenMode ?? 'auto');
      })
    );
  };

  const applyPresetToLyric = (lyric: LyricBlock, preset: StylePreset): LyricBlock => {
    const role = lyric.role ?? (lyric.track === 2 ? 'emphasis' : 'main');
    const roleStyle = preset.roleStyles[role] ?? preset.roleStyles.main ?? {};
    const nextLyric: LyricBlock = {
      ...lyric,
      ...roleStyle,
      fadeInFrames: roleStyle.fadeInFrames ?? preset.global.fadeInFrames ?? lyric.fadeInFrames,
      fadeOutFrames: roleStyle.fadeOutFrames ?? preset.global.fadeOutFrames ?? lyric.fadeOutFrames,
      fadeInPattern: lyric.fadeInPattern ?? 'Linear',
      fadeOutPattern: lyric.fadeOutPattern ?? 'Linear',
      textBackgroundColor: role === 'emphasis'
        ? roleStyle.textBackgroundColor ?? lyric.textBackgroundColor ?? 'rgba(15,23,42,.48)'
        : roleStyle.textBackgroundColor ?? 'transparent',
      outlineColor: roleStyle.outlineColor ?? preset.global.outlineColor ?? lyric.outlineColor,
      outlineWidth: roleStyle.outlineWidth ?? preset.global.outlineWidth ?? lyric.outlineWidth,
    };
    return withGeneratedTokens(nextLyric, nextLyric.tokenMode ?? lyric.tokenMode ?? 'auto');
  };

  const applyStylePreset = () => {
    const preset = STYLE_PRESETS[selectedStylePreset];
    setGlobalSettings((prev) => ({...prev, ...preset.global}));
    setLyrics((prev) => prev.map((lyric) => applyPresetToLyric(lyric, preset)));
    setWorkflowReport({
      title: `曲調プリセット: ${preset.label}`,
      changedBlocks: lyrics.length,
      messages: ['共通設定と役割別のフォント・色・エフェクトを適用しました。'],
    });
  };

  const summarizeWorkflowDiff = (before: LyricBlock | undefined, after: LyricBlock | undefined): WorkflowDiff | null => {
    const text = after?.text ?? before?.text ?? '';
    if (!before && after) {
      return {id: after.id, text, changes: ['新規ブロックとして追加']};
    }
    if (before && !after) {
      return {id: before.id, text, changes: ['空行または不要ブロックとして除外']};
    }
    if (!before || !after) return null;

    const changes: string[] = [];
    if (before.startFrame !== after.startFrame || before.endFrame !== after.endFrame) {
      changes.push(`時間 ${before.startFrame}-${before.endFrame}f -> ${after.startFrame}-${after.endFrame}f`);
    }
    if (before.track !== after.track) changes.push(`トラック ${before.track + 1} -> ${after.track + 1}`);
    if ((before.role ?? 'main') !== (after.role ?? 'main')) {
      changes.push(`役割 ${LYRIC_ROLE_LABELS[before.role ?? 'main']} -> ${LYRIC_ROLE_LABELS[after.role ?? 'main']}`);
    }
    if (before.font !== after.font) changes.push(`フォント ${before.font} -> ${after.font}`);
    if (before.inEffect !== after.inEffect) changes.push(`登場 ${before.inEffect} -> ${after.inEffect}`);
    if (before.textEffect !== after.textEffect) changes.push(`歌唱中 ${before.textEffect} -> ${after.textEffect}`);
    if (before.outEffect !== after.outEffect) changes.push(`退場 ${before.outEffect} -> ${after.outEffect}`);
    if (before.textColor !== after.textColor) changes.push('文字色を変更');
    if ((before.outlineWidth ?? 0) !== (after.outlineWidth ?? 0)) changes.push(`枠線 ${before.outlineWidth ?? 0} -> ${after.outlineWidth ?? 0}`);
    if (before.tokenMode !== after.tokenMode) changes.push(`同期単位 ${before.tokenMode ?? 'auto'} -> ${after.tokenMode ?? 'auto'}`);
    return changes.length > 0 ? {id: after.id, text, changes} : null;
  };

  const createPostImportSetupPreview = (): WorkflowPreview => {
    const preset = STYLE_PRESETS[selectedStylePreset];
    const sortedLyrics = [...lyrics].sort((a, b) => a.startFrame - b.startFrame || a.track - b.track);
    const sourceLyrics = sortedLyrics.filter((lyric) => lyric.text.trim());
    const allTexts = sourceLyrics.map((lyric) => lyric.text.trim());
    const trackEndFrames = [0, 0, 0, 0];
    const reflowedLyrics = sourceLyrics
      .map((lyric, order) => {
        const nextStartFrame = sourceLyrics[order + 1]?.startFrame;
        const endFrame = getLrcEndFrame(
          {index: order, text: lyric.text, startFrame: lyric.startFrame},
          nextStartFrame,
          lrcDurationMode,
          lrcEarlyEndFrames,
          lrcMinDisplayFrames
        );
        const role = lrcAutoClassify ? classifyLyricRole(lyric.text, order, allTexts) : lyric.role ?? 'main';
        const track = roleToTrack(role, lyric.startFrame < trackEndFrames[0]);
        trackEndFrames[track] = Math.max(trackEndFrames[track], endFrame);
        return fitLyricTiming({...lyric, role, track}, lyric.startFrame, endFrame);
      });

    const placedLyrics: LyricBlock[] = [];
    reflowedLyrics
      .map((lyric) => applyPresetToLyric(lyric, preset))
      .map(applyDensityToLyric)
      .forEach((lyric) => {
        const track = findAvailableTrackForLyric(lyric, placedLyrics);
        placedLyrics.push({...lyric, track});
      });

    const nextLyrics = placedLyrics.sort((a, b) => a.startFrame - b.startFrame || a.track - b.track);
    const beforeById = new Map(lyrics.map((lyric) => [lyric.id, JSON.stringify(lyric)]));
    const beforeLyricById = new Map(lyrics.map((lyric) => [lyric.id, lyric]));
    const afterLyricById = new Map(nextLyrics.map((lyric) => [lyric.id, lyric]));
    const changedBlocks = [
      ...nextLyrics.filter((lyric) => beforeById.get(lyric.id) !== JSON.stringify(lyric)),
      ...lyrics.filter((lyric) => !afterLyricById.has(lyric.id)),
    ].length;
    const diffs = [
      ...nextLyrics.map((lyric) => summarizeWorkflowDiff(beforeLyricById.get(lyric.id), lyric)),
      ...lyrics.filter((lyric) => !afterLyricById.has(lyric.id)).map((lyric) => summarizeWorkflowDiff(lyric, undefined)),
    ].filter((diff): diff is WorkflowDiff => Boolean(diff)).slice(0, 12);
    const maxTrackCount = Math.max(4, ...nextLyrics.map((lyric) => lyric.track + 1));
    const removedBlocks = lyrics.length - sourceLyrics.length;

    return {
      title: '読み込み後セットアップ',
      changedBlocks,
      diffs,
      nextLyrics,
      nextGlobalSettings: {...globalSettings, ...preset.global},
      nextTrackCount: maxTrackCount,
      messages: [
        `曲調プリセット「${preset.label}」を適用しました。`,
        'LRC整形設定に合わせて表示時間、役割、トラックを再整理しました。',
        '歌詞密度に合わせて、詰まった区間と余白区間の演出を調整しました。',
        removedBlocks > 0 ? `空行/空ブロックを${removedBlocks}件除外します。` : '空行/空ブロックの除外はありません。',
        `最終トラック数: ${maxTrackCount}`,
      ],
    };
  };

  const applyWorkflowPreview = () => {
    if (!workflowPreview) return;
    applyProjectStateUpdate({
      lyrics: workflowPreview.nextLyrics,
      globalSettings: workflowPreview.nextGlobalSettings,
      trackCount: workflowPreview.nextTrackCount,
      selectedId: workflowPreview.nextLyrics[0]?.id ?? null,
    });
    setWorkflowReport({
      title: workflowPreview.title,
      changedBlocks: workflowPreview.changedBlocks,
      messages: workflowPreview.messages,
      diffs: workflowPreview.diffs,
    });
    setWorkflowPreview(null);
  };

  const runPostImportSetup = () => {
    const preview = createPostImportSetupPreview();
    setWorkflowPreview(preview);
    setWorkflowReport(null);
  };

  const updateSelectedBlock = (updates: Partial<LyricBlock>) => {
    if (!selectedId) return;
    setLyrics((prev) => prev.map((lyric) => (lyric.id === selectedId ? {...lyric, ...updates} : lyric)));
  };

  const updateSelectedBlockWithTokens = (updates: Partial<LyricBlock>, mode?: LyricTokenMode) => {
    if (!selectedId) return;
    setLyrics((prev) =>
      prev.map((lyric) => {
        if (lyric.id !== selectedId) return lyric;
        const nextLyric = {...lyric, ...updates};
        return withGeneratedTokens(nextLyric, mode ?? nextLyric.tokenMode ?? 'auto');
      })
    );
  };

  const updateSelectedToken = (tokenId: string, updates: Partial<NonNullable<LyricBlock['tokens']>[number]>) => {
    if (!selectedBlock) return;
    const tokens = getLyricTokens(selectedBlock).map((token) =>
      token.id === tokenId
        ? {
            ...token,
            ...updates,
            startFrame: Math.max(selectedBlock.startFrame, Math.round(Number(updates.startFrame ?? token.startFrame))),
            endFrame: Math.min(selectedBlock.endFrame, Math.max(Math.round(Number(updates.startFrame ?? token.startFrame)) + 1, Math.round(Number(updates.endFrame ?? token.endFrame)))),
          }
        : token
    );
    updateSelectedBlock({tokens: tokens.sort((a, b) => a.startFrame - b.startFrame || a.index - b.index)});
  };

  const alignSelectedTokensToBeats = () => {
    if (!selectedBlock) return;
    const tokens = getLyricTokens(selectedBlock);
    const singingTokens = tokens.filter((token) => token.text.trim());
    if (singingTokens.length === 0) return;
    const beatsInRange = beatMarkers
      .filter((marker) => marker.frame >= selectedBlock.startFrame && marker.frame < selectedBlock.endFrame)
      .sort((a, b) => a.frame - b.frame);
    if (beatsInRange.length === 0) return;

    let singingIndex = 0;
    const nextTokens = tokens.map((token) => {
      if (!token.text.trim()) return token;
      const beat = beatsInRange[Math.min(singingIndex, beatsInRange.length - 1)];
      const nextBeat = beatsInRange[Math.min(singingIndex + 1, beatsInRange.length - 1)];
      const startFrame = beat.frame;
      const fallbackEnd = selectedBlock.startFrame + Math.round(((singingIndex + 1) / singingTokens.length) * (selectedBlock.endFrame - selectedBlock.startFrame));
      const endFrame = nextBeat && nextBeat.frame > startFrame
        ? nextBeat.frame
        : Math.max(startFrame + 1, Math.min(selectedBlock.endFrame, fallbackEnd));
      singingIndex += 1;
      return {...token, startFrame, endFrame};
    });
    updateSelectedBlock({tokens: nextTokens});
  };

  const applyGlobalFadeToAllLyrics = () => {
    setLyrics((prev) => prev.map((lyric) => ({
      ...lyric,
      fadeInFrames: globalSettings.fadeInFrames ?? 8,
      fadeOutFrames: globalSettings.fadeOutFrames ?? 8,
      fadeInPattern: globalSettings.fadeInPattern ?? 'Linear',
      fadeOutPattern: globalSettings.fadeOutPattern ?? 'Linear',
    })));
  };

  const reflowCurrentLyrics = () => {
    const sortedLyrics = [...lyrics].sort((a, b) => a.startFrame - b.startFrame || a.track - b.track);
    const allTexts = sortedLyrics.map((lyric) => lyric.text.trim());
    const trackEndFrames = [0, 0, 0, 0];
    const nextLyrics = sortedLyrics.map((lyric, order) => {
      const nextStartFrame = sortedLyrics[order + 1]?.startFrame;
      const endFrame = getLrcEndFrame(
        {index: order, text: lyric.text, startFrame: lyric.startFrame},
        nextStartFrame,
        lrcDurationMode,
        lrcEarlyEndFrames,
        lrcMinDisplayFrames
      );
      const role = lrcAutoClassify ? classifyLyricRole(lyric.text, order, allTexts) : lyric.role ?? 'main';
      const track = roleToTrack(role, lyric.startFrame < trackEndFrames[0]);
      trackEndFrames[track] = Math.max(trackEndFrames[track], endFrame);
      return fitLyricTiming({...lyric, role, track}, lyric.startFrame, endFrame);
    });
    setLyrics(nextLyrics);
    setTrackCount(Math.max(4, ...nextLyrics.map((lyric) => lyric.track + 1)));
  };

  const createEmphasisBlocks = (term: string) => {
    const normalizedTerm = term.toLowerCase();
    const sourceLyrics = lyrics
      .filter((lyric) => lyric.role !== 'emphasis' && lyric.track !== 2)
      .filter((lyric) => lyric.text.toLowerCase().includes(normalizedTerm))
      .slice(0, 8);
    if (sourceLyrics.length === 0) return;

    const existingKeys = new Set(
      lyrics
        .filter((lyric) => lyric.role === 'emphasis' || lyric.track === 2)
        .map((lyric) => `${lyric.text.trim().toLowerCase()}-${Math.round(lyric.startFrame / 6)}`)
    );

    const newBlocks = sourceLyrics.flatMap((source, index) => {
      const lowerText = source.text.toLowerCase();
      const termIndex = lowerText.indexOf(normalizedTerm);
      const duration = Math.max(1, source.endFrame - source.startFrame);
      const startFrame = source.startFrame + Math.round((Math.max(0, termIndex) / Math.max(1, source.text.length)) * duration);
      const endFrame = Math.min(source.endFrame, Math.max(startFrame + 18, startFrame + Math.min(42, Math.round(duration * 0.45))));
      const key = `${term.trim().toLowerCase()}-${Math.round(startFrame / 6)}`;
      if (existingKeys.has(key)) return [];
      existingKeys.add(key);

      const block: LyricBlock = {
        id: `emphasis-${Date.now()}-${index}-${Math.round(startFrame)}`,
        text: term,
        track: 2,
        startFrame,
        endFrame,
        scale: /^[A-Za-z0-9 -]+$/.test(term) ? 1.32 : 1.18,
        x: index % 2 === 0 ? 0 : index % 3 === 0 ? -48 : 48,
        y: source.y > 0 ? -24 : 36,
        rotation: index % 2 === 0 ? -2 : 2,
        effect: 'Pop',
        inEffect: 'Pop',
        outEffect: 'Zoom',
        effectIntensity: 7,
        effectStartFrame: startFrame,
        effectEndFrame: endFrame,
        effectSwitchFrame: Math.min(endFrame, startFrame + Math.max(8, Math.round((endFrame - startFrame) * 0.65))),
        fadeInFrames: 4,
        fadeOutFrames: 8,
        fadeInPattern: 'Linear',
        fadeOutPattern: 'Linear',
        font: /^[A-Za-z0-9 -]+$/.test(term) ? 'Impact' : globalSettings.font,
        textEffect: 'Kinetic Impact',
        effectSpeed: Math.max(7, globalSettings.effectSpeed),
        textColor: '#facc15',
        textBackgroundColor: 'rgba(127,29,29,.62)',
        outlineColor: '#000000',
        outlineWidth: 4,
        tokenMode: term.includes(' ') ? 'word' : 'mora',
        role: 'emphasis',
        keyframes: [
          {id: `emphasis-${Date.now()}-${index}-scale-a`, frame: startFrame, property: 'scale', value: 0.92},
          {id: `emphasis-${Date.now()}-${index}-scale-b`, frame: Math.min(endFrame, startFrame + 10), property: 'scale', value: /^[A-Za-z0-9 -]+$/.test(term) ? 1.42 : 1.26},
        ],
      };
      return [withGeneratedTokens(block)];
    });

    if (newBlocks.length === 0) return;
    setLyrics((prev) => [...prev, ...newBlocks].sort((a, b) => a.startFrame - b.startFrame || a.track - b.track));
    setTrackCount((prev) => Math.max(prev, 4));
    setSelectedId(newBlocks[0].id);
    setActiveTab('edit');
  };

  const applyTimingShift = (deltaFrames: number) => {
    const anchorFrame = selectedBlock?.startFrame ?? currentFrame;
    const shouldShift = (lyric: LyricBlock) => {
      if (timingAdjustScope === 'all') return true;
      if (timingAdjustScope === 'selected') return selectedId !== null && lyric.id === selectedId;
      return lyric.startFrame >= anchorFrame;
    };
    setLyrics((prev) =>
      prev
        .map((lyric) => (shouldShift(lyric) ? shiftLyricFrames(lyric, deltaFrames, durationInFrames) : lyric))
        .sort((a, b) => a.startFrame - b.startFrame || a.track - b.track)
    );
  };

  const findAvailableTrackForLyric = (target: LyricBlock, allLyrics: LyricBlock[]) => {
    for (let track = 0; track < Math.max(4, trackCount); track += 1) {
      const overlaps = allLyrics.some((lyric) =>
        lyric.id !== target.id &&
        lyric.track === track &&
        lyric.startFrame < target.endFrame &&
        lyric.endFrame > target.startFrame
      );
      if (!overlaps) return track;
    }
    return Math.max(3, trackCount);
  };

  const fixLyricIssue = (issue: LyricIssue) => {
    if (!issue.lyricId) return;
    setLyrics((prev) => {
      const target = prev.find((lyric) => lyric.id === issue.lyricId);
      if (!target) return prev;
      if (issue.kind === 'empty') {
        return prev.filter((lyric) => lyric.id !== issue.lyricId);
      }
      return prev.map((lyric) => {
        if (lyric.id !== issue.lyricId) return lyric;
        if (issue.kind === 'short') {
          return fitLyricTiming(lyric, lyric.startFrame, Math.min(durationInFrames, lyric.startFrame + 24));
        }
        if (issue.kind === 'long') {
          return withGeneratedTokens({
            ...lyric,
            scale: Math.min(lyric.scale, 0.92),
            textEffect: lyric.textEffect === 'None' ? 'Karaoke Sweep' : lyric.textEffect,
            tokenMode: lyric.text.includes(' ') ? 'word' : lyric.tokenMode ?? 'auto',
            outlineWidth: Math.max(lyric.outlineWidth ?? globalSettings.outlineWidth ?? 2, 3),
          }, lyric.text.includes(' ') ? 'word' : lyric.tokenMode ?? 'auto');
        }
        if (issue.kind === 'outOfRange') {
          const duration = lyric.endFrame - lyric.startFrame;
          const startFrame = Math.max(0, Math.min(durationInFrames - 1, Math.min(lyric.startFrame, durationInFrames - duration)));
          return fitLyricTiming(lyric, startFrame, Math.min(durationInFrames, startFrame + duration));
        }
        if (issue.kind === 'beatMissing') {
          return {
            ...lyric,
            effect: /Beat|Bass|Pulse/i.test(lyric.effect) ? 'None' : lyric.effect,
            inEffect: /Beat|Bass|Pulse/i.test(lyric.inEffect ?? '') ? 'None' : lyric.inEffect,
            outEffect: /Beat|Bass|Pulse/i.test(lyric.outEffect ?? '') ? 'None' : lyric.outEffect,
            textEffect: /Beat|Bass|Pulse/i.test(lyric.textEffect) ? 'Karaoke Sweep' : lyric.textEffect,
          };
        }
        if (issue.kind === 'overlap') {
          return {...lyric, track: findAvailableTrackForLyric(lyric, prev)};
        }
        return lyric;
      });
    });
    if (issue.kind === 'overlap') {
      setTrackCount((prev) => Math.max(prev, 4));
    }
  };

  const fixAllDetectedIssues = () => {
    lyricIssues
      .filter((issue) => issue.lyricId && issue.kind !== 'audioMissing')
      .forEach((issue) => fixLyricIssue(issue));
  };

  const moveSelectedLyricToCurrentFrame = () => {
    if (!selectedBlock) return;
    setLyrics((prev) =>
      prev.map((lyric) =>
        lyric.id === selectedBlock.id
          ? shiftLyricFrames(lyric, currentFrame - selectedBlock.startFrame, durationInFrames)
          : lyric
      )
    );
  };

  useEffect(() => {
    if (!selectedBlock) return;
    const value = selectedBlock[keyframeProperty] ?? (keyframeProperty === 'textBackgroundColor' ? 'transparent' : '');
    setKeyframeValue(String(value));
  }, [keyframeProperty, selectedBlock?.id]);

  const addKeyframe = (property: LyricKeyframeProperty, value: string | number, frame = currentFrame) => {
    if (!selectedBlock) return;
    const normalizedValue = numericKeyframes.has(property) ? Number(value) : String(value);
    const nextKeyframe = {
      id: `kf-${Date.now()}`,
      frame,
      property,
      value: normalizedValue,
    };
    const keyframes = [
      ...(selectedBlock.keyframes ?? []).filter((keyframe) => !(keyframe.frame === frame && keyframe.property === property)),
      nextKeyframe,
    ]
      .sort((a, b) => a.frame - b.frame);
    updateSelectedBlock({keyframes});
  };

  const addSelectedKeyframe = () => addKeyframe(keyframeProperty, keyframeValue || selectedBlock?.[keyframeProperty] || 0);

  const addKeyframes = (property: LyricKeyframeProperty, value: string | number, frames: number[]) => {
    if (!selectedBlock) return;
    const normalizedValue = numericKeyframes.has(property) ? Number(value) : String(value);
    const uniqueFrames = [...new Set(frames)];
    updateSelectedBlock({
      keyframes: [
        ...(selectedBlock.keyframes ?? []).filter(
          (keyframe) => !(keyframe.property === property && uniqueFrames.includes(keyframe.frame))
        ),
        ...uniqueFrames.map((frame) => ({id: `kf-${Date.now()}-${property}-${frame}`, frame, property, value: normalizedValue})),
      ].sort((a, b) => a.frame - b.frame),
    });
  };

  const addPlacementKeyframe = () => {
    if (!selectedBlock) return;
    const frames = [
      ['x', selectedBlock.x],
      ['y', selectedBlock.y],
      ['scale', selectedBlock.scale],
      ['rotation', selectedBlock.rotation ?? 0],
    ] as const;
    updateSelectedBlock({
      keyframes: [
        ...(selectedBlock.keyframes ?? []).filter(
          (keyframe) => !(keyframe.frame === currentFrame && frames.some(([property]) => property === keyframe.property))
        ),
        ...frames.map(([property, value]) => ({id: `kf-${Date.now()}-${property}`, frame: currentFrame, property, value})),
      ].sort((a, b) => a.frame - b.frame),
    });
  };

  const addColorKeyframe = () => {
    if (!selectedBlock) return;
    const frames = [
      ['textColor', selectedBlock.textColor || globalSettings.textColor],
      ['textBackgroundColor', selectedBlock.textBackgroundColor ?? globalSettings.textBackgroundColor ?? 'transparent'],
      ['outlineColor', selectedBlock.outlineColor ?? globalSettings.outlineColor],
      ['outlineWidth', selectedBlock.outlineWidth ?? globalSettings.outlineWidth ?? 2],
    ] as const;
    updateSelectedBlock({
      keyframes: [
        ...(selectedBlock.keyframes ?? []).filter(
          (keyframe) => !(keyframe.frame === currentFrame && frames.some(([property]) => property === keyframe.property))
        ),
        ...frames.map(([property, value]) => ({id: `kf-${Date.now()}-${property}`, frame: currentFrame, property, value})),
      ].sort((a, b) => a.frame - b.frame),
    });
  };

  const updateKeyframe = (id: string, updates: Partial<NonNullable<LyricBlock['keyframes']>[number]>) => {
    if (!selectedBlock) return;
    updateSelectedBlock({
      keyframes: (selectedBlock.keyframes ?? [])
        .map((keyframe) => (keyframe.id === id ? {...keyframe, ...updates} : keyframe))
        .sort((a, b) => a.frame - b.frame),
    });
  };

  const deleteKeyframe = (id: string) => {
    if (!selectedBlock) return;
    updateSelectedBlock({keyframes: (selectedBlock.keyframes ?? []).filter((keyframe) => keyframe.id !== id)});
  };

  const handleLrcImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = String(event.target?.result ?? '').split('\n');
      const entries: LrcEntry[] = [];

      lines.forEach((line, index) => {
        const match = line.match(/\[(\d+):(\d{2})[.:](\d{2,3})\](.*)/);
        if (!match) return;
        const min = Number(match[1]);
        const sec = Number(match[2]);
        const ms = Number(match[3]);
        const content = match[4].trim();
        if (!content) return;

        const timeInSec = min * 60 + sec + ms / (ms > 99 ? 1000 : 100);
        const startFrame = Math.round(timeInSec * 30);
        entries.push({index, text: content, startFrame});
      });

      const sortedEntries = entries.sort((a, b) => a.startFrame - b.startFrame || a.index - b.index);
      const allTexts = sortedEntries.map((entry) => entry.text.trim());
      const trackEndFrames = [0, 0, 0, 0];
      const parsedLyrics = sortedEntries.map((entry, order): LyricBlock => {
        const nextStartFrame = sortedEntries[order + 1]?.startFrame;
        const endFrame = getLrcEndFrame(
          entry,
          nextStartFrame,
          lrcDurationMode,
          lrcEarlyEndFrames,
          lrcMinDisplayFrames
        );
        const role = lrcAutoClassify ? classifyLyricRole(entry.text, order, allTexts) : 'main';
        const track = roleToTrack(role, entry.startFrame < trackEndFrames[0]);
        trackEndFrames[track] = Math.max(trackEndFrames[track], endFrame);

        const block: LyricBlock = {
          id: `lrc-${entry.index}`,
          text: entry.text,
          track,
          startFrame: entry.startFrame,
          endFrame,
          scale: 1,
          x: 0,
          y: 0,
          rotation: 0,
          effect: 'None',
          inEffect: 'None',
          outEffect: 'None',
          effectIntensity: 5,
          effectStartFrame: entry.startFrame,
          effectEndFrame: Math.min(endFrame, entry.startFrame + 45),
          effectSwitchFrame: Math.min(endFrame, entry.startFrame + 22),
          fadeInFrames: globalSettings.fadeInFrames ?? 8,
          fadeOutFrames: globalSettings.fadeOutFrames ?? 8,
          fadeInPattern: globalSettings.fadeInPattern ?? 'Linear',
          fadeOutPattern: globalSettings.fadeOutPattern ?? 'Linear',
          font: globalSettings.font,
          textEffect: globalSettings.textEffect,
          effectSpeed: globalSettings.effectSpeed,
          textColor: globalSettings.textColor,
          textBackgroundColor: globalSettings.textBackgroundColor ?? 'transparent',
          outlineColor: globalSettings.outlineColor,
          outlineWidth: globalSettings.outlineWidth ?? 2,
          role,
        };
        return withGeneratedTokens(block);
      });

      if (parsedLyrics.length > 0) {
        setLyrics(parsedLyrics);
        setTrackCount(Math.max(4, ...parsedLyrics.map((lyric) => lyric.track + 1)));
        setSelectedId(parsedLyrics[0].id);
        setActiveTab('edit');
      }
    };
    reader.readAsText(file);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setAudioFile({name: file.name, url, duration: Number.isFinite(audio.duration) ? audio.duration : undefined});
    };
    audio.onerror = () => {
      setAudioFile({name: file.name, url});
    };
  };

  const exportProjectJson = () => {
    const blob = new Blob([JSON.stringify({lyrics, globalSettings, trackCount, beatMarkers}, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lyric-project.json';
    a.click();
  };

  const importProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result ?? '{}'));
        const nextGlobalSettings = normalizeGlobalSettings(parsed.globalSettings, globalSettings);
        const messages: string[] = [];
        let fixedCount = 0;

        if (Array.isArray(parsed.lyrics)) {
          const normalizedLyrics = parsed.lyrics.map((lyric: unknown, index: number) => {
            const normalized = normalizeImportedLyric(lyric, index, nextGlobalSettings, durationInFrames);
            if (normalized.fixes.length > 0) {
              fixedCount += 1;
              messages.push(...normalized.fixes);
            }
            return normalized.lyric;
          }).sort((a: LyricBlock, b: LyricBlock) => a.startFrame - b.startFrame || a.track - b.track);
          setLyrics(normalizedLyrics);
          setSelectedId(normalizedLyrics[0]?.id ?? null);
          if (normalizedLyrics.length === 0) messages.push('lyricsが空でした。');
        } else {
          messages.push('lyrics配列が見つかりませんでした。');
        }

        setGlobalSettings(nextGlobalSettings);
        if (parsed.globalSettings && nextGlobalSettings !== parsed.globalSettings) messages.push('globalSettingsを現在の形式へ補正しました。');
        if (Array.isArray(parsed.beatMarkers)) setBeatMarkers(normalizeBeatMarkers(parsed.beatMarkers));
        if (Number.isFinite(parsed.trackCount)) {
          setTrackCount(Math.max(4, Number(parsed.trackCount)));
        } else if (Array.isArray(parsed.lyrics)) {
          setTrackCount(Math.max(4, ...parsed.lyrics.map((lyric: LyricBlock) => Number(lyric.track ?? 0) + 1)));
        }
        setProjectImportReport({
          fileName: file.name,
          lyricCount: Array.isArray(parsed.lyrics) ? parsed.lyrics.length : 0,
          fixedCount,
          messages: messages.slice(0, 12),
        });
        setActiveTab('input');
      } catch {
        alert('プロジェクトJSONを読み込めませんでした。ファイル内容を確認してください。');
      }
    };
    reader.readAsText(file);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportMov = async () => {
    const filename = 'transparent_video.mov';
    let fileHandle: FileSystemFileHandle | null = null;

    try {
      if (hasSaveFilePicker(window)) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'QuickTime MOV',
              accept: {'video/quicktime': ['.mov']},
            },
          ],
        });
      }

      setExportStatus({kind: 'rendering', message: 'レンダリング中です。長めの動画では数分かかることがあります。'});
      const response = await fetch('/api/export/mov', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          lyrics,
          globalSettings,
          beatMarkers,
          durationInFrames,
          fps: 30,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({error: 'MOV出力に失敗しました。'}));
        throw new Error(String(error.error ?? 'MOV出力に失敗しました。'));
      }

      const blob = await response.blob();
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        downloadBlob(blob, filename);
      }
      setExportStatus({kind: 'done', message: 'MOV出力が完了しました。'});
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setExportStatus({kind: 'idle', message: '出力をキャンセルしました。'});
        return;
      }
      setExportStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'MOV出力に失敗しました。',
      });
    }
  };

  return (
    <div className="panel" style={{height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 16}}>
        {(['edit', 'input', 'output', 'help'] as const).map((tab) => (
          <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'edit' ? '編集' : tab === 'input' ? '入力・共通' : tab === 'output' ? '出力' : '使い方'}
          </button>
        ))}
      </div>

      <div style={{flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16}}>
        {activeTab === 'edit' && selectedBlock && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <div style={fieldStyle}>
              <label>歌詞テキスト</label>
              <input type="text" value={selectedBlock.text} onChange={(e) => updateSelectedBlockWithTokens({text: e.target.value})} />
            </div>
            <div style={fieldStyle}>
              <label>歌詞の役割</label>
              <select
                value={selectedBlock.role ?? 'main'}
                onChange={(e) => updateSelectedBlock({role: e.target.value as LyricRole})}
              >
                {(Object.keys(LYRIC_ROLE_LABELS) as LyricRole[]).map((role) => (
                  <option key={role} value={role}>{LYRIC_ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>

            <div style={{display: 'flex', gap: 12}}>
              <button onClick={onAddLyric} style={{...buttonStyle, flex: 1, background: '#3b82f6'}}>+ 追加</button>
              <button onClick={onDeleteLyric} style={{...buttonStyle, flex: 1, background: '#ef4444'}}>削除</button>
            </div>

            <div style={sectionStyle}>
              <h4>歌詞同期</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end'}}>
                <div style={fieldStyle}>
                  <label>同期単位</label>
                  <select
                    value={selectedBlock.tokenMode ?? 'auto'}
                    onChange={(e) => updateSelectedBlockWithTokens({tokenMode: e.target.value as LyricTokenMode}, e.target.value as LyricTokenMode)}
                  >
                    {(Object.keys(TOKEN_MODE_LABELS) as LyricTokenMode[]).map((mode) => (
                      <option key={mode} value={mode}>{TOKEN_MODE_LABELS[mode]}</option>
                    ))}
                  </select>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
                  <button type="button" onClick={() => updateSelectedBlockWithTokens({})} style={{...buttonStyle, padding: 8, background: '#374151'}}>
                    再生成
                  </button>
                  <button
                    type="button"
                    onClick={alignSelectedTokensToBeats}
                    disabled={beatMarkers.length === 0}
                    style={{...buttonStyle, padding: 8, background: beatMarkers.length ? '#0f766e' : '#374151', cursor: beatMarkers.length ? 'pointer' : 'not-allowed'}}
                  >
                    ビートへ割当
                  </button>
                </div>
              </div>
              <div style={{fontSize: 11, color: '#9ca3af', marginTop: 8}}>
                {selectedTokens.length} tokens / {selectedBlock.startFrame}f - {selectedBlock.endFrame}f
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 190, overflowY: 'auto', marginTop: 8, paddingRight: 2}}>
                {selectedTokens.map((token) => (
                  <div
                    key={token.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) 66px 66px',
                      gap: 6,
                      alignItems: 'center',
                      padding: 7,
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,.08)',
                      background: token.text.trim() ? '#0f172a' : '#111827',
                    }}
                  >
                    <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token.text.trim() ? '#e5e7eb' : '#64748b', fontWeight: 700}}>
                      {token.text.trim() ? token.text : '(space)'}
                    </span>
                    <input
                      type="number"
                      value={token.startFrame}
                      min={selectedBlock.startFrame}
                      max={selectedBlock.endFrame - 1}
                      onChange={(e) => updateSelectedToken(token.id, {startFrame: Number(e.target.value) || selectedBlock.startFrame})}
                      style={{padding: '6px 5px'}}
                    />
                    <input
                      type="number"
                      value={token.endFrame}
                      min={token.startFrame + 1}
                      max={selectedBlock.endFrame}
                      onChange={(e) => updateSelectedToken(token.id, {endFrame: Number(e.target.value) || token.startFrame + 1})}
                      style={{padding: '6px 5px'}}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <h4>配置</h4>
              <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                  <div style={fieldStyle}>
                    <label>開始フレーム</label>
                    <input type="number" value={selectedBlock.startFrame} onChange={(e) => updateSelectedBlockWithTokens({startFrame: Math.max(0, Number(e.target.value) || 0)})} />
                  </div>
                  <div style={fieldStyle}>
                    <label>終了フレーム</label>
                    <input type="number" value={selectedBlock.endFrame} onChange={(e) => updateSelectedBlockWithTokens({endFrame: Math.max(selectedBlock.startFrame + 1, Number(e.target.value) || selectedBlock.startFrame + 1)})} />
                  </div>
                </div>
                <label>倍率: {selectedBlock.scale.toFixed(1)}x</label>
                <input type="range" min="0.5" max="3" step="0.1" value={selectedBlock.scale} onChange={(e) => updateSelectedBlock({scale: Number(e.target.value)})} />
                <label>X位置: {selectedBlock.x}px</label>
                <input type="range" min="-500" max="500" step="10" value={selectedBlock.x} onChange={(e) => updateSelectedBlock({x: Number(e.target.value)})} />
                <label>Y位置: {selectedBlock.y}px</label>
                <input type="range" min="-500" max="500" step="10" value={selectedBlock.y} onChange={(e) => updateSelectedBlock({y: Number(e.target.value)})} />
                <label>角度: {Math.round(selectedBlock.rotation ?? 0)}°</label>
                <input type="range" min="-180" max="180" step="1" value={selectedBlock.rotation ?? 0} onChange={(e) => updateSelectedBlock({rotation: Number(e.target.value)})} />
                <div style={{borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10}}>
                  <h4 style={{margin: 0}}>倍率・XYのフレーム設定</h4>
                  <button
                    type="button"
                    onClick={addPlacementKeyframe}
                    style={{...buttonStyle, width: '100%', background: '#2563eb'}}
                  >
                    現在のフレームに倍率・XY・角度を追加 ({currentFrame}f)
                  </button>
                  {(selectedBlock.keyframes ?? []).filter((keyframe) => ['x', 'y', 'scale', 'rotation'].includes(String(keyframe.property))).map((keyframe) => (
                    <div
                      key={`placement-${keyframe.id}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr',
                        gap: 8,
                        padding: 10,
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: 8,
                        background: '#05070b',
                      }}
                    >
                      <div style={fieldStyle}>
                        <label>フレーム</label>
                        <input type="number" value={keyframe.frame} onChange={(e) => updateKeyframe(keyframe.id, {frame: Number(e.target.value) || 0})} />
                      </div>
                      <div style={fieldStyle}>
                        <label>{keyframeLabel(keyframe.property)}</label>
                        <input type="number" step={keyframe.property === 'scale' ? '0.1' : '1'} value={Number(keyframe.value ?? 0)} onChange={(e) => updateKeyframe(keyframe.id, {value: Number(e.target.value) || 0})} />
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteKeyframe(keyframe.id)}
                        style={{...buttonStyle, gridColumn: '1 / -1', padding: 8, background: '#ef4444'}}
                      >
                        このフレーム設定を削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h4>色のフレーム設定</h4>
              <button
                type="button"
                onClick={addColorKeyframe}
                style={{...buttonStyle, width: '100%', background: '#2563eb'}}
              >
                現在のフレームに色・枠線幅を追加 ({currentFrame}f)
              </button>
              <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10}}>
                {(selectedBlock.keyframes ?? []).length === 0 && (
                  <div style={{fontSize: 12, color: '#9ca3af'}}>
                    文字色/文字背景色/枠線色/枠線幅をフレームごとに登録できます。
                  </div>
                )}
                {(selectedBlock.keyframes ?? []).filter((keyframe) => ['textColor', 'textBackgroundColor', 'outlineColor', 'outlineWidth'].includes(String(keyframe.property))).map((keyframe) => (
                  <div
                    key={`color-${keyframe.id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 8,
                      padding: 10,
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: 8,
                      background: '#05070b',
                    }}
                  >
                    <div style={fieldStyle}>
                      <label>フレーム</label>
                      <input type="number" value={keyframe.frame} onChange={(e) => updateKeyframe(keyframe.id, {frame: Number(e.target.value) || 0})} />
                    </div>
                    <div style={fieldStyle}>
                      <label>{keyframeLabel(keyframe.property)}</label>
                      {keyframe.property === 'outlineWidth' ? (
                        <input type="number" min="0" max="12" value={Number(keyframe.value ?? 0)} onChange={(e) => updateKeyframe(keyframe.id, {value: Number(e.target.value) || 0})} />
                      ) : (
                        <input
                          type="color"
                          value={String(keyframe.value ?? '#000000') !== 'transparent' ? String(keyframe.value ?? '#000000') : '#000000'}
                          onChange={(e) => updateKeyframe(keyframe.id, {value: e.target.value})}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateKeyframe(keyframe.id, {value: 'transparent'})}
                      disabled={!['textBackgroundColor', 'outlineColor'].includes(String(keyframe.property))}
                      style={{...buttonStyle, padding: 8, background: '#374151'}}
                    >
                      透明
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteKeyframe(keyframe.id)}
                      style={{...buttonStyle, gridColumn: '1 / -1', padding: 8, background: '#ef4444'}}
                    >
                      このフレーム設定を削除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <details style={sectionStyle}>
              <summary style={{cursor: 'pointer', color: '#d1d5db', fontWeight: 800}}>詳細キーフレーム</summary>
              <p style={{fontSize: 12, color: '#9ca3af', lineHeight: 1.5, margin: '8px 0 12px'}}>
                専用の倍率・XY、色設定で扱えない項目を直接登録します。
              </p>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                <div style={fieldStyle}>
                  <label>変更項目</label>
                  <select value={keyframeProperty} onChange={(e) => setKeyframeProperty(e.target.value as LyricKeyframeProperty)}>
                    {KEYFRAME_PROPERTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label>値</label>
                  <input
                    type={KEYFRAME_PROPERTIES.find((item) => item.value === keyframeProperty)?.type === 'color' && keyframeValue !== 'transparent' ? 'color' : 'text'}
                    value={keyframeValue}
                    onChange={(e) => setKeyframeValue(e.target.value)}
                  />
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10}}>
                <button type="button" onClick={addSelectedKeyframe} style={{...buttonStyle, background: '#2563eb'}}>
                  現在フレームに追加
                </button>
                <button
                  type="button"
                  onClick={() => addKeyframes(keyframeProperty, keyframeValue || 0, [selectedBlock.startFrame, selectedBlock.endFrame])}
                  style={{...buttonStyle, background: '#f59e0b'}}
                >
                  開始/終了に追加
                </button>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10}}>
                {(selectedBlock.keyframes ?? []).filter((keyframe) => keyframe.property).length === 0 && (
                  <div style={{fontSize: 12, color: '#9ca3af'}}>キーフレームはまだありません。</div>
                )}
                {(selectedBlock.keyframes ?? []).filter((keyframe) => keyframe.property).map((keyframe) => (
                  <div key={`generic-${keyframe.id}`} style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', fontSize: 12, color: '#d1d5db'}}>
                    <span>{keyframe.frame}f / {keyframeLabel(keyframe.property)} = {String(keyframe.value ?? '')}</span>
                    <button type="button" onClick={() => deleteKeyframe(keyframe.id)} style={{...buttonStyle, padding: '4px 8px', background: '#ef4444'}}>削除</button>
                  </div>
                ))}
              </div>
            </details>

            <div style={sectionStyle}>
              <h4>エフェクトフェーズ</h4>
              <EffectPicker
                label="登場エフェクト"
                value={selectedBlock.inEffect ?? selectedBlock.effect}
                options={EFFECT_OPTIONS}
                kind="effect"
                onChange={(value) => updateSelectedBlock({inEffect: value, effect: value})}
              />
              <EffectPicker
                label="退場エフェクト"
                value={selectedBlock.outEffect ?? 'None'}
                options={EFFECT_OPTIONS}
                kind="effect"
                onChange={(value) => updateSelectedBlock({outEffect: value})}
              />
              <label>強度: {selectedBlock.effectIntensity}</label>
              <input type="range" min="0" max="10" step="1" value={selectedBlock.effectIntensity} onChange={(e) => updateSelectedBlock({effectIntensity: Number(e.target.value)})} />
              <details style={{marginTop: 12}}>
                <summary style={{cursor: 'pointer', color: '#d1d5db', fontWeight: 700}}>登場/退場タイミング / フェード</summary>
                <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                <div style={fieldStyle}>
                  <label>開始</label>
                  <input type="number" value={selectedBlock.effectStartFrame} onChange={(e) => updateSelectedBlock({effectStartFrame: Number(e.target.value) || 0})} />
                </div>
                <div style={fieldStyle}>
                  <label>終了</label>
                  <input type="number" value={selectedBlock.effectEndFrame} onChange={(e) => updateSelectedBlock({effectEndFrame: Number(e.target.value) || 0})} />
                </div>
              </div>
              {(selectedBlock.inEffect ?? selectedBlock.effect) !== 'None' && (selectedBlock.outEffect ?? 'None') !== 'None' && (
                <div style={{...fieldStyle, marginTop: 10}}>
                  <label>登場/退場切替: {selectedBlock.effectSwitchFrame ?? Math.round((selectedBlock.effectStartFrame + selectedBlock.effectEndFrame) / 2)}f</label>
                  <input
                    type="range"
                    min={Math.min(selectedBlock.effectStartFrame + 1, selectedBlock.effectEndFrame - 1)}
                    max={Math.max(selectedBlock.effectStartFrame + 1, selectedBlock.effectEndFrame - 1)}
                    step="1"
                    value={selectedBlock.effectSwitchFrame ?? Math.round((selectedBlock.effectStartFrame + selectedBlock.effectEndFrame) / 2)}
                    onChange={(e) => updateSelectedBlock({effectSwitchFrame: Number(e.target.value)})}
                  />
                </div>
              )}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12}}>
                <div style={fieldStyle}>
                  <label>フェードINパターン</label>
                  <select
                    value={selectedBlock.fadeInPattern ?? globalSettings.fadeInPattern ?? 'Linear'}
                    onChange={(e) => updateSelectedBlock({fadeInPattern: e.target.value})}
                  >
                    {FADE_PATTERN_OPTIONS.map((pattern) => <option key={pattern} value={pattern}>{pattern}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label>フェードOUTパターン</label>
                  <select
                    value={selectedBlock.fadeOutPattern ?? globalSettings.fadeOutPattern ?? 'Linear'}
                    onChange={(e) => updateSelectedBlock({fadeOutPattern: e.target.value})}
                  >
                    {FADE_PATTERN_OPTIONS.map((pattern) => <option key={pattern} value={pattern}>{pattern}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label>フェードINフレーム</label>
                  <input
                    type="number"
                    min="0"
                    value={selectedBlock.fadeInFrames ?? globalSettings.fadeInFrames ?? 8}
                    onChange={(e) => updateSelectedBlock({fadeInFrames: Math.max(0, Number(e.target.value) || 0)})}
                  />
                </div>
                <div style={fieldStyle}>
                  <label>フェードOUTフレーム</label>
                  <input
                    type="number"
                    min="0"
                    value={selectedBlock.fadeOutFrames ?? globalSettings.fadeOutFrames ?? 8}
                    onChange={(e) => updateSelectedBlock({fadeOutFrames: Math.max(0, Number(e.target.value) || 0)})}
                  />
                </div>
              </div>
                </div>
              </details>
            </div>

            <div style={sectionStyle}>
              <h4>リリック表示</h4>
              <FontPicker label="フォント" value={selectedBlock.font} onChange={(font) => updateSelectedBlock({font})} />
              <EffectPicker label="歌唱中エフェクト" value={selectedBlock.textEffect} options={TEXT_EFFECT_OPTIONS} kind="textEffect" onChange={(value) => updateSelectedBlock({textEffect: value})} />
              <label>歌唱中エフェクト速度: {selectedBlock.effectSpeed}</label>
              <input type="range" min="1" max="10" step="1" value={selectedBlock.effectSpeed} onChange={(e) => updateSelectedBlock({effectSpeed: Number(e.target.value)})} />
              <div style={fieldStyle}>
                <label>文字色</label>
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8}}>
                  {COLOR_PALETTE.map((color) => (
                    <button key={color} onClick={() => updateSelectedBlock({textColor: color})} style={{width: 24, height: 24, backgroundColor: color, border: selectedBlock.textColor === color ? '2px solid #3b82f6' : '1px solid #555', borderRadius: 4, cursor: 'pointer'}} />
                  ))}
                </div>
                <input type="text" value={selectedBlock.textColor} onChange={(e) => updateSelectedBlock({textColor: e.target.value})} />
              </div>
              <div style={fieldStyle}>
                <label>文字背景色</label>
                <div style={{display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'center'}}>
                  <input
                    type="color"
                    value={selectedBlock.textBackgroundColor && selectedBlock.textBackgroundColor !== 'transparent' ? selectedBlock.textBackgroundColor : '#000000'}
                    onChange={(e) => updateSelectedBlock({textBackgroundColor: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => updateSelectedBlock({textBackgroundColor: 'transparent'})}
                    style={{...buttonStyle, padding: 8, background: '#374151'}}
                  >
                    透明にする
                  </button>
                </div>
                <input
                  type="text"
                  value={selectedBlock.textBackgroundColor ?? 'transparent'}
                  onChange={(e) => updateSelectedBlock({textBackgroundColor: e.target.value || 'transparent'})}
                />
              </div>
              <div style={fieldStyle}>
                <label>枠線色</label>
                <div style={{display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'center'}}>
                  <input
                    type="color"
                    value={selectedBlock.outlineColor && selectedBlock.outlineColor !== 'transparent' ? selectedBlock.outlineColor : '#000000'}
                    onChange={(e) => updateSelectedBlock({outlineColor: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => updateSelectedBlock({outlineColor: 'transparent'})}
                    style={{...buttonStyle, padding: 8, background: '#374151'}}
                  >
                    透明にする
                  </button>
                </div>
                <input
                  type="text"
                  value={selectedBlock.outlineColor ?? globalSettings.outlineColor}
                  onChange={(e) => updateSelectedBlock({outlineColor: e.target.value || 'transparent'})}
                />
              </div>
              <label>枠線幅: {selectedBlock.outlineWidth ?? globalSettings.outlineWidth ?? 2}px</label>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={selectedBlock.outlineWidth ?? globalSettings.outlineWidth ?? 2}
                onChange={(e) => updateSelectedBlock({outlineWidth: Number(e.target.value)})}
              />
            </div>
          </div>
        )}

        {activeTab === 'edit' && !selectedBlock && (
          <div style={{color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 40}}>
            タイムライン上のリリックブロックを選択してください。
          </div>
        )}

        {activeTab === 'input' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <div style={sectionStyle}>
              <h4>外部ファイル</h4>
              <button onClick={() => fileInputRef.current?.click()} style={{...buttonStyle, width: '100%', background: '#1f2937', border: '1px solid #4b5563'}}>LRCファイルを選択</button>
              <input type="file" ref={fileInputRef} accept=".lrc" onChange={handleLrcImport} style={{display: 'none'}} />
              <button onClick={() => audioInputRef.current?.click()} style={{...buttonStyle, width: '100%', background: '#1f2937', border: '1px solid #4b5563', marginTop: 10}}>音楽ファイルを選択</button>
              <input type="file" ref={audioInputRef} accept="audio/*" onChange={handleAudioUpload} style={{display: 'none'}} />
              {audioFile && <div style={{fontSize: 12, color: '#10b981', marginTop: 6}}>{audioFile.name}</div>}
            </div>

            <div style={sectionStyle}>
              <h4>LRC読み込み整形</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
                <div style={fieldStyle}>
                  <label>終了位置</label>
                  <select value={lrcDurationMode} onChange={(e) => setLrcDurationMode(e.target.value as LrcDurationMode)}>
                    <option value="nextMinus">次行の少し前まで</option>
                    <option value="next">次行まで</option>
                    <option value="minHold">最低表示時間だけ</option>
                    <option value="tail">次行後も余韻を残す</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label>{lrcDurationMode === 'tail' ? '余韻' : '次行前の余白'}: {lrcEarlyEndFrames}f</label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={lrcEarlyEndFrames}
                    onChange={(e) => setLrcEarlyEndFrames(Number(e.target.value))}
                  />
                </div>
                <div style={fieldStyle}>
                  <label>最低表示: {lrcMinDisplayFrames}f</label>
                  <input
                    type="range"
                    min="6"
                    max="90"
                    step="1"
                    value={lrcMinDisplayFrames}
                    onChange={(e) => setLrcMinDisplayFrames(Number(e.target.value))}
                  />
                </div>
                <label style={{display: 'flex', gap: 8, alignItems: 'center', color: '#d1d5db', fontSize: 12}}>
                  <input
                    type="checkbox"
                    checked={lrcAutoClassify}
                    onChange={(e) => setLrcAutoClassify(e.target.checked)}
                  />
                  役割とトラックを自動整理
                </label>
              </div>
              <button
                type="button"
                onClick={reflowCurrentLyrics}
                style={{...buttonStyle, width: '100%', marginTop: 10, background: '#2563eb'}}
              >
                現在の歌詞へ整形を再適用
              </button>
            </div>

            <div style={sectionStyle}>
              <h4>曲調プリセット</h4>
              <div style={{display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10}}>
                {STYLE_PRESET_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedStylePresetCategory(category)}
                    style={{
                      ...buttonStyle,
                      flex: '0 0 auto',
                      padding: '7px 9px',
                      background: selectedStylePresetCategory === category ? '#7c3aed' : '#111827',
                      color: selectedStylePresetCategory === category ? '#ffffff' : '#cbd5e1',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: 12,
                    }}
                  >
                    {STYLE_PRESET_CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
              <div style={fieldStyle}>
                <label>スタイル: {filteredStylePresetOptions.length}件</label>
                <select value={selectedStylePreset} onChange={(e) => setSelectedStylePreset(e.target.value)}>
                  {filteredStylePresetOptions.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.label}</option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  borderRadius: 8,
                  background: '#111827',
                  color: '#cbd5e1',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <strong style={{color: '#f9fafb'}}>{STYLE_PRESETS[selectedStylePreset].label}</strong>
                <div style={{marginTop: 4}}>{STYLE_PRESETS[selectedStylePreset].description}</div>
                <div style={{marginTop: 6, color: '#93c5fd'}}>
                  {STYLE_PRESET_CATEGORY_LABELS[STYLE_PRESETS[selectedStylePreset].category]} / {STYLE_PRESETS[selectedStylePreset].variant}
                </div>
              </div>
              <button
                type="button"
                onClick={applyStylePreset}
                style={{...buttonStyle, width: '100%', marginTop: 10, background: '#7c3aed'}}
              >
                プリセットを歌詞へ適用
              </button>
            </div>

            <div style={sectionStyle}>
              <h4>読み込み後セットアップ</h4>
              <p style={{fontSize: 12, color: '#9ca3af', lineHeight: 1.5, margin: '0 0 10px'}}>
                LRC整形、曲調プリセット、密度に合わせた演出整理、トラック重なり回避の内容を確認してからまとめて適用します。
              </p>
              <button
                type="button"
                onClick={runPostImportSetup}
                disabled={lyrics.length === 0}
                style={{
                  ...buttonStyle,
                  width: '100%',
                  background: lyrics.length === 0 ? '#374151' : '#0e7490',
                  cursor: lyrics.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                整形・曲調・密度の適用内容を確認
              </button>
              {workflowPreview && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 8,
                    background: '#0f172a',
                    border: '1px solid rgba(34,211,238,0.32)',
                    color: '#d1d5db',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center'}}>
                    <div>
                      <div style={{fontWeight: 800, color: '#f9fafb'}}>適用前プレビュー</div>
                      <div style={{color: '#67e8f9', marginTop: 3}}>変更予定ブロック: {workflowPreview.changedBlocks}</div>
                    </div>
                    <button type="button" onClick={() => setWorkflowPreview(null)} style={{...buttonStyle, padding: '6px 8px', background: '#374151'}}>
                      取消
                    </button>
                  </div>
                  <ul style={{paddingLeft: 18, margin: '8px 0'}}>
                    {workflowPreview.messages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                  {workflowPreview.diffs && workflowPreview.diffs.length > 0 && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflow: 'auto', marginTop: 8}}>
                      {workflowPreview.diffs.map((diff) => (
                        <div key={diff.id} style={{padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)'}}>
                          <div style={{fontWeight: 800, color: '#f9fafb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {diff.text || '(空の歌詞)'}
                          </div>
                          <div style={{color: '#cbd5e1', marginTop: 3}}>{diff.changes.slice(0, 3).join(' / ')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={applyWorkflowPreview}
                    style={{...buttonStyle, width: '100%', marginTop: 10, background: '#0891b2'}}
                  >
                    この内容で適用
                  </button>
                </div>
              )}
              {workflowReport && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 8,
                    background: '#111827',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#d1d5db',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{fontWeight: 800, color: '#f9fafb'}}>{workflowReport.title}</div>
                  <div style={{color: '#93c5fd', marginTop: 3}}>変更ブロック: {workflowReport.changedBlocks}</div>
                  <ul style={{paddingLeft: 18, margin: '6px 0 0'}}>
                    {workflowReport.messages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                  {workflowReport.diffs && workflowReport.diffs.length > 0 && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflow: 'auto', marginTop: 8}}>
                      {workflowReport.diffs.map((diff) => (
                        <div key={diff.id} style={{padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)'}}>
                          <div style={{fontWeight: 800, color: '#f9fafb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {diff.text || '(空の歌詞)'}
                          </div>
                          <div style={{color: '#cbd5e1', marginTop: 3}}>{diff.changes.slice(0, 3).join(' / ')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={sectionStyle}>
              <h4>曲構成ビュー</h4>
              <p style={{fontSize: 12, color: '#9ca3af', lineHeight: 1.5, margin: '0 0 10px'}}>
                歌詞の間隔、密度、繰り返しから区間を推定します。サビ候補や余白区間をまとめて調整できます。
              </p>
              {lyricSections.length === 0 ? (
                <div style={{fontSize: 12, color: '#9ca3af'}}>LRCを読み込むと曲構成が表示されます。</div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  {lyricSections.map((section) => (
                    <div
                      key={section.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: '#111827',
                        borderLeft: `4px solid ${sectionKindColor(section.kind)}`,
                      }}
                    >
                      <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center'}}>
                        <button
                          type="button"
                          onClick={() => focusSection(section)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            color: '#f9fafb',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontWeight: 800,
                          }}
                        >
                          {section.label}
                        </button>
                        <span style={{fontSize: 11, color: '#9ca3af'}}>
                          {section.startFrame}f - {section.endFrame}f
                        </span>
                      </div>
                      <div style={{fontSize: 11, color: '#9ca3af', marginTop: 4}}>
                        {section.lyricIds.length}行 / {section.charCount}文字 / 繰り返し{section.repeatedLines}行
                      </div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8}}>
                        <button
                          type="button"
                          onClick={() => applySectionTreatment(section, 'chorus')}
                          style={{...buttonStyle, padding: 8, background: '#b45309'}}
                        >
                          サビ化
                        </button>
                        <button
                          type="button"
                          onClick={() => applySectionTreatment(section, 'space')}
                          style={{...buttonStyle, padding: 8, background: '#0f766e'}}
                        >
                          余韻化
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={sectionStyle}>
              <h4>タイミング微調整</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
                <div style={fieldStyle}>
                  <label>対象</label>
                  <select value={timingAdjustScope} onChange={(e) => setTimingAdjustScope(e.target.value as TimingAdjustScope)}>
                    <option value="selected">選択中の歌詞のみ</option>
                    <option value="fromSelected">選択行以降</option>
                    <option value="all">全歌詞</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label>移動量: {timingAdjustFrames}f</label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={timingAdjustFrames}
                    onChange={(e) => setTimingAdjustFrames(Number(e.target.value))}
                  />
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10}}>
                <button type="button" onClick={() => applyTimingShift(-timingAdjustFrames)} style={{...buttonStyle, background: '#374151'}}>
                  -{timingAdjustFrames}f
                </button>
                <button type="button" onClick={() => applyTimingShift(timingAdjustFrames)} style={{...buttonStyle, background: '#374151'}}>
                  +{timingAdjustFrames}f
                </button>
                <button
                  type="button"
                  onClick={moveSelectedLyricToCurrentFrame}
                  disabled={!selectedBlock}
                  style={{...buttonStyle, gridColumn: '1 / -1', background: selectedBlock ? '#0f766e' : '#374151', cursor: selectedBlock ? 'pointer' : 'not-allowed'}}
                >
                  選択歌詞を現在フレームへ移動
                </button>
              </div>
              <div style={{fontSize: 11, color: '#9ca3af', marginTop: 8, lineHeight: 1.5}}>
                ブロック、token境界、キーフレームをまとめて移動します。選択行以降は、選択歌詞がない場合は現在フレーム以降が対象です。
              </div>
            </div>

            <div style={sectionStyle}>
              <h4>歌詞密度ビュー</h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 4, marginBottom: 10}}>
                {densitySegments.map((segment) => (
                  <button
                    key={segment.id}
                    type="button"
                    title={`${segment.startFrame}f-${segment.endFrame}f / ${segment.charCount}文字 / 最大${segment.maxOverlap}行`}
                    onClick={() => {
                      const targetId = segment.lyricIds[0];
                      if (!targetId) return;
                      setSelectedId(targetId);
                      setActiveTab('edit');
                    }}
                    style={{
                      height: 42,
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 6,
                      background: segment.level === 'high' ? '#7f1d1d' : segment.level === 'medium' ? '#78350f' : '#164e63',
                      color: '#f9fafb',
                      cursor: segment.lyricIds.length ? 'pointer' : 'default',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: 4,
                    }}
                  >
                    {segment.charCount}
                  </button>
                ))}
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                {densitySegments
                  .filter((segment) => segment.lyricIds.length > 0)
                  .map((segment) => (
                    <div
                      key={`${segment.id}-detail`}
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        background: '#111827',
                        borderLeft: `4px solid ${segment.level === 'high' ? '#ef4444' : segment.level === 'medium' ? '#f59e0b' : '#06b6d4'}`,
                        fontSize: 12,
                        color: '#d1d5db',
                        lineHeight: 1.45,
                      }}
                    >
                      <strong>{segment.startFrame}f - {segment.endFrame}f</strong>
                      <span style={{color: '#9ca3af'}}> / {segment.charCount}文字 / 最大{segment.maxOverlap}行</span>
                      <div>{segment.recommendation}</div>
                    </div>
                  ))}
              </div>
              <button
                type="button"
                onClick={applyDensityFriendlyEffects}
                style={{...buttonStyle, width: '100%', marginTop: 10, background: '#0f766e'}}
              >
                密度に合わせて演出を整理
              </button>
            </div>

            <div style={sectionStyle}>
              <h4>強調語候補</h4>
              <p style={{fontSize: 12, color: '#9ca3af', lineHeight: 1.5, margin: '0 0 10px'}}>
                歌詞から見せ場になりそうな語を抽出し、Emphasisトラックへ短い強調ブロックとして追加します。
              </p>
              {emphasisCandidates.length === 0 ? (
                <div style={{fontSize: 12, color: '#9ca3af'}}>候補はありません。LRCを読み込むか、既存の強調ブロックを確認してください。</div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                  {emphasisCandidates.map((candidate) => (
                    <div
                      key={candidate.term}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: 8,
                        alignItems: 'center',
                        padding: 8,
                        borderRadius: 8,
                        background: '#111827',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div>
                        <div style={{fontWeight: 800, color: '#facc15'}}>{candidate.term}</div>
                        <div style={{fontSize: 11, color: '#9ca3af'}}>
                          {candidate.count}箇所 / score {candidate.score}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => createEmphasisBlocks(candidate.term)}
                        style={{...buttonStyle, padding: '8px 10px', background: '#b45309'}}
                      >
                        追加
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={sectionStyle}>
              <h4>読み込み後チェック</h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10}}>
                <div style={{padding: 8, borderRadius: 8, background: '#1f1113', color: '#fecaca', textAlign: 'center', fontSize: 12}}>重大 {issueCounts.error}</div>
                <div style={{padding: 8, borderRadius: 8, background: '#20180a', color: '#fde68a', textAlign: 'center', fontSize: 12}}>注意 {issueCounts.warning}</div>
                <div style={{padding: 8, borderRadius: 8, background: '#0b1820', color: '#bae6fd', textAlign: 'center', fontSize: 12}}>情報 {issueCounts.info}</div>
              </div>
              {lyricIssues.some((issue) => issue.lyricId && issue.kind !== 'audioMissing') && (
                <button
                  type="button"
                  onClick={fixAllDetectedIssues}
                  style={{...buttonStyle, width: '100%', marginBottom: 10, background: '#0f766e'}}
                >
                  補正できる項目をまとめて修正
                </button>
              )}
              <div style={{display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflow: 'auto'}}>
                {lyricIssues.length === 0 && (
                  <div style={{fontSize: 12, color: '#86efac'}}>大きな問題は検出されていません。</div>
                )}
                {lyricIssues.map((issue) => (
                  <div
                    key={issue.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: issue.lyricId && issue.kind !== 'audioMissing' ? '1fr auto' : '1fr',
                      gap: 8,
                      alignItems: 'center',
                      padding: 8,
                      borderRadius: 8,
                      background: issue.severity === 'error' ? '#7f1d1d' : issue.severity === 'warning' ? '#78350f' : '#164e63',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!issue.lyricId) return;
                        setSelectedId(issue.lyricId);
                        setActiveTab('edit');
                      }}
                      style={{
                        border: 'none',
                        padding: 0,
                        background: 'transparent',
                        color: '#f9fafb',
                        textAlign: 'left',
                        cursor: issue.lyricId ? 'pointer' : 'default',
                        fontWeight: 700,
                      }}
                    >
                      {issue.message}
                    </button>
                    {issue.lyricId && issue.kind !== 'audioMissing' && (
                      <button
                        type="button"
                        onClick={() => fixLyricIssue(issue)}
                        style={{...buttonStyle, padding: '6px 8px', background: 'rgba(255,255,255,0.16)'}}
                      >
                        補正
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <h4>リリック共通設定</h4>
              <FontPicker
                label="フォント"
                value={globalSettings.font}
                onChange={(font) => setGlobalSettings((prev) => ({...prev, font}))}
              />
              <EffectPicker label="歌唱中エフェクト" value={globalSettings.textEffect} options={TEXT_EFFECT_OPTIONS} kind="textEffect" onChange={(value) => setGlobalSettings((prev) => ({...prev, textEffect: value}))} />
              <label>歌唱中エフェクト速度: {globalSettings.effectSpeed}</label>
              <input type="range" min="1" max="10" step="1" value={globalSettings.effectSpeed} onChange={(e) => setGlobalSettings((prev) => ({...prev, effectSpeed: Number(e.target.value)}))} />
              <details>
                <summary style={{cursor: 'pointer', color: '#d1d5db', fontWeight: 700}}>共通フェード初期値</summary>
                <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                <div style={fieldStyle}>
                  <label>共通フェードIN</label>
                  <select
                    value={globalSettings.fadeInPattern ?? 'Linear'}
                    onChange={(e) => setGlobalSettings((prev) => ({...prev, fadeInPattern: e.target.value}))}
                  >
                    {FADE_PATTERN_OPTIONS.map((pattern) => <option key={pattern} value={pattern}>{pattern}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label>共通フェードOUT</label>
                  <select
                    value={globalSettings.fadeOutPattern ?? 'Linear'}
                    onChange={(e) => setGlobalSettings((prev) => ({...prev, fadeOutPattern: e.target.value}))}
                  >
                    {FADE_PATTERN_OPTIONS.map((pattern) => <option key={pattern} value={pattern}>{pattern}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label>フェードINフレーム</label>
                  <input
                    type="number"
                    min="0"
                    value={globalSettings.fadeInFrames ?? 8}
                    onChange={(e) => setGlobalSettings((prev) => ({...prev, fadeInFrames: Math.max(0, Number(e.target.value) || 0)}))}
                  />
                </div>
                <div style={fieldStyle}>
                  <label>フェードOUTフレーム</label>
                  <input
                    type="number"
                    min="0"
                    value={globalSettings.fadeOutFrames ?? 8}
                    onChange={(e) => setGlobalSettings((prev) => ({...prev, fadeOutFrames: Math.max(0, Number(e.target.value) || 0)}))}
                  />
                </div>
              </div>
              <button type="button" onClick={applyGlobalFadeToAllLyrics} style={{...buttonStyle, background: '#2563eb'}}>
                共通フェードを全テキストへ一括適用
              </button>
                </div>
              </details>
              <div style={fieldStyle}>
                <label>文字色</label>
                <input type="color" value={globalSettings.textColor} onChange={(e) => setGlobalSettings((prev) => ({...prev, textColor: e.target.value}))} />
              </div>
              <div style={fieldStyle}>
                <label>動画背景色</label>
                <input type="color" value={globalSettings.backgroundColor} onChange={(e) => setGlobalSettings((prev) => ({...prev, backgroundColor: e.target.value}))} />
              </div>
              <div style={fieldStyle}>
                <label>文字背景色</label>
                <div style={{display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'center'}}>
                  <input
                    type="color"
                    value={globalSettings.textBackgroundColor && globalSettings.textBackgroundColor !== 'transparent' ? globalSettings.textBackgroundColor : '#000000'}
                    onChange={(e) => setGlobalSettings((prev) => ({...prev, textBackgroundColor: e.target.value}))}
                  />
                  <button
                    type="button"
                    onClick={() => setGlobalSettings((prev) => ({...prev, textBackgroundColor: 'transparent'}))}
                    style={{...buttonStyle, padding: 8, background: '#374151'}}
                  >
                    透明にする
                  </button>
                </div>
              </div>
              <div style={fieldStyle}>
                <label>枠線色</label>
                <input type="color" value={globalSettings.outlineColor} onChange={(e) => setGlobalSettings((prev) => ({...prev, outlineColor: e.target.value}))} />
              </div>
              <label>枠線幅: {globalSettings.outlineWidth ?? 2}px</label>
              <input type="range" min="0" max="12" step="1" value={globalSettings.outlineWidth ?? 2} onChange={(e) => setGlobalSettings((prev) => ({...prev, outlineWidth: Number(e.target.value)}))} />
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
              <button onClick={exportProjectJson} style={{...buttonStyle, background: '#10b981'}}>データ出力</button>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (event) => importProjectJson(event as unknown as React.ChangeEvent<HTMLInputElement>);
                  input.click();
                }}
                style={{...buttonStyle, background: '#f59e0b'}}
              >
                データ読込
              </button>
            </div>
            {projectImportReport && (
              <div style={sectionStyle}>
                <h4>JSON読み込み結果</h4>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background: '#111827',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#d1d5db',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{fontWeight: 800, color: '#f9fafb'}}>{projectImportReport.fileName}</div>
                  <div>{projectImportReport.lyricCount} blocks / {projectImportReport.fixedCount} blocks fixed</div>
                  {projectImportReport.messages.length > 0 ? (
                    <ul style={{margin: '8px 0 0', paddingLeft: 18}}>
                      {projectImportReport.messages.map((message, index) => (
                        <li key={`${message}-${index}`}>{message}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{marginTop: 8, color: '#86efac'}}>補正なしで読み込めました。</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'output' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <h4>動画エクスポート</h4>
            <p style={{fontSize: 12, color: '#9ca3af', lineHeight: 1.5}}>
              透明背景のMOVを書き出します。ブラウザが保存先選択に対応している場合は、ボタンを押したあとに保存先を選べます。
            </p>
            <button
              onClick={exportMov}
              disabled={exportStatus.kind === 'rendering'}
              style={{
                ...buttonStyle,
                background: exportStatus.kind === 'rendering' ? '#374151' : '#10b981',
                cursor: exportStatus.kind === 'rendering' ? 'wait' : 'pointer',
              }}
            >
              {exportStatus.kind === 'rendering' ? '出力中...' : 'MOVを書き出す'}
            </button>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: '#05070b',
                color: exportStatus.kind === 'error' ? '#fca5a5' : exportStatus.kind === 'done' ? '#86efac' : '#9ca3af',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {exportStatus.message}
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16, color: '#d1d5db', fontSize: 13, lineHeight: 1.7}}>
            <div>
              <h4>基本の流れ</h4>
              <ol style={{paddingLeft: 20, margin: 0}}>
                <li>入力・共通で音楽ファイル、LRCファイル、またはプロジェクトJSONを読み込みます。</li>
                <li>LRCは読み込み整形の設定に従って表示時間、役割ラベル、トラックが自動整理されます。</li>
                <li>タイムラインで歌詞ブロックを選択します。</li>
                <li>編集で文字、歌詞同期単位、開始/終了、位置、倍率、角度、色、枠線、エフェクトを調整します。</li>
                <li>動きを付けたい項目はキーフレームに登録します。</li>
                <li>出力から透明背景のMOVを書き出します。</li>
              </ol>
            </div>
            <div style={sectionStyle}>
              <h4>LRC読み込み整形</h4>
              <p>入力・共通のLRC読み込み整形では、LRCの開始時刻から各行の終了位置を作ります。次行の少し前まで、次行まで、最低表示時間だけ、余韻を残す、から選べます。</p>
              <p>役割とトラックを自動整理すると、短いキメや合いの手はEmphasis、間奏表記はFX / Accent、重なりそうな行はAlt / Overlapへ寄せます。</p>
              <p>曲調プリセットでは、12カテゴリ、合計60プリセットからフォント、色、登場/歌唱中/退場エフェクトをまとめて初期化できます。カテゴリボタンで曲調を絞り込めます。</p>
              <p>読み込み後セットアップでは、LRC整形、選択中の曲調プリセット、歌詞密度に合わせた演出整理、トラック重なり回避の適用内容を事前確認できます。代表的な変更を見てから適用でき、適用後は1回のUndoで戻せます。</p>
              <p>曲構成ビューでは、歌詞間隔、繰り返し、密度からサビ候補や余白区間を推定します。区間ごとにサビ化や余韻化をまとめて適用できます。</p>
              <p>タイミング微調整では、選択中の歌詞、選択行以降、全歌詞を数フレーム単位で前後に移動できます。token境界とキーフレームも一緒に移動します。</p>
              <p>歌詞密度ビューでは、区間ごとの文字量と重なりを色で確認できます。密度が高い区間は軽い歌詞追従、余白が多い区間は余韻や3D演出に向いています。</p>
              <p>強調語候補では、歌詞内の印象的な語や繰り返し語からEmphasisトラック用の短いブロックを作れます。追加後は通常の歌詞ブロックとして位置、色、エフェクトを調整できます。</p>
              <p>読み込み後チェックでは、短すぎる表示、長すぎる行、同一トラックの重なり、動画尺外、Beat系演出とビート情報の不足を一覧できます。補正ボタンで安全な範囲の自動修正もできます。</p>
              <p>データ読込では、AI生成JSONや古いプロジェクトJSONの不足値、未知のフォント/エフェクト、範囲外フレーム、token/keyframeを読み込み時に正規化し、結果をJSON読み込み結果に表示します。</p>
            </div>
            <div style={sectionStyle}>
              <h4>タイムライン</h4>
              <p>Main Lyricsは通常の歌詞、Alt / Overlapは重なり回避、Emphasisは強調語、FX / Accentは演出メモ用のレーンです。</p>
              <p>ブロック本体をドラッグすると開始位置を移動できます。上下にドラッグするとトラックを移動できます。</p>
              <p>ビート吸着がONのときは、ブロック移動や端の調整が近い検出ビートへ吸着します。Altを押しながら操作すると1フレーム単位になります。</p>
              <p>波形エリアのダブルクリックで手動ビートを追加できます。ビート線はドラッグで移動、ダブルクリックまたは選択拍を削除で削除できます。</p>
              <p>ビート線を選択すると拍強度を調整できます。強度はBeat GlowやBass Dropなどの反応量に使われます。</p>
              <p>BPMグリッドを作ると、音声解析に頼らず一定間隔の拍を配置できます。Beat系エフェクトは検出・手動・BPMグリッドの拍に反応します。</p>
              <p>歌詞ブロック内の細い区切り線はtoken境界です。ドラッグすると単語・モーラ・文字の同期タイミングを直接調整できます。</p>
              <p>キーフレームがあるフレームには菱形マーカーが表示され、左右へドラッグしてフレーム位置を調整できます。</p>
            </div>
            <div style={sectionStyle}>
              <h4>歌詞同期</h4>
              <p>同期単位はAuto、Word、Mora、Characterから選べます。空白を含む歌詞はAutoで単語寄り、空白のない日本語歌詞はモーラ寄りに分割します。</p>
              <p>ビートへ割当を使うと、選択中の歌詞tokenをブロック内の拍へ自動配置します。細かいズレはタイムライン上のtoken境界ドラッグで調整します。</p>
            </div>
            <div style={sectionStyle}>
              <h4>エフェクトフェーズ</h4>
              <p>登場エフェクトは歌詞が出る時の動き、歌唱中エフェクトはブロック表示中の文字演出、退場エフェクトは消える時の動きです。</p>
              <p>登場/退場タイミングでは、登場と退場を切り替えるフレームやフェード量を調整できます。</p>
              <p>通常の3D歌唱中エフェクトもtoken同期を使います。高速トンネル系など一部の密度演出は、画面密度を保つため文字リピートで描画します。</p>
            </div>
            <div style={sectionStyle}>
              <h4>キーフレーム</h4>
              <p>変更項目を選び、現在のフレームに値を追加すると、その項目だけが時間に沿って変化します。</p>
              <p>X位置、Y位置、倍率、角度、文字色、文字背景色、枠線色、枠線幅、エフェクト強度、エフェクト開始/終了、表示速度を登録できます。</p>
              <p>数値はフレーム間でなめらかに補間されます。色や透明指定は直前のキーフレーム値で切り替わります。</p>
            </div>
            <div style={sectionStyle}>
              <h4>ショートカット</h4>
              <p>Ctrl/Cmd+Z: 戻す、Shift+Ctrl/Cmd+Z: やり直し、Space: 再生、←/→: 1フレーム移動、Delete: 選択中の歌詞を削除。</p>
            </div>
            <div style={sectionStyle}>
              <h4>プレビュー</h4>
              <p>文字位置ドラッグをONにすると、選択中の歌詞をプレビュー上で直接動かしてX/Yを調整できます。</p>
              <p>動画背景色を透明にすると、MOV出力でも透明背景として扱われます。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
