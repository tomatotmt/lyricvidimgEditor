import type {CSSProperties} from 'react';

export type EffectKind = 'effect' | 'textEffect';
export type EffectCategory = 'All' | 'Basic' | 'Motion' | 'Light / Color' | 'Glitch / AI' | 'Character' | '3D' | 'Cinematic';
export type EffectPurpose = 'All' | 'Karaoke' | 'Beat' | 'Chorus' | 'Emotional' | 'Impact' | 'Glitch' | '3D' | 'Subtle';

export type EffectPreset = {
  name: string;
  kind: EffectKind;
  category?: EffectCategory;
  character?: boolean;
};

export type EffectMetadata = {
  name: string;
  displayName: string;
  description: string;
  purpose: EffectPurpose;
  tags: readonly string[];
};

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
  'Glow',
  'Wiggle',
  'Floating',
  'Vibration',
  'Slow Zoom',
  'Neon Flicker',
  'Echo / Trail',
  'Color Cycle',
  'Chromatic Aberration',
  'Cinematic Pan',
  'Text Scramble Loop',
  'Circular Spin',
  'Multi-Reflection',
  'Heartbeat Pulse',
  'Shadow Drift',
  'Solemn Scale',
  '3D Text Tunnel',
] as const;

export const TEXT_EFFECT_OPTIONS = [
  'None',
  'Fade In',
  'Typewriter',
  'Bounce In',
  'Zoom In',
  'Slide In',
  'Glitch Entry',
  'Pop In',
  'Slide & Stop',
  'Whip Pan',
  '3D Flip',
  'Elastic Scale',
  'Staggered Bounce',
  'Scatter to Gather',
  'Tracking Expander',
  'Random Decode',
  'Mask Wipe',
  'Kinetic Impact',
  'Drop & Bounce',
  'Blur Reveal',
  'Shatter Fade',
  'Rotate & Scale',
  'Word by Word Fade',
  'Karaoke Sweep',
  'Word Highlight',
  'Beat Pop',
  'Chorus Burst',
  'Whisper Fade',
  'Shout Impact',
  'Beat Glow',
  'Beat Shake',
  'Beat Strobe',
  'Bass Drop',
  'Vocal Chase',
  'Syllable Sweep',
  'Phrase Pulse',
  'Lyric Scan',
  'Flash & Fade',
  'Ghostly Rise',
  'TV Static Reveal',
  'Matrix Rain',
  'Liquid Melt',
  'Slash Cut-In',
  'Impact Shake & Blur',
  'Pixelate Transition',
  'Spinning Drop',
  'Char Fade In/Out',
  'Char Rotate Drop (Top)',
  'Char Rotate Drop (Bottom)',
  'Char Extreme Zoom In',
  'Char Extreme Zoom In/Out',
  'Char Bounce In',
  'Char Radial In',
  'Char Radial Out',
  'Char Radial In/Out',
  'Horizontal Slice Merge',
  'Vertical Slice Merge',
  '3D Circular Pan',
  '3D Depth Flyby',
  '3D Spiral Drop',
  '3D Char Flip Board',
  'Orbit Giant Letters',
  'FPS Letter Rush',
  'Text Tunnel Dive',
  'Spiral Word Galaxy',
  'Impact Billboard 3D',
  'Vocaloid Grid City',
  'Data Glitch Corridor',
  'Rotating Lyrics Ring',
  'Character Cannon',
  'Scatter To Camera',
  'Camera Whip Words',
  'Deep Focus Swap',
  'Falling Text Abyss',
  'Exploded Word Rebuild',
  'Vortex Karaoke',
  'Orbit Camera Snap',
  'Floating Caption Field',
  'Perspective Typewriter 3D',
  'Neon Depth Chase',
  'Broken Subtitle Space',
  'Lyrics Roller Coaster',
  'Massive Word Eclipse',
  'Glyph Corridor Rush',
  'Kanji Gate Dash',
  'Chromatic Speed Tunnel',
] as const;

export const THREE_TEXT_EFFECT_OPTIONS = [
  'Orbit Giant Letters',
  'FPS Letter Rush',
  'Text Tunnel Dive',
  'Spiral Word Galaxy',
  'Impact Billboard 3D',
  'Vocaloid Grid City',
  'Data Glitch Corridor',
  'Rotating Lyrics Ring',
  'Character Cannon',
  'Scatter To Camera',
  'Camera Whip Words',
  'Deep Focus Swap',
  'Falling Text Abyss',
  'Exploded Word Rebuild',
  'Vortex Karaoke',
  'Orbit Camera Snap',
  'Floating Caption Field',
  'Perspective Typewriter 3D',
  'Neon Depth Chase',
  'Broken Subtitle Space',
  'Lyrics Roller Coaster',
  'Massive Word Eclipse',
  'Glyph Corridor Rush',
  'Kanji Gate Dash',
  'Chromatic Speed Tunnel',
] as const;

