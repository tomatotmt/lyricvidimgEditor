import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {THREE_TEXT_EFFECT_OPTIONS} from '../effects';
import {GlobalSettings, LyricBlock} from '../types';

type ThreeTextEffectName = (typeof THREE_TEXT_EFFECT_OPTIONS)[number];

type Vec3 = [number, number, number];

type LetterState = {
  position: Vec3;
  rotation: Vec3;
  scale: number;
  opacity: number;
  color?: string;
};

type CameraState = {
  position: Vec3;
  rotation: Vec3;
  fov: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const seeded = (key: string, index: number) => mulberry32(hashString(`${key}:${index}`));
const splitText = (text: string) => [...text].filter((char) => char !== '\n');

const needsDenseFlythrough = (name: ThreeTextEffectName) =>
  name === 'Glyph Corridor Rush' ||
  name === 'Kanji Gate Dash' ||
  name === 'Chromatic Speed Tunnel';

const createTextTexture = (
  text: string,
  fontFamily: string,
  textColor: string,
  outlineColor: string,
  backgroundColor: string,
  outlineWidth: number
) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const fontSize = 128;
  const padding = 38;
  context.font = `900 ${fontSize}px "${fontFamily}", "Noto Sans JP", sans-serif`;
  const metrics = context.measureText(text || ' ');
  canvas.width = Math.max(96, Math.ceil(metrics.width + padding * 2));
  canvas.height = fontSize + padding * 2;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = `900 ${fontSize}px "${fontFamily}", "Noto Sans JP", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== '#00000000') {
    context.fillStyle = backgroundColor;
    context.beginPath();
    context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 24);
    context.fill();
  }
  context.shadowColor = 'rgba(0,0,0,.55)';
  context.shadowBlur = 18;
  if (outlineColor && outlineColor !== 'transparent' && outlineWidth > 0) {
    context.strokeStyle = outlineColor;
    context.lineWidth = Math.max(1, outlineWidth) * 6;
    context.strokeText(text || ' ', canvas.width / 2, canvas.height / 2);
  }
  context.fillStyle = textColor;
  context.fillText(text || ' ', canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

const TextPlane: React.FC<{
  text: string;
  fontFamily: string;
  textColor: string;
  outlineColor: string;
  backgroundColor: string;
  outlineWidth: number;
  state: LetterState;
}> = ({text, fontFamily, textColor, outlineColor, backgroundColor, outlineWidth, state}) => {
  const texture = useMemo(
    () => createTextTexture(text, fontFamily, state.color || textColor, outlineColor, backgroundColor, outlineWidth),
    [backgroundColor, fontFamily, outlineColor, outlineWidth, state.color, text, textColor]
  );
  const image = texture.image as HTMLCanvasElement | undefined;
  const aspect = image?.width && image?.height ? image.width / image.height : 1;

  return (
    <mesh position={state.position} rotation={state.rotation} scale={[aspect * state.scale, state.scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={state.opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress;

const getFrameSettings = (lyric: LyricBlock, frame: number) => {
  const base = {
    x: lyric.x,
    y: lyric.y,
    scale: lyric.scale,
    rotation: lyric.rotation ?? 0,
    textColor: lyric.textColor,
    textBackgroundColor: lyric.textBackgroundColor,
    outlineColor: lyric.outlineColor,
    outlineWidth: lyric.outlineWidth,
    effectIntensity: lyric.effectIntensity,
    effectStartFrame: lyric.effectStartFrame,
    effectEndFrame: lyric.effectEndFrame,
    effectSwitchFrame: lyric.effectSwitchFrame ?? Math.round((lyric.effectStartFrame + lyric.effectEndFrame) / 2),
    fadeInFrames: lyric.fadeInFrames ?? 0,
    fadeOutFrames: lyric.fadeOutFrames ?? 0,
    effectSpeed: lyric.effectSpeed,
  };
  const keyframes = [...(lyric.keyframes ?? [])].sort((a, b) => a.frame - b.frame);
  if (keyframes.length === 0) {
    return base;
  }

  const settings = {...base};
  const legacy = keyframes.filter((keyframe) => !keyframe.property);
  if (legacy.length > 0) {
    const first = legacy[0];
    const last = legacy[legacy.length - 1];
    const nextIndex = legacy.findIndex((keyframe) => keyframe.frame >= frame);
    const prev = frame <= first.frame ? first : frame >= last.frame ? last : legacy[Math.max(0, nextIndex - 1)];
    const next = frame <= first.frame ? first : frame >= last.frame ? last : legacy[nextIndex];
    const p = next.frame === prev.frame ? 0 : (frame - prev.frame) / Math.max(1, next.frame - prev.frame);
    settings.x = interpolate(prev.x ?? settings.x, next.x ?? settings.x, p);
    settings.y = interpolate(prev.y ?? settings.y, next.y ?? settings.y, p);
    settings.scale = interpolate(prev.scale ?? settings.scale, next.scale ?? settings.scale, p);
    settings.rotation = interpolate(prev.rotation ?? settings.rotation, next.rotation ?? settings.rotation, p);
    settings.outlineWidth = interpolate(prev.outlineWidth ?? settings.outlineWidth ?? 2, next.outlineWidth ?? settings.outlineWidth ?? 2, p);
    settings.textColor = prev.textColor ?? settings.textColor;
    settings.textBackgroundColor = prev.textBackgroundColor ?? settings.textBackgroundColor;
    settings.outlineColor = prev.outlineColor ?? settings.outlineColor;
  }

  const numericProperties = new Set(['x', 'y', 'scale', 'rotation', 'outlineWidth', 'effectIntensity', 'effectStartFrame', 'effectEndFrame', 'effectSwitchFrame', 'fadeInFrames', 'fadeOutFrames', 'effectSpeed']);
  const propertyFrames = keyframes.filter((keyframe) => keyframe.property);
  for (const property of new Set(propertyFrames.map((keyframe) => keyframe.property))) {
    if (!property) continue;
    const frames = propertyFrames.filter((keyframe) => keyframe.property === property).sort((a, b) => a.frame - b.frame);
    const first = frames[0];
    const last = frames[frames.length - 1];
    const nextIndex = frames.findIndex((keyframe) => keyframe.frame >= frame);
    const prev = frame <= first.frame ? first : frame >= last.frame ? last : frames[Math.max(0, nextIndex - 1)];
    const next = frame <= first.frame ? first : frame >= last.frame ? last : frames[nextIndex];
    if (numericProperties.has(property)) {
      const from = Number(prev.value ?? settings[property]);
      const to = Number(next.value ?? settings[property]);
      const p = next.frame === prev.frame ? 0 : (frame - prev.frame) / Math.max(1, next.frame - prev.frame);
      settings[property] = interpolate(from, to, p) as never;
    } else {
      settings[property] = String(prev.value ?? settings[property]) as never;
    }
  }
  return settings;
};

const getBasePosition = (lyric: LyricBlock, frame: number): Vec3 => {
  const settings = getFrameSettings(lyric, frame);
  return [settings.x / 130, -settings.y / 130, 0];
};

const applyBaseTransform = (position: Vec3, base: Vec3, rotationDeg = 0): Vec3 => {
  const radians = rotationDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const x = position[0] * cos - position[1] * sin;
  const y = position[0] * sin + position[1] * cos;
  return [base[0] + x, base[1] + y, position[2] + base[2]];
};

const addZRotation = (rotation: Vec3, rotationDeg = 0): Vec3 => [
  rotation[0],
  rotation[1],
  rotation[2] + rotationDeg * Math.PI / 180,
];

const flythroughScale = (progressValue: number) =>
  Math.max(0.45, 1.8 - progressValue * 1.6);

const getProgress = (frame: number, lyric: LyricBlock) =>
  clamp((frame - lyric.startFrame) / Math.max(1, lyric.endFrame - lyric.startFrame));

const getLetterProgress = (frame: number, lyric: LyricBlock, index: number) => {
  const speedFrames = Math.max(4, 16 - lyric.effectSpeed);
  return clamp((frame - lyric.startFrame - index * speedFrames) / Math.max(10, lyric.effectSpeed * 5));
};

const presetColor = (base: string, name: string, frame: number, index: number) => {
  if (name.includes('Neon') || name.includes('Vocaloid')) {
    return `hsl(${(frame * 5 + index * 38) % 360}, 92%, 66%)`;
  }
  if (name.includes('Glitch') || name.includes('Broken')) {
    return index % 3 === 0 ? '#67e8f9' : index % 3 === 1 ? '#fb7185' : base;
  }
  return base;
};

const getFadeOpacity = (lyric: LyricBlock, globalSettings: GlobalSettings, frame: number) => {
  const fadeInPattern = lyric.fadeInPattern ?? globalSettings.fadeInPattern ?? 'None';
  const fadeOutPattern = lyric.fadeOutPattern ?? globalSettings.fadeOutPattern ?? 'None';
  const fadeInFrames = Math.max(0, Math.round(lyric.fadeInFrames ?? globalSettings.fadeInFrames ?? 0));
  const fadeOutFrames = Math.max(0, Math.round(lyric.fadeOutFrames ?? globalSettings.fadeOutFrames ?? 0));
  let opacity = 1;

  if (fadeInPattern !== 'None' && fadeInFrames > 0) {
    opacity = Math.min(opacity, clamp((frame - lyric.startFrame) / fadeInFrames));
  }
  if (fadeOutPattern !== 'None' && fadeOutFrames > 0) {
    opacity = Math.min(opacity, clamp((lyric.endFrame - frame - 1) / fadeOutFrames));
  }
  return opacity;
};

const cameraForPreset = (name: ThreeTextEffectName, frame: number, lyric: LyricBlock): CameraState => {
  const p = getProgress(frame, lyric);
  const t = frame - lyric.startFrame;
  const wobble = Math.sin(t * 0.08);
  const base: CameraState = {position: [0, 0, 8], rotation: [0, 0, 0], fov: 48};

  switch (name) {
    case 'FPS Letter Rush':
      return {position: [Math.sin(p * Math.PI * 4) * 1.4, Math.cos(p * Math.PI * 3) * 0.8, 14 - p * 18], rotation: [wobble * 0.05, Math.sin(t * 0.05) * 0.08, 0], fov: 58};
    case 'Text Tunnel Dive':
    case 'Data Glitch Corridor':
    case 'Lyrics Roller Coaster':
      return {position: [Math.sin(p * Math.PI * 3) * 2.4, Math.cos(p * Math.PI * 2) * 1.2, 14 - p * 24], rotation: [Math.sin(t * 0.04) * 0.18, Math.sin(t * 0.03) * 0.2, Math.sin(t * 0.02) * 0.08], fov: 62};
    case 'Glyph Corridor Rush':
    case 'Kanji Gate Dash':
    case 'Chromatic Speed Tunnel':
      return {position: [0, 0, 8], rotation: [0, 0, 0], fov: name === 'Kanji Gate Dash' ? 68 : 76};
    case 'Camera Whip Words':
      return {position: [(1 - easeOut(p)) * -8 + Math.sin(t * 0.22) * 0.5, 0, 8], rotation: [0, (1 - easeOut(p)) * 0.9, Math.sin(t * 0.16) * 0.08], fov: 54};
    case 'Orbit Camera Snap':
      return {position: [Math.sin(p * Math.PI * 2) * 7, 1.2, Math.cos(p * Math.PI * 2) * 7], rotation: [0, p * Math.PI * 2, 0], fov: 46};
    case 'Deep Focus Swap':
      return {position: [0, 0, 12 - easeInOut(p) * 8], rotation: [0, 0, 0], fov: 38 + Math.sin(p * Math.PI) * 18};
    case 'Massive Word Eclipse':
      return {position: [0, 0, 12], rotation: [0, 0, 0], fov: 42};
    default:
      return base;
  }
};

const letterStateForPreset = (
  name: ThreeTextEffectName,
  lyric: LyricBlock,
  frame: number,
  index: number,
  total: number,
  textColor: string
): LetterState => {
  const key = `${lyric.id}:${lyric.text}:${name}`;
  const rng = seeded(key, index);
  const p = getProgress(frame, lyric);
  const lp = getLetterProgress(frame, lyric, index);
  const e = easeOut(lp);
  const frameSettings = getFrameSettings(lyric, frame);
  const base = getBasePosition(lyric, frame);
  const angle = (index / Math.max(1, total)) * Math.PI * 2;
  const centerOffset = (index - (total - 1) / 2) * 0.72 * frameSettings.scale;
  const flicker = name.includes('Glitch') || name.includes('Broken') ? (frame + index) % 9 < 2 ? 0.55 : 1 : 1;
  const state: LetterState = {
    position: [base[0] + centerOffset, base[1], base[2]],
    rotation: [0, 0, 0],
    scale: frameSettings.scale,
    opacity: lp * flicker,
    color: presetColor(textColor, name, frame, index),
  };

  switch (name) {
    case 'Orbit Giant Letters':
      return {
        ...state,
        position: [base[0] + Math.cos(angle + p * Math.PI * 2) * 4.8, base[1] + Math.sin(angle * 1.7) * 1.2, Math.sin(angle + p * Math.PI * 2) * 4.8],
        rotation: [0, -angle - p * Math.PI * 2, (1 - e) * Math.PI * 2],
        scale: frameSettings.scale * (1.45 + Math.sin(angle + p * Math.PI * 2) * 0.18),
      };
    case 'FPS Letter Rush': {
      const x = (rng() - 0.5) * 9;
      const y = (rng() - 0.5) * 5;
      const z = -index * 3.2 + p * total * 3.2 - 5;
      return {...state, position: [x, y, z], rotation: [(rng() - 0.5) * 1.4 * (1 - e), (rng() - 0.5) * 1.6 * (1 - e), 0], scale: frameSettings.scale * (0.85 + e * 0.35), opacity: clamp(1 - Math.abs(z) / 15) * flicker};
    }
    case 'Text Tunnel Dive':
    case 'Data Glitch Corridor': {
      const ring = index % 10;
      const depth = -Math.floor(index / 10) * 4 - ring * 0.2 + p * 32;
      return {...state, position: [Math.cos(angle) * 4.4, Math.sin(angle) * 2.5, depth], rotation: [0, 0, angle + Math.PI / 2], scale: frameSettings.scale * 0.8, opacity: clamp(1 - Math.abs(depth) / 20) * flicker};
    }
    case 'Glyph Corridor Rush': {
      const lane = index % 4;
      const row = Math.floor(index / 4);
      const side = lane < 2 ? -1 : 1;
      const y = lane % 2 === 0 ? -2.05 : 1.85;
      const z = -row * 4.2 + p * 58;
      const speedGlow = 0.45 + clamp(Math.sin(p * Math.PI) + 0.2, 0, 1) * 0.55;
      const localPosition: Vec3 = [side * (4.8 + Math.sin(row * 0.9) * 0.34), y + Math.sin(frame * 0.08 + row) * 0.08, z];
      const localRotation: Vec3 = [0, side > 0 ? -Math.PI / 2.8 : Math.PI / 2.8, side * 0.08];
      return {
        ...state,
        position: applyBaseTransform(localPosition, base, frameSettings.rotation),
        rotation: addZRotation(localRotation, frameSettings.rotation),
        scale: frameSettings.scale * flythroughScale(p) * (0.96 + (lane % 2) * 0.12),
        opacity: clamp(1 - Math.abs(z - 8) / 24) * speedGlow * flicker,
        color: index % 3 === 0 ? '#67e8f9' : textColor,
      };
    }
    case 'Kanji Gate Dash': {
      const gate = Math.floor(index / 3);
      const part = index % 3;
      const z = -gate * 5.2 + p * 60;
      const gatePulse = 1 + Math.sin(frame * 0.16 + gate) * 0.08;
      const positions: Vec3[] = [
        [-4.55, 0, z],
        [4.55, 0, z],
        [0, 3.15, z],
      ];
      const rotations: Vec3[] = [
        [0, Math.PI / 2.9, 0.08],
        [0, -Math.PI / 2.9, -0.08],
        [-0.35, 0, 0],
      ];
      return {
        ...state,
        position: applyBaseTransform(positions[part], base, frameSettings.rotation),
        rotation: addZRotation(rotations[part], frameSettings.rotation),
        scale: frameSettings.scale * flythroughScale(p) * (part === 2 ? 0.92 : 1.08) * gatePulse,
        opacity: clamp(1 - Math.abs(z - 8) / 27) * flicker,
        color: gate % 2 === 0 ? textColor : '#f8fafc',
      };
    }
    case 'Chromatic Speed Tunnel': {
      const ring = index % 12;
      const depthLayer = Math.floor(index / 12);
      const radius = 3.35 + Math.sin(depthLayer * 1.3) * 0.42;
      const spin = angle + p * Math.PI * 8 + depthLayer * 0.25;
      const z = -2 - depthLayer * 4.0 - ring * 0.08 + p * 56;
      const channel = index % 3;
      const color = channel === 0 ? '#fb7185' : channel === 1 ? '#67e8f9' : textColor;
      const offset = channel === 0 ? -0.16 : channel === 1 ? 0.16 : 0;
      return {
        ...state,
        position: applyBaseTransform([Math.cos(spin) * (radius + offset), Math.sin(spin) * (radius * 0.58 + offset * 0.5), z], base, frameSettings.rotation),
        rotation: addZRotation([0.12, 0, spin + Math.PI / 2], frameSettings.rotation),
        scale: frameSettings.scale * flythroughScale(p) * 0.92,
        opacity: clamp(1 - Math.abs(z - 8) / 23) * (0.75 + Math.sin(frame * 0.55 + index) * 0.2),
        color,
      };
    }
    case 'Spiral Word Galaxy':
      return {...state, position: [base[0] + Math.cos(angle * 2 + p * 5) * (1.2 + index * 0.18), base[1] + (index - total / 2) * 0.1, Math.sin(angle * 2 + p * 5) * (1.2 + index * 0.18)], rotation: [0.2, angle + p * 4, 0], scale: frameSettings.scale * 0.9};
    case 'Impact Billboard 3D':
      return {...state, position: [base[0] + centerOffset, base[1] + Math.sin(index) * 0.1, -8 + e * 8], rotation: [(1 - e) * -0.6, (1 - e) * (rng() - 0.5), 0], scale: frameSettings.scale * (4 - e * 3), opacity: lp};
    case 'Vocaloid Grid City':
      return {...state, position: [(index % 6 - 2.5) * 1.5, -2 + Math.floor(index / 6) * 0.85, -8 + p * 12 + (rng() - 0.5) * 2], rotation: [-0.08, Math.sin(index) * 0.3, 0], scale: frameSettings.scale * 0.72, opacity: clamp(lp * 1.4)};
    case 'Rotating Lyrics Ring':
      return {...state, position: [Math.cos(angle + p * 4) * 3.2, base[1], Math.sin(angle + p * 4) * 3.2], rotation: [0, -angle - p * 4, 0], scale: frameSettings.scale};
    case 'Character Cannon':
      return {...state, position: [base[0] + centerOffset, base[1], -16 + e * 16], rotation: [(1 - e) * 3, (1 - e) * 4, 0], scale: frameSettings.scale * (0.3 + e * 0.9)};
    case 'Scatter To Camera':
    case 'Floating Caption Field': {
      const sx = (rng() - 0.5) * 10;
      const sy = (rng() - 0.5) * 6;
      const sz = (rng() - 0.5) * 12 - 2;
      return {...state, position: [sx + (base[0] + centerOffset - sx) * e, sy + (base[1] - sy) * e, sz * (1 - e)], rotation: [(rng() - 0.5) * (1 - e) * 3, (rng() - 0.5) * (1 - e) * 3, 0], scale: frameSettings.scale * (0.75 + e * 0.25)};
    }
    case 'Camera Whip Words':
      return {...state, position: [base[0] + centerOffset + (1 - e) * 9, base[1], 0], rotation: [0, (1 - e) * -1.2, (1 - e) * 0.25], scale: frameSettings.scale};
    case 'Deep Focus Swap':
      return {...state, position: [base[0] + centerOffset, base[1], (index - total / 2) * -0.8 + (1 - e) * -4], scale: frameSettings.scale * (0.9 + e * 0.2), opacity: lp};
    case 'Falling Text Abyss':
      return {...state, position: [base[0] + centerOffset, base[1] + (1 - e) * 6 - p * 2, -index * 0.45], rotation: [(1 - e) * -1.3, 0, (rng() - 0.5) * 0.5], scale: frameSettings.scale};
    case 'Exploded Word Rebuild': {
      const sx = (rng() - 0.5) * 12;
      const sy = (rng() - 0.5) * 8;
      const sz = (rng() - 0.5) * 10;
      return {...state, position: [base[0] + centerOffset + sx * (1 - e), base[1] + sy * (1 - e), sz * (1 - e)], rotation: [(1 - e) * sx, (1 - e) * sy, (1 - e) * sz], scale: frameSettings.scale};
    }
    case 'Vortex Karaoke':
      return {...state, position: [base[0] + centerOffset + Math.cos(angle + p * 12) * (1 - e) * 5, base[1] + Math.sin(angle + p * 12) * (1 - e) * 3, (1 - e) * -8], rotation: [0, 0, angle + p * 8], scale: frameSettings.scale};
    case 'Orbit Camera Snap':
      return {...state, position: [base[0] + centerOffset, base[1], Math.sin(index) * 0.8], rotation: [0, Math.sin(p * Math.PI * 2) * 0.4, 0], scale: frameSettings.scale};
    case 'Perspective Typewriter 3D':
      return {...state, position: [base[0] + centerOffset, base[1], (1 - e) * -5], rotation: [(1 - e) * Math.PI, 0, 0], scale: frameSettings.scale, opacity: lp};
    case 'Neon Depth Chase':
      return {...state, position: [base[0] + centerOffset, base[1], -10 + e * 10 + Math.sin(frame * 0.08 + index) * 0.8], rotation: [0, 0, 0], scale: frameSettings.scale * (0.9 + e * 0.18)};
    case 'Broken Subtitle Space':
      return {...state, position: [base[0] + centerOffset + (rng() - 0.5) * (1 - e) * 2 + Math.sin(frame + index) * 0.04, base[1] + (rng() - 0.5) * (1 - e), (rng() - 0.5) * 2], rotation: [0, (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.18], scale: frameSettings.scale};
    case 'Lyrics Roller Coaster':
      return {...state, position: [Math.sin(index * 0.8) * 3, Math.cos(index * 0.55) * 1.8, -index * 2.4 + p * total * 2.4], rotation: [Math.sin(index) * 0.35, Math.cos(index) * 0.4, 0], scale: frameSettings.scale * 0.85, opacity: clamp(lp * 1.6)};
    case 'Massive Word Eclipse':
      return {...state, position: [base[0] + centerOffset + (1 - p) * -10 + p * 6, base[1], -2], rotation: [0, 0.15, 0], scale: frameSettings.scale * 2.2, opacity: clamp(lp * 1.2)};
    default:
      return state;
  }
};

const ThreeLyric: React.FC<{
  lyric: LyricBlock;
  globalSettings: GlobalSettings;
  frame: number;
}> = ({lyric, globalSettings, frame}) => {
  const effectName = lyric.textEffect as ThreeTextEffectName;
  const sourceChars = splitText(lyric.text);
  const baseChars = sourceChars.length > 0 ? sourceChars : [' '];
  const chars = needsDenseFlythrough(effectName)
    ? Array.from({length: Math.max(baseChars.length, 36)}, (_, index) => baseChars[index % baseChars.length])
    : baseChars;
  const fontFamily = lyric.font || globalSettings.font || 'Noto Sans JP';
  const frameSettings = getFrameSettings(lyric, frame);
  const textColor = frameSettings.textColor || globalSettings.textColor || '#ffffff';
  const outlineColor = frameSettings.outlineColor || globalSettings.outlineColor || 'transparent';
  const backgroundColor = frameSettings.textBackgroundColor || globalSettings.textBackgroundColor || 'transparent';
  const outlineWidth = frameSettings.outlineWidth ?? globalSettings.outlineWidth ?? 2;
  const fadeOpacity = getFadeOpacity(lyric, globalSettings, frame);

  return (
    <>
      <group>
        {chars.map((char, index) => {
          const state = letterStateForPreset(effectName, lyric, frame, index, chars.length, textColor);
          return (
            <TextPlane
              key={`${lyric.id}-${index}-${char}`}
              text={char.trim() ? char : ' '}
              fontFamily={fontFamily}
              textColor={textColor}
              outlineColor={outlineColor}
              backgroundColor={backgroundColor}
              outlineWidth={outlineWidth}
              state={{...state, opacity: state.opacity * fadeOpacity}}
            />
          );
        })}
      </group>
    </>
  );
};

export const isThreeTextEffect = (effect: string) =>
  THREE_TEXT_EFFECT_OPTIONS.includes(effect as ThreeTextEffectName);

export const ThreeTextEffectsLayer: React.FC<{
  lyrics: LyricBlock[];
  globalSettings: GlobalSettings;
}> = ({lyrics, globalSettings}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const activeThreeLyrics = lyrics.filter(
    (lyric) => frame >= lyric.startFrame && frame < lyric.endFrame && isThreeTextEffect(lyric.textEffect)
  );

  if (activeThreeLyrics.length === 0) {
    return null;
  }
  const leadLyric = activeThreeLyrics[activeThreeLyrics.length - 1];
  const leadCamera = cameraForPreset(leadLyric.textEffect as ThreeTextEffectName, frame, leadLyric);

  return (
    <ThreeCanvas
      width={width}
      height={height}
      style={{position: 'absolute', inset: 0}}
      camera={{position: leadCamera.position, rotation: leadCamera.rotation, fov: leadCamera.fov, near: 0.1, far: 1000}}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 5, 8]} intensity={0.65} />
      {activeThreeLyrics.map((lyric) => (
        <ThreeLyric key={lyric.id} lyric={lyric} globalSettings={globalSettings} frame={frame} />
      ))}
    </ThreeCanvas>
  );
};
