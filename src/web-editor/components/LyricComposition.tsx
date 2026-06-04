import React from 'react';
import {useCurrentFrame} from 'remotion';
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
}

const isCharacterTextEffect = (effect: string) =>
  TEXT_EFFECT_PRESETS.some((preset) => preset.name === effect && preset.character);

const outlineShadow = (outlineColor: string) => {
  if (!outlineColor || outlineColor === 'transparent') {
    return '0 0 10px rgba(0,0,0,0.5)';
  }
  return [
    '0 0 10px rgba(0,0,0,0.5)',
    `-2px -2px 0 ${outlineColor}`,
    `2px -2px 0 ${outlineColor}`,
    `-2px 2px 0 ${outlineColor}`,
    `2px 2px 0 ${outlineColor}`,
  ].join(', ');
};

const renderText = (text: string, textEffect: string, displayEffect: string, frame: number) => {
  if (textEffect === 'Random Decode' || textEffect === 'Matrix Rain' || displayEffect === 'Text Scramble Loop') {
    return scrambleText(text, frame);
  }
  return text;
};

export const LyricComposition: React.FC<LyricCompositionProps> = ({lyrics, globalSettings}) => {
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
      <ThreeTextEffectsLayer lyrics={lyrics} globalSettings={globalSettings} />
      {activeLyrics.map((lyric) => {
        const fontName = lyric.font || globalSettings.font || 'Outfit';
        const textColor = lyric.textColor || globalSettings.textColor || '#ffffff';
        const outlineColor = globalSettings.outlineColor || 'transparent';
        const displayActive =
          lyric.effect &&
          lyric.effect !== 'None' &&
          frame >= lyric.effectStartFrame &&
          frame < lyric.effectEndFrame;

        const baseTransform = `translate(${lyric.x}px, ${lyric.y}px) scale(${lyric.scale})`;
        const baseShadow = outlineShadow(outlineColor);
        const commonContext = {
          frame,
          startFrame: lyric.startFrame,
          endFrame: lyric.endFrame,
          speed: lyric.effectSpeed,
          intensity: lyric.effectIntensity,
        };

        const displayAnimation = displayActive
          ? getDisplayEffectAnimation(lyric.effect, {
              ...commonContext,
              startFrame: lyric.effectStartFrame,
              endFrame: lyric.effectEndFrame,
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
              }}
            >
              {chars.map((char, index) => {
                const charContext = {...commonContext, index, total: chars.length};
                const charAnimation = mergeAnimation(
                  getTextEffectAnimation(lyric.textEffect, charContext, char),
                  displayActive
                    ? getDisplayEffectAnimation(lyric.effect, {
                        ...charContext,
                        startFrame: lyric.effectStartFrame,
                        endFrame: lyric.effectEndFrame,
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