export const EFFECT_CATEGORIES: readonly EffectCategory[] = [
  'All',
  'Basic',
  'Motion',
  'Light / Color',
  'Glitch / AI',
  'Cinematic',
  '3D',
] as const;

export const TEXT_EFFECT_CATEGORIES: readonly EffectCategory[] = [
  'All',
  'Basic',
  'Motion',
  'Glitch / AI',
  'Character',
  'Cinematic',
  '3D',
] as const;

export const EFFECT_PURPOSES: readonly EffectPurpose[] = [
  'All',
  'Karaoke',
  'Beat',
  'Chorus',
  'Emotional',
  'Impact',
  'Glitch',
  '3D',
  'Subtle',
] as const;

const DISPLAY_EFFECT_CATEGORIES: Record<(typeof EFFECT_OPTIONS)[number], EffectCategory> = {
  None: 'Basic',
  Pop: 'Basic',
  Slide: 'Basic',
  Shake: 'Motion',
  Zoom: 'Basic',
  Blur: 'Basic',
  Glitch: 'Glitch / AI',
  Bounce: 'Motion',
  Neon: 'Light / Color',
  Glow: 'Light / Color',
  Wiggle: 'Motion',
  Floating: 'Motion',
  Vibration: 'Motion',
  'Slow Zoom': 'Basic',
  'Neon Flicker': 'Light / Color',
  'Echo / Trail': 'Light / Color',
  'Color Cycle': 'Light / Color',
  'Chromatic Aberration': 'Light / Color',
  'Cinematic Pan': 'Cinematic',
  'Text Scramble Loop': 'Glitch / AI',
  'Circular Spin': 'Motion',
  'Multi-Reflection': 'Light / Color',
  'Heartbeat Pulse': 'Motion',
  'Shadow Drift': 'Light / Color',
  'Solemn Scale': 'Basic',
  '3D Text Tunnel': '3D',
};

const TEXT_BASIC_EFFECTS = new Set<string>(['None', 'Fade In']);
const TEXT_MOTION_EFFECTS = new Set<string>([
  'Bounce In',
  'Zoom In',
  'Slide In',
  'Pop In',
  'Slide & Stop',
  'Whip Pan',
  'Elastic Scale',
  'Kinetic Impact',
  'Drop & Bounce',
  'Rotate & Scale',
  'Slash Cut-In',
  'Impact Shake & Blur',
  'Spinning Drop',
  'Beat Pop',
  'Shout Impact',
  'Beat Glow',
  'Beat Shake',
  'Beat Strobe',
  'Bass Drop',
  'Phrase Pulse',
]);
const TEXT_GLITCH_EFFECTS = new Set<string>([
  'Glitch Entry',
  'Random Decode',
  'TV Static Reveal',
  'Matrix Rain',
  'Pixelate Transition',
  'Data Glitch Corridor',
  'Broken Subtitle Space',
]);
const TEXT_CHARACTER_EFFECTS = new Set<string>([
  'Typewriter',
  'Staggered Bounce',
  'Scatter to Gather',
  'Tracking Expander',
  'Word by Word Fade',
  'Karaoke Sweep',
  'Word Highlight',
  'Vocal Chase',
  'Syllable Sweep',
  'Lyric Scan',
  'Horizontal Slice Merge',
  'Vertical Slice Merge',
]);
const TEXT_CINEMATIC_EFFECTS = new Set<string>([
  'Mask Wipe',
  'Blur Reveal',
  'Shatter Fade',
  'Chorus Burst',
  'Whisper Fade',
  'Flash & Fade',
  'Ghostly Rise',
  'Liquid Melt',
]);
const TEXT_3D_EXTRA_EFFECTS = new Set<string>([
  '3D Flip',
  '3D Circular Pan',
  '3D Depth Flyby',
  '3D Spiral Drop',
  '3D Char Flip Board',
]);

export const getEffectCategory = (name: string): EffectCategory =>
  DISPLAY_EFFECT_CATEGORIES[name as (typeof EFFECT_OPTIONS)[number]] ?? 'Basic';

export const getTextEffectCategory = (name: string): EffectCategory => {
  if (
    THREE_TEXT_EFFECT_OPTIONS.includes(name as (typeof THREE_TEXT_EFFECT_OPTIONS)[number]) ||
    TEXT_3D_EXTRA_EFFECTS.has(name)
  ) {
    return '3D';
  }
  if (name.startsWith('Char ') || TEXT_CHARACTER_EFFECTS.has(name)) {
    return 'Character';
  }
  if (TEXT_GLITCH_EFFECTS.has(name)) {
    return 'Glitch / AI';
  }
  if (TEXT_MOTION_EFFECTS.has(name)) {
    return 'Motion';
  }
  if (TEXT_CINEMATIC_EFFECTS.has(name)) {
    return 'Cinematic';
  }
  if (TEXT_BASIC_EFFECTS.has(name)) {
    return 'Basic';
  }
  return 'Cinematic';
};

