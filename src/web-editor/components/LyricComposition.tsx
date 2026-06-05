import React from 'react';
import {Audio, useCurrentFrame} from 'remotion';
import {GlobalSettings, LyricBlock} from '../types';
import {
  TEXT_EFFECT_PRESETS,
  buildAnimatedStyle,
  getDisplayEffectAnimation,
  getTextEffectAnimation,
  mergeAnimation,
  scrambleText,
} from '../effects';
import {ThreeTextEffectsLayer, isThreeTextEffect} from './ThreeTextEffects';

interface LyricCompositionProps {
  lyrics: LyricBlock[];
  globalSettings: GlobalSettings;
  audioUrl?: string;
}

const isCharacterTextEffect = (effect: string) =>
  TEXT_EFFECT_PRESETS.some((preset) => preset.name === effect && preset.character);

const outlineShadow = (outlineColor: string, outlineWidth: number) => {
  if (!outlineColor || outlineColor === 'transparent' || outlineWidth <= 0) {
    return '0 0 10px rgba(0,0,0,0.5)';
  }
  const width = Math.max(1, Math.round(outlineWidth));
  return [
    '0 0 10px rgba(0,0,0,0.5)',
    `${-width}px ${-width}px 0 ${outlineColor}`,
    `${width}px ${-width}px 0 ${outlineColor}`,
    `${-width}px ${width}px 0 ${outlineColor}`,
    `${width}px ${width}px 0 ${outlineColor}`,
  ].join(', ');
};

const isVisibleColor = (color: string | undefined) =>
  Boolean(color && color !== 'transparent' && color !== 'rgba(0,0,0,0)' && color !== '#00000000');

const textBackgroundStyle = (color: string | undefined): React.CSSProperties =>
  isVisibleColor(color)
    ? {
        backgroundColor: color,
        borderRadius: 12,
        padding: '0.08em 0.22em',
        boxDecorationBreak: 'clone',
      }
    : {};

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

  const numericProperties = new Set(['x', 'y', 'scale', 'rotation', 'outlineWidth', 'effectIntensity', 'effectStartFrame', 'effectEndFrame', 'effectSpeed']);
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
  };
  return settings;
};

const renderText = (text: string, textEffect: string, displayEffect: string, frame: number) => {
  if (textEffect === 'Random Decode' || textEffect === 'Matrix Rain' || displayEffect === 'Text Scramble Loop') {
    return scrambleText(text, frame);
  }
  return text;
};

export const LyricComposition: React.FC<LyricCompositionProps> = ({lyrics, globalSettings, audioUrl}) => {
  const frame = useCurrentFrame();
  const activeLyrics = lyrics.filter(
    (lyric) => frame >= lyric.startFrame && frame < lyric.endFrame && !isThreeTextEffect(lyric.textEffect)
  );

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: globalSettings.backgroundColor || 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {audioUrl ? <Audio src={audioUrl} startFrom={0} /> : null}
      <ThreeTextEffectsLayer lyrics={lyrics} globalSettings={globalSettings} />
      {activeLyrics.map((lyric) => {
        const frameSettings = getFrameSettings(lyric, frame);
        const fontName = lyric.font || globalSettings.font || 'Outfit';
        const textColor = frameSettings.textColor || globalSettings.textColor || '#ffffff';
        const outlineColor = frameSettings.outlineColor || globalSettings.outlineColor || 'transparent';
        const outlineWidth = frameSettings.outlineWidth ?? globalSettings.outlineWidth ?? 2;
        const lyricBackground = frameSettings.textBackgroundColor || globalSettings.textBackgroundColor || 'transparent';
        const displayActive =
          lyric.effect &&
          lyric.effect !== 'None' &&
          frame >= frameSettings.effectStartFrame &&
          frame < frameSettings.effectEndFrame;

        const baseTransform = `translate(${frameSettings.x}px, ${frameSettings.y}px) rotate(${frameSettings.rotation}deg) scale(${frameSettings.scale})`;
        const baseShadow = outlineShadow(outlineColor, outlineWidth);
        const commonContext = {
          frame,
          startFrame: lyric.startFrame,
          endFrame: lyric.endFrame,
          speed: frameSettings.effectSpeed,
          intensity: frameSettings.effectIntensity,
        };

        const displayAnimation = displayActive
          ? getDisplayEffectAnimation(lyric.effect, {
              ...commonContext,
              startFrame: frameSettings.effectStartFrame,
              endFrame: frameSettings.effectEndFrame,
            }, textColor)
          : {};

        if (isCharacterTextEffect(lyric.textEffect)) {
          const chars = [...lyric.text];
          return (
            <div
              key={lyric.id}
              style={{
                position: 'absolute',
                fontFamily: fontName,
                fontSize: '64px',
                fontWeight: 800,
                textAlign: 'center',
                transform: baseTransform,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                ...textBackgroundStyle(lyricBackground),
              }}
            >
              {chars.map((char, index) => {
                const charContext = {...commonContext, index, total: chars.length};
                const charAnimation = mergeAnimation(
                  getTextEffectAnimation(lyric.textEffect, charContext, char),
                  displayActive
                    ? getDisplayEffectAnimation(lyric.effect, {
                        ...charContext,
                        startFrame: frameSettings.effectStartFrame,
                        endFrame: frameSettings.effectEndFrame,
                      }, textColor)
                    : {}
                );
                const style = buildAnimatedStyle(charAnimation, '', baseShadow, textColor);
                return (
                  <span
                    key={`${lyric.id}-${index}`}
                    style={{
                      display: 'inline-block',
                      transformOrigin: 'center',
                      whiteSpace: 'pre',
                      willChange: 'transform, opacity, filter',
                      ...style,
                    }}
                  >
                    {renderText(charAnimation.text ?? char, lyric.textEffect, lyric.effect, frame - index * 3)}
                  </span>
                );
              })}
            </div>
          );
        }

        const textAnimation = getTextEffectAnimation(lyric.textEffect, commonContext, lyric.text);
        const animation = mergeAnimation(textAnimation, displayAnimation);
        const animatedStyle = buildAnimatedStyle(animation, baseTransform, baseShadow, textColor);

        return (
          <div
            key={lyric.id}
            style={{
              position: 'absolute',
              fontFamily: fontName,
              fontSize: '64px',
              fontWeight: 800,
              textAlign: 'center',
              transformOrigin: 'center',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              willChange: 'transform, opacity, filter',
              ...textBackgroundStyle(lyricBackground),
              ...animatedStyle,
            }}
          >
            {renderText(animation.text ?? lyric.text, lyric.textEffect, lyric.effect, frame)}
          </div>
        );
      })}
    </div>
  );
};
