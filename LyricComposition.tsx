import type {CSSProperties} from 'react';

export type EffectKind = 'effect' | 'textEffect';

export type EffectPreset = {
  name: string;
  kind: EffectKind;
  character?: boolean;
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
] as const;

export const EFFECT_PRESETS: EffectPreset[] = EFFECT_OPTIONS.map((name) => ({
  name,
  kind: 'effect',
}));

export const TEXT_EFFECT_PRESETS: EffectPreset[] = TEXT_EFFECT_OPTIONS.map((name) => ({
  name,
  kind: 'textEffect',
  character:
    THREE_TEXT_EFFECT_OPTIONS.includes(name as (typeof THREE_TEXT_EFFECT_OPTIONS)[number]) ||
    name.startsWith('Char ') ||
    [
      'Typewriter',
      'Staggered Bounce',
      'Scatter to Gather',
      'Random Decode',
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

  switch (effect) {
    case 'None':
      return {};
    case 'Fade In':
    case 'Word by Word Fade':
      return {opacity: p * (1 - out), y: (1 - p) * 14};
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