const EFFECT_METADATA_OVERRIDES: Record<string, Partial<Omit<EffectMetadata, 'name'>>> = {
  None: {
    displayName: 'なし',
    description: '動きを付けず、文字をそのまま表示します。',
    purpose: 'Subtle',
    tags: ['basic', 'off'],
  },
  Pop: {
    displayName: 'ポップ',
    description: '短い強調に向いたスケールの跳ねです。',
    purpose: 'Beat',
    tags: ['beat', 'scale'],
  },
  Shake: {
    displayName: 'シェイク',
    description: '衝撃や叫びに合わせて文字を揺らします。',
    purpose: 'Impact',
    tags: ['impact', 'shake'],
  },
  Glitch: {
    displayName: 'グリッチ',
    description: 'デジタルノイズ風のズレを加えます。',
    purpose: 'Glitch',
    tags: ['noise', 'digital'],
  },
  Neon: {
    displayName: 'ネオン',
    description: '発光する字幕やサビ前の強調に向いています。',
    purpose: 'Chorus',
    tags: ['glow', 'light'],
  },
  Glow: {
    displayName: 'グロー',
    description: '文字の存在感を柔らかく上げます。',
    purpose: 'Emotional',
    tags: ['light', 'soft'],
  },
  'Slow Zoom': {
    displayName: 'スローズーム',
    description: '静かな歌詞にゆっくり寄る動きです。',
    purpose: 'Emotional',
    tags: ['slow', 'zoom'],
  },
  'Cinematic Pan': {
    displayName: 'シネマティックパン',
    description: '映画的に横へ流れる落ち着いた動きです。',
    purpose: 'Emotional',
    tags: ['cinematic', 'pan'],
  },
  'Text Scramble Loop': {
    displayName: 'スクランブルループ',
    description: '文字を断続的にノイズ化します。',
    purpose: 'Glitch',
    tags: ['scramble', 'loop'],
  },
  '3D Text Tunnel': {
    displayName: '3Dテキストトンネル',
    description: '奥行き方向のうねりを加えます。',
    purpose: '3D',
    tags: ['depth', 'tunnel'],
  },
  'Fade In': {
    displayName: 'フェードイン',
    description: '字幕を自然に出す基本の表示です。',
    purpose: 'Subtle',
    tags: ['basic', 'fade'],
  },
  Typewriter: {
    displayName: 'タイプライター',
    description: '文字を順番に表示します。',
    purpose: 'Karaoke',
    tags: ['character', 'typing'],
  },
  'Pop In': {
    displayName: 'ポップイン',
    description: '短い歌詞や語尾の強調に使いやすい動きです。',
    purpose: 'Beat',
    tags: ['pop', 'entry'],
  },
  'Glitch Entry': {
    displayName: 'グリッチ登場',
    description: '登場時にデジタルなズレを付けます。',
    purpose: 'Glitch',
    tags: ['entry', 'noise'],
  },
  'Karaoke Sweep': {
    displayName: 'カラオケスイープ',
    description: '歌唱の進行に合わせて文字を左から明るくします。',
    purpose: 'Karaoke',
    tags: ['karaoke', 'highlight', 'sing-along'],
  },
  'Word Highlight': {
    displayName: 'ワードハイライト',
    description: '同期単位で分割した語句やモーラを順番に持ち上げ、歌唱位置を強調します。',
    purpose: 'Karaoke',
    tags: ['word', 'focus', 'stagger'],
  },
  'Beat Pop': {
    displayName: 'ビートポップ',
    description: '検出・手動・BPMグリッドの拍に反応して、短い跳ねでフレーズを強調します。',
    purpose: 'Beat',
    tags: ['beat', 'pop', 'short'],
  },
  'Chorus Burst': {
    displayName: 'サビバースト',
    description: 'サビ頭で大きく光らせて画面を押し出します。',
    purpose: 'Chorus',
    tags: ['chorus', 'burst', 'glow'],
  },
  'Whisper Fade': {
    displayName: 'ウィスパーフェード',
    description: '静かな歌詞を息のように薄く浮かべます。',
    purpose: 'Emotional',
    tags: ['soft', 'fade', 'ballad'],
  },
  'Shout Impact': {
    displayName: 'シャウトインパクト',
    description: '叫びや決め台詞に向いた強い衝撃表現です。',
    purpose: 'Impact',
    tags: ['impact', 'shout', 'shake'],
  },
  'Beat Glow': {
    displayName: 'ビートグロー',
    description: '検出・手動・BPMグリッドの拍で文字の発光を強めます。',
    purpose: 'Beat',
    tags: ['beat', 'audio', 'glow'],
  },
  'Beat Shake': {
    displayName: 'ビートシェイク',
    description: '検出・手動・BPMグリッドの拍の瞬間だけ文字を鋭く揺らします。',
    purpose: 'Beat',
    tags: ['beat', 'audio', 'shake'],
  },
  'Beat Strobe': {
    displayName: 'ビートストロボ',
    description: '検出・手動・BPMグリッドの拍に合わせて明滅する字幕演出です。',
    purpose: 'Beat',
    tags: ['beat', 'audio', 'strobe'],
  },
  'Bass Drop': {
    displayName: 'ベースドロップ',
    description: '強い拍マーカーで文字を沈めて押し返す低音向け演出です。',
    purpose: 'Impact',
    tags: ['beat', 'drop', 'bass'],
  },
  'Vocal Chase': {
    displayName: 'ボーカルチェイス',
    description: 'token同期の進行を追いかけるように、語句やモーラ単位で発光します。',
    purpose: 'Karaoke',
    tags: ['vocal', 'karaoke', 'character'],
  },
  'Syllable Sweep': {
    displayName: 'シラブルスイープ',
    description: 'Mora/Character同期に合わせ、音節感のある順送りで歌詞をなぞります。',
    purpose: 'Karaoke',
    tags: ['syllable', 'karaoke', 'sweep'],
  },
  'Phrase Pulse': {
    displayName: 'フレーズパルス',
    description: 'フレーズ全体を拍と進行に合わせて呼吸させます。',
    purpose: 'Chorus',
    tags: ['phrase', 'beat', 'pulse'],
  },
  'Lyric Scan': {
    displayName: 'リリックスキャン',
    description: '走査線が歌詞を読み取るように流れます。',
    purpose: 'Karaoke',
    tags: ['scan', 'karaoke', 'line'],
  },
  'Random Decode': {
    displayName: 'ランダムデコード',
    description: '暗号が解けるように文字を出します。',
    purpose: 'Glitch',
    tags: ['decode', 'digital'],
  },
  'Matrix Rain': {
    displayName: 'マトリックスレイン',
    description: '落下するデータ文字のように表示します。',
    purpose: 'Glitch',
    tags: ['matrix', 'digital'],
  },
  'Blur Reveal': {
    displayName: 'ブラーリビール',
    description: 'ぼかしから文字を浮かび上がらせます。',
    purpose: 'Emotional',
    tags: ['blur', 'reveal'],
  },
  'Flash & Fade': {
    displayName: 'フラッシュフェード',
    description: '一瞬光ってから自然に馴染ませます。',
    purpose: 'Chorus',
    tags: ['flash', 'light'],
  },
};

