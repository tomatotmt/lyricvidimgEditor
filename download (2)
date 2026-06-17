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
  };
  return settings;
};

const renderText = (text: string, textEffect: string, displayEffect: string, frame: number) => {
  if (textEffect === 'Random Decode' || textEffect === 'Matrix Rain' || displayEffect === 'Text Scramble Loop') {
    return scrambleText(text, frame);
  }
  return text;
};

const isEnabledEffect = (effect: string | undefined) => Boolean(effect && effect !== 'None');

const clampFrame = (value: number, startFrame: number, endFrame: number) =>
  Math.max(startFrame, Math.min(endFrame, Math.round(value)));

const getFadeOpacity = (
  lyric: LyricBlock,
  globalSettings: GlobalSettings,
  frameSettings: ReturnType<typeof getFrameSettings>,
  frame: number
) => {
  const fadeInPattern = lyric.fadeInPattern ?? globalSettings.fadeInPattern ?? 'None';
  const fadeOutPattern = lyric.fadeOutPattern ?? globalSettings.fadeOutPattern ?? 'None';
  const fadeInFrames = Math.max(0, Math.round(lyric.fadeInFrames ?? globalSettings.fadeInFrames ?? frameSettings.fadeInFrames ?? 0));
  const fadeOutFrames = Math.max(0, Math.round(lyric.fadeOutFrames ?? globalSettings.fadeOutFrames ?? frameSettings.fadeOutFrames ?? 0));
  let opacity = 1;

  if (fadeInPattern !== 'None' && fadeInFrames > 0) {
    opacity = Math.min(opacity, Math.max(0, Math.min(1, (frame - lyric.startFrame) / fadeInFrames)));
  }
  if (fadeOutPattern !== 'None' && fadeOutFrames > 0) {
    opacity = Math.min(opacity, Math.max(0, Math.min(1, (lyric.endFrame - frame - 1) / fadeOutFrames)));
  }
  return opacity;
};

const getActiveDisplayEffect = (
  lyric: LyricBlock,
  globalSettings: GlobalSettings,
  frameSettings: ReturnType<typeof getFrameSettings>,
  frame: number
) => {
  const fadeInFrames = Math.max(0, Math.round(lyric.fadeInFrames ?? globalSettings.fadeInFrames ?? frameSettings.fadeInFrames));
  const fadeOutFrames = Math.max(0, Math.round(lyric.fadeOutFrames ?? globalSettings.fadeOutFrames ?? frameSettings.fadeOutFrames));
  const orderedStartFrame = lyric.startFrame + fadeInFrames;
  const orderedEndFrame = Math.max(orderedStartFrame + 1, lyric.endFrame - fadeOutFrames);
  const startFrame = Math.max(orderedStartFrame, Math.round(frameSettings.effectStartFrame));
  const endFrame = Math.max(startFrame + 1, Math.min(orderedEndFrame, Math.round(frameSettings.effectEndFrame)));
  if (frame < startFrame || frame >= endFrame) {
    return null;
  }

  const inEffect = lyric.inEffect ?? lyric.effect ?? 'None';
  const outEffect = lyric.outEffect ?? 'None';
  const hasIn = isEnabledEffect(inEffect);
  const hasOut = isEnabledEffect(outEffect);
  if (!hasIn && !hasOut) {
    return null;
  }

  const defaultSwitch = Math.round((startFrame + endFrame) / 2);
  const switchFrame = hasIn && hasOut
    ? clampFrame(frameSettings.effectSwitchFrame ?? defaultSwitch, startFrame + 1, endFrame - 1)
    : endFrame;

  if (hasIn && (!hasOut || frame < switchFrame)) {
    return {
      effect: inEffect,
      contextFrame: frame,
      startFrame,
      endFrame: hasOut ? switchFrame : endFrame,
    };
  }

  const outStartFrame = hasIn ? switchFrame : startFrame;
  const outEndFrame = endFrame;
  const outDuration = Math.max(1, outEndFrame - outStartFrame);
  const elapsed = frame - outStartFrame;
  return {
    effect: outEffect,
    contextFrame: outEndFrame - 1 - elapsed,
    startFrame: outStartFrame,
    endFrame: outStartFrame + outDuration,
  };
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
        const activeDisplayEffect = getActiveDisplayEffect(lyric, globalSettings, frameSettings, frame);
        const fadeOpacity = getFadeOpacity(lyric, globalSettings, frameSettings, frame);

        const baseTransform = `translate(${frameSettings.x}px, ${frameSettings.y}px) rotate(${frameSettings.rotation}deg) scale(${frameSettings.scale})`;
        const baseShadow = outlineShadow(outlineColor, outlineWidth);
        const commonContext = {
          frame,
          startFrame: lyric.startFrame,
          endFrame: lyric.endFrame,
          speed: frameSettings.effectSpeed,
          intensity: frameSettings.effectIntensity,
        };

        const displayAnimation = activeDisplayEffect
          ? getDisplayEffectAnimation(activeDisplayEffect.effect, {
              ...commonContext,
              frame: activeDisplayEffect.contextFrame,
              startFrame: activeDisplayEffect.startFrame,
              endFrame: activeDisplayEffect.endFrame,
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
                  activeDisplayEffect
                    ? getDisplayEffectAnimation(activeDisplayEffect.effect, {
                        ...charContext,
                        frame: activeDisplayEffect.contextFrame,
                        startFrame: activeDisplayEffect.startFrame,
                        endFrame: activeDisplayEffect.endFrame,
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
                      opacity: Number(style.opacity ?? 1) * fadeOpacity,
                    }}
                  >
                    {renderText(charAnimation.text ?? char, lyric.textEffect, activeDisplayEffect?.effect ?? 'None', frame - index * 3)}
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
              opacity: Number(animatedStyle.opacity ?? 1) * fadeOpacity,
            }}
          >
            {renderText(animation.text ?? lyric.text, lyric.textEffect, activeDisplayEffect?.effect ?? 'None', frame)}
          </div>
        );
      })}
    </div>
  );
};