const defaultPurposeForCategory = (category: EffectCategory): EffectPurpose => {
  switch (category) {
    case '3D':
      return '3D';
    case 'Glitch / AI':
      return 'Glitch';
    case 'Light / Color':
      return 'Chorus';
    case 'Cinematic':
      return 'Emotional';
    case 'Motion':
      return 'Beat';
    case 'Character':
      return 'Karaoke';
    default:
      return 'Subtle';
  }
};

export const getEffectMetadata = (name: string, kind: EffectKind): EffectMetadata => {
  const category = kind === 'effect' ? getEffectCategory(name) : getTextEffectCategory(name);
  const override = EFFECT_METADATA_OVERRIDES[name] ?? {};
  return {
    name,
    displayName: override.displayName ?? name,
    description: override.description ?? `${category}カテゴリの文字動画向けエフェクトです。`,
    purpose: override.purpose ?? defaultPurposeForCategory(category),
    tags: override.tags ?? [category.toLowerCase()],
  };
};

export const EFFECT_PRESETS: EffectPreset[] = EFFECT_OPTIONS.map((name) => ({
  name,
  kind: 'effect',
  category: getEffectCategory(name),
}));

export const TEXT_EFFECT_PRESETS: EffectPreset[] = TEXT_EFFECT_OPTIONS.map((name) => ({
  name,
  kind: 'textEffect',
  category: getTextEffectCategory(name),
  character:
    THREE_TEXT_EFFECT_OPTIONS.includes(name as (typeof THREE_TEXT_EFFECT_OPTIONS)[number]) ||
    name.startsWith('Char ') ||
    [
      'Typewriter',
      'Staggered Bounce',
      'Scatter to Gather',
      'Random Decode',
      'Karaoke Sweep',
      'Word Highlight',
      'Vocal Chase',
      'Syllable Sweep',
      'Lyric Scan',
      'Shatter Fade',
      'Matrix Rain',
      'Liquid Melt',
      'Spinning Drop',
      '3D Circular Pan',
      '3D Depth Flyby',
      '3D Spiral Drop',
      '3D Char Flip Board',
    ].includes(name),
}));

export type EffectAnimationContext = {
  frame: number;
  startFrame: number;
  endFrame: number;
  speed: number;
  intensity: number;
  index?: number;
  total?: number;
  beatIntensity?: number;
};

export type EffectAnimationResult = {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  skew?: number;
  opacity?: number;
  blur?: number;
  letterSpacing?: number;
  color?: string;
  textShadow?: string;
  filter?: string;
  clipPath?: string;
  transformExtra?: string;
  text?: string;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const progress = (ctx: EffectAnimationContext) => {
  const duration = Math.max(1, ctx.endFrame - ctx.startFrame);
  return clamp((ctx.frame - ctx.startFrame) / duration);
};

const entryProgress = (ctx: EffectAnimationContext) => {
  const delay = (ctx.index ?? 0) * Math.max(1, ctx.speed * 0.55);
  const span = Math.max(2, ctx.speed * 4);
  return clamp((ctx.frame - ctx.startFrame - delay) / span);
};

const exitProgress = (ctx: EffectAnimationContext) => {
  const delay = (ctx.index ?? 0) * Math.max(1, ctx.speed * 0.35);
  const span = Math.max(8, ctx.speed * 4);
  return clamp((ctx.frame - ctx.endFrame + span - delay) / span);
};

const wave = (frame: number, speed: number, phase = 0) => Math.sin(frame * speed + phase);

const seed = (index = 0) => {
  const value = Math.sin((index + 1) * 999) * 10000;
  return value - Math.floor(value);
};

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const elastic = (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -8 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);

export const scrambleText = (text: string, frame: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&?';
  return [...text]
    .map((char, index) => {
      if (char.trim() === '') return char;
      if (frame > 16 + index * 3) return char;
      return chars[Math.abs(frame + index * 7) % chars.length];
    })
    .join('');
};

export const getTextEffectAnimation = (
  effect: string,
  ctx: EffectAnimationContext,
  text: string
): EffectAnimationResult => {
  const p = entryProgress(ctx);
  const out = exitProgress(ctx);
  const e = easeOut(p);
  const s = seed(ctx.index);
  const phase = s * Math.PI * 2;
  const beat = ctx.beatIntensity ?? 0;

  switch (effect) {
    case 'None':
      return {};
    case 'Fade In':
    case 'Word by Word Fade':
      return {opacity: p * (1 - out), y: (1 - p) * 14};
    case 'Karaoke Sweep': {
      const total = Math.max(1, ctx.total ?? text.length);
      const reveal = p * (total + 1);
      const distance = reveal - (ctx.index ?? 0);
      const active = clamp(distance, 0, 1);
      return {
        opacity: 0.45 + active * 0.55,
        color: active > 0.2 ? '#fef08a' : '#d1d5db',
        y: (1 - active) * 8,
        textShadow: active > 0.2 ? '0 0 18px rgba(250,204,21,.75)' : undefined,
      };
    }
    case 'Word Highlight': {
      const total = Math.max(1, ctx.total ?? text.length);
      const cursor = Math.floor(p * total);
      const distance = Math.abs((ctx.index ?? 0) - cursor);
      const focus = clamp(1 - distance / 2);
      return {
        opacity: 0.72 + focus * 0.28,
        scale: 1 + focus * 0.18,
        y: -focus * 12,
        color: focus > 0.35 ? '#ffffff' : undefined,
        textShadow: focus > 0.35 ? '0 0 16px rgba(255,255,255,.55)' : undefined,
      };
    }
    case 'Beat Pop': {
      const punch = Math.pow(beat, 0.72);
      return {opacity: p, scale: 1 + punch * 0.24, y: -punch * 14, textShadow: punch > 0.45 ? '0 0 22px rgba(96,165,250,.85)' : undefined};
    }
    case 'Chorus Burst': {
      const burst = 1 - clamp((ctx.frame - ctx.startFrame) / Math.max(10, ctx.speed * 3));
      return {
        opacity: p,
        scale: 1 + burst * 0.85,
        blur: burst * 5,
        textShadow: `0 0 ${18 + burst * 42}px rgba(255,255,255,.9), 0 0 ${30 + burst * 60}px rgba(59,130,246,.55)`,
      };
    }
    case 'Whisper Fade':
      return {opacity: p * (1 - out) * 0.86, y: (1 - p) * 24 - out * 18, blur: (1 - p + out) * 7, letterSpacing: 2 + p * 3};
    case 'Shout Impact': {
      const hit = 1 - clamp((ctx.frame - ctx.startFrame) / Math.max(8, ctx.speed * 2));
      return {
        opacity: p,
        scale: 1 + hit * 0.75,
        x: wave(ctx.frame, 2.8) * hit * 18,
        y: wave(ctx.frame, 3.6, 1) * hit * 12,
        blur: hit * 3,
        textShadow: '4px 0 #ef4444, -4px 0 #06b6d4, 0 0 24px rgba(255,255,255,.6)',
      };
    }
    case 'Beat Glow':
      return {opacity: p, scale: 1 + beat * 0.18, textShadow: beat > 0.03 ? `0 0 ${12 + beat * 44}px rgba(250,204,21,.9)` : undefined};
    case 'Beat Shake':
      return {opacity: p, x: wave(ctx.frame, 3.4) * beat * 24, y: wave(ctx.frame, 4.1, 1) * beat * 16, rotate: wave(ctx.frame, 2.2) * beat * 3};
    case 'Beat Strobe':
      return {opacity: beat > 0.18 ? 1 : Math.max(0.35, p * 0.75), filter: `brightness(${1 + beat * 3.6}) contrast(${1 + beat * 1.4})`};
    case 'Bass Drop':
      return {opacity: p, y: beat * 56, scale: 1 + beat * 0.42, blur: beat * 3.2, transformExtra: `scaleY(${1 - beat * 0.22})`};
    case 'Vocal Chase': {
      const total = Math.max(1, ctx.total ?? text.length);
      const cursor = p * total;
      const distance = Math.abs((ctx.index ?? 0) - cursor);
      const focus = clamp(1 - distance / 2.2);
      const boost = Math.max(focus, beat * focus);
      return {opacity: 0.55 + boost * 0.45, scale: 1 + boost * 0.22, y: -boost * 10, textShadow: boost > 0.25 ? '0 0 20px rgba(34,211,238,.8)' : undefined};
    }
    case 'Syllable Sweep': {
      const total = Math.max(1, ctx.total ?? text.length);
      const sweep = clamp(p * (total + 2) - (ctx.index ?? 0));
      return {
        opacity: 0.3 + sweep * 0.7,
        x: (1 - sweep) * -18,
        color: sweep > 0.45 ? '#fef3c7' : '#cbd5e1',
        textShadow: sweep > 0.45 ? '0 0 18px rgba(251,191,36,.75)' : undefined,
      };
    }
    case 'Phrase Pulse': {
      const phrase = Math.sin(p * Math.PI);
      return {opacity: p * (1 - out), scale: 1 + phrase * 0.08 + beat * 0.16, letterSpacing: phrase * 3, textShadow: beat > 0.1 ? '0 0 26px rgba(255,255,255,.75)' : undefined};
    }
    case 'Lyric Scan': {
      const scan = clamp(p * 1.25);
      const total = Math.max(1, ctx.total ?? text.length);
      const active = clamp(scan * total - (ctx.index ?? 0));
      return {opacity: 0.38 + active * 0.62, y: (1 - active) * 7, color: active > 0.5 ? '#bfdbfe' : undefined, textShadow: active > 0.5 ? '0 0 14px rgba(59,130,246,.75)' : undefined};
    }
    case 'Typewriter':
    case 'Char Fade In/Out':
      return {opacity: p * (1 - out)};
    case 'Bounce In':
    case 'Char Bounce In':
    case 'Staggered Bounce':
      return {opacity: p, y: (1 - elastic(p)) * 38 - Math.abs(wave(ctx.frame, 0.18, phase)) * 8, scale: 0.72 + elastic(p) * 0.28};
    case 'Zoom In':
      return {opacity: p, scale: p};
    case 'Glitch Entry':
      return {opacity: p, x: wave(ctx.frame, 1.9) * (1 - p) * 28, skew: wave(ctx.frame, 2.4) * (1 - p) * 10};
    case 'Pop In':
      return {opacity: p, scale: p < 0.65 ? p * 1.85 : 1.2 - (p - 0.65) * 0.57};
    case 'Slide & Stop':
      return {opacity: p, x: (1 - e) * -900};
    case 'Slide In':
      return {opacity: Math.min(1, p * 1.6), x: (1 - p) * -120};
    case 'Whip Pan':
      return {opacity: p, x: (1 - p) * -720, skew: (1 - p) * -24};
    case '3D Flip':
      return {opacity: p, transformExtra: `perspective(900px) rotateX(${(1 - p) * 82}deg) translateZ(${(1 - p) * -180}px)`};
    case 'Elastic Scale':
      return {opacity: p, transformExtra: `scaleX(${0.65 + elastic(p) * 0.35}) scaleY(${0.25 + elastic(p) * 0.75})`};
    case 'Scatter to Gather':
      return {opacity: p, x: (s - 0.5) * 520 * (1 - p), y: (seed((ctx.index ?? 0) + 21) - 0.5) * 320 * (1 - p), rotate: (s - 0.5) * 100 * (1 - p)};
    case 'Tracking Expander':
      return {opacity: p, letterSpacing: -8 + p * 10};
    case 'Random Decode':
      return {opacity: p, y: (1 - p) * 12, text: scrambleText(text, ctx.frame - (ctx.index ?? 0) * 3)};
    case 'Mask Wipe':
      return {opacity: 1, clipPath: `inset(0 ${100 - p * 100}% 0 0)`};
    case 'Kinetic Impact':
      return {opacity: p, scale: 1 + (1 - e) * 3.5, blur: (1 - p) * 8};
    case 'Drop & Bounce':
      return {opacity: p, y: (1 - elastic(p)) * -240 + Math.sin(p * Math.PI * 4) * (1 - p) * 35};
    case 'Blur Reveal':
      return {opacity: p, blur: (1 - p) * 22};
    case 'Shatter Fade':
      return {opacity: 1 - out, x: (s - 0.5) * 180 * out, y: 160 * out, rotate: (s - 0.5) * 160 * out};
    case 'Rotate & Scale':
      return {opacity: p, scale: 3.2 - p * 2.2, rotate: (1 - p) * 720};
    case 'Flash & Fade':
      return {opacity: p * (1 - out * 0.8), filter: `brightness(${1 + Math.max(0, 1 - (ctx.frame - ctx.startFrame) / 10) * 4})`, textShadow: '0 0 28px white'};
    case 'Ghostly Rise':
      return {opacity: p * (1 - out), y: (1 - p) * 60 - out * 30, blur: (1 - p + out) * 12};
    case 'TV Static Reveal':
      return {opacity: p, x: wave(ctx.frame, 1.7, phase) * (1 - p) * 24, filter: `contrast(${1 + (1 - p) * 2})`};
    case 'Matrix Rain':
      return {opacity: p, y: (1 - p) * -260, text: p < 0.9 ? scrambleText(text, ctx.frame) : text};
    case 'Liquid Melt':
      return {opacity: 1 - out, y: out * 90, blur: out * 10, transformExtra: `scaleY(${1 + out * 1.8})`};
    case 'Slash Cut-In':
      return {opacity: p, clipPath: `polygon(${100 - p * 100}% 0, 100% 0, ${p * 100}% 100%, 0 100%)`, skew: (1 - p) * -12};
    case 'Impact Shake & Blur':
      return {opacity: p, x: wave(ctx.frame, 2.4) * (1 - p) * 35, y: wave(ctx.frame, 1.8, 1) * (1 - p) * 20, blur: (1 - p) * 14};
    case 'Pixelate Transition':
      return {opacity: p, blur: (1 - p) * 16, filter: `contrast(${1 + (1 - p) * 4})`};
    case 'Spinning Drop':
    case 'Char Rotate Drop (Top)':
      return {opacity: p, y: (1 - p) * -260, rotate: (1 - p) * 560};
    case 'Char Rotate Drop (Bottom)':
      return {opacity: p, y: (1 - p) * 220, rotate: (1 - p) * -500};
    case 'Char Extreme Zoom In':
      return {opacity: p, scale: 7 - p * 6};
    case 'Char Extreme Zoom In/Out':
      return {opacity: p * (1 - out), scale: 7 - p * 6 + out * 6};
    case 'Char Radial In':
      return {opacity: p, x: Math.cos(phase) * 520 * (1 - p), y: Math.sin(phase) * 360 * (1 - p)};
    case 'Char Radial Out':
      return {opacity: 1 - out, x: Math.cos(phase) * 520 * out, y: Math.sin(phase) * 360 * out};
    case 'Char Radial In/Out':
      return {opacity: p * (1 - out), x: Math.cos(phase) * 520 * ((1 - p) + out), y: Math.sin(phase) * 360 * ((1 - p) + out)};
    case 'Horizontal Slice Merge':
      return {opacity: p, x: (1 - p) * (ctx.frame % 2 === 0 ? -140 : 140)};
    case 'Vertical Slice Merge':
      return {opacity: p, y: (1 - p) * (ctx.frame % 2 === 0 ? -110 : 110)};
    case '3D Circular Pan':
      return {opacity: p, transformExtra: `perspective(900px) rotateY(${(1 - p) * 110 + (ctx.index ?? 0) * 8}deg) translateZ(${(1 - p) * -260}px)`};
    case '3D Depth Flyby':
      return {opacity: p * (1 - out), transformExtra: `perspective(900px) translateZ(${-700 + p * 700 + out * 700}px) scale(${1 + out * 2})`};
    case '3D Spiral Drop':
      return {opacity: p, x: Math.cos(phase + p * 8) * (1 - p) * 120, y: (1 - p) * -260, rotate: (1 - p) * 720 + (ctx.index ?? 0) * 12};
    case '3D Char Flip Board':
      return {opacity: p, transformExtra: `perspective(800px) rotateX(${(1 - p) * 180}deg)`};
    default:
      return {opacity: p};
  }
};

export const getDisplayEffectAnimation = (
  effect: string,
  ctx: EffectAnimationContext,
  textColor: string
): EffectAnimationResult => {
  const p = progress(ctx);
  const phase = seed(ctx.index) * Math.PI * 2;
  const intensity = ctx.intensity || 5;

  switch (effect) {
    case 'None':
      return {};
    case 'Shake':
      return {x: ((ctx.frame % 2) ? 1 : -1) * intensity, y: ((ctx.frame % 3) - 1) * intensity};
    case 'Slide':
      return {x: (1 - Math.sin(p * Math.PI)) * -intensity * 8};
    case 'Pop':
    case 'Zoom':
      return {scale: 1 + Math.sin(p * Math.PI) * intensity * 0.06};
    case 'Bounce':
      return {y: Math.sin((ctx.frame - ctx.startFrame) * 0.35) * intensity * 3};
    case 'Blur':
      return {blur: Math.max(0, (1 - p) * intensity)};
    case 'Glitch':
      return {skew: ((ctx.frame % 3) - 1) * intensity * 1.5, textShadow: '4px 0 #06b6d4, -4px 0 #ef4444'};
    case 'Neon':
    case 'Glow':
      return {textShadow: `0 0 ${8 + intensity * 3}px ${textColor}`};
    case 'Wiggle':
      return {y: wave(ctx.frame, 0.12, phase) * 7, rotate: wave(ctx.frame, 0.09, phase) * 2.8};
    case 'Floating':
      return {y: wave(ctx.frame, 0.045) * 18};
    case 'Vibration':
      return {x: wave(ctx.frame, 2.7) * 4, y: wave(ctx.frame, 3.1, 1) * 3};
    case 'Slow Zoom':
    case 'Solemn Scale':
      return {scale: 1 + wave(ctx.frame, 0.012) * 0.035};
    case 'Neon Flicker':
      return {opacity: ctx.frame % 13 < 2 ? 0.55 : 1, textShadow: `0 0 10px ${textColor}, 0 0 24px ${textColor}, 0 0 42px ${textColor}`};
    case 'Echo / Trail':
      return {textShadow: '-10px 0 rgba(255,255,255,.28), -20px 0 rgba(255,255,255,.16), -30px 0 rgba(255,255,255,.08)'};
    case 'Color Cycle':
      return {color: `hsl(${(ctx.frame * 4) % 360}, 90%, 62%)`};
    case 'Chromatic Aberration':
      return {textShadow: `${wave(ctx.frame, 0.16) * 5}px 0 #ff3355, ${wave(ctx.frame, 0.13, 2) * -5}px 0 #33ccff`};
    case 'Cinematic Pan':
      return {x: wave(ctx.frame, 0.01) * 90};
    case 'Text Scramble Loop':
      return {opacity: ctx.frame % 40 < 8 ? 0.72 : 1};
    case 'Circular Spin':
      return {rotate: ctx.frame * 0.28};
    case 'Multi-Reflection':
      return {textShadow: '18px 0 rgba(255,255,255,.22), -18px 0 rgba(255,255,255,.22), 0 18px rgba(255,255,255,.14), 0 -18px rgba(255,255,255,.14)'};
    case 'Heartbeat Pulse': {
      const beat = ctx.frame % 22;
      const pulse = beat < 5 ? 1 + (5 - beat) * 0.045 : 1;
      return {scale: pulse, textShadow: beat < 5 ? `0 0 26px ${textColor}` : undefined};
    }
    case 'Shadow Drift':
      return {textShadow: `${10 + wave(ctx.frame, 0.05) * 10}px 8px rgba(0,0,0,.45)`};
    case '3D Text Tunnel':
      return {letterSpacing: 4 + wave(ctx.frame, 0.015) * 2, transformExtra: `perspective(900px) translateZ(${wave(ctx.frame, 0.018) * 140}px)`};
    default:
      return {};
  }
};

export const mergeAnimation = (
  base: EffectAnimationResult,
  addition: EffectAnimationResult
): EffectAnimationResult => ({
  ...base,
  ...addition,
  x: (base.x ?? 0) + (addition.x ?? 0),
  y: (base.y ?? 0) + (addition.y ?? 0),
  scale: (base.scale ?? 1) * (addition.scale ?? 1),
  rotate: (base.rotate ?? 0) + (addition.rotate ?? 0),
  skew: (base.skew ?? 0) + (addition.skew ?? 0),
  opacity:
    base.opacity === undefined
      ? addition.opacity
      : addition.opacity === undefined
        ? base.opacity
        : base.opacity * addition.opacity,
  blur: (base.blur ?? 0) + (addition.blur ?? 0),
  letterSpacing: addition.letterSpacing ?? base.letterSpacing,
  textShadow: [base.textShadow, addition.textShadow].filter(Boolean).join(', ') || undefined,
  filter: [base.filter, addition.filter].filter(Boolean).join(' ') || undefined,
  transformExtra: [base.transformExtra, addition.transformExtra].filter(Boolean).join(' ') || undefined,
});

export const buildAnimatedStyle = (
  animation: EffectAnimationResult,
  baseTransform: string,
  baseShadow: string,
  baseColor: string
): CSSProperties => {
  const transform = [
    baseTransform,
    `translate(${animation.x ?? 0}px, ${animation.y ?? 0}px)`,
    `scale(${animation.scale ?? 1})`,
    `rotate(${animation.rotate ?? 0}deg)`,
    `skewX(${animation.skew ?? 0}deg)`,
    animation.transformExtra,
  ]
    .filter(Boolean)
    .join(' ');

  const filters = [
    animation.blur ? `blur(${animation.blur}px)` : undefined,
    animation.filter,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    transform,
    opacity: animation.opacity,
    color: animation.color ?? baseColor,
    filter: filters || undefined,
    clipPath: animation.clipPath,
    letterSpacing: animation.letterSpacing === undefined ? undefined : `${animation.letterSpacing}px`,
    textShadow: [baseShadow, animation.textShadow].filter(Boolean).join(', '),
  };
};
