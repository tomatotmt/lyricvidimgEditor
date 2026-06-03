import React from 'react';
import { useCurrentFrame } from 'remotion';
import { LyricBlock, GlobalSettings } from '../types';

interface LyricCompositionProps {
  lyrics: LyricBlock[];
  globalSettings: GlobalSettings;
}

export const LyricComposition: React.FC<LyricCompositionProps> = ({ lyrics, globalSettings }) => {
  const frame = useCurrentFrame();

  // Filter lyrics active at the current frame
  const activeLyrics = lyrics.filter(l => frame >= l.startFrame && frame < l.endFrame);

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
      {activeLyrics.map((lyric) => {
        // Build style rules for this active lyric
        const fontName = lyric.font || globalSettings.font || 'Outfit';
        const textColor = lyric.textColor || globalSettings.textColor || '#ffffff';
        const outlineColor = globalSettings.outlineColor || 'transparent';

        // Check if an effect is active for the current frame
        const hasEffect = lyric.effect && lyric.effect !== 'None' && frame >= lyric.effectStartFrame && frame < lyric.effectEndFrame;

        // Apply basic animation style mapping
        let transformStyles = `translate(${lyric.x}px, ${lyric.y}px) scale(${lyric.scale})`;
        let opacityVal = 1;
        let textShadowStyle = `0 0 10px rgba(0,0,0,0.5)`;

        if (outlineColor !== 'transparent') {
          textShadowStyle += `, -2px -2px 0 ${outlineColor}, 2px -2px 0 ${outlineColor}, -2px 2px 0 ${outlineColor}, 2px 2px 0 ${outlineColor}`;
        }

        // Apply simple FX presets for visual interest
        if (hasEffect) {
          if (lyric.effect === 'Glitch') {
            const drift = (frame % 3) - 1;
            transformStyles += ` skewX(${drift * lyric.effectIntensity * 2}deg)`;
          } else if (lyric.effect === 'Shake') {
            const offset = (frame % 2 === 0 ? 1 : -1) * lyric.effectIntensity;
            transformStyles += ` translate(${offset}px, ${offset}px)`;
          } else if (lyric.effect === 'Bounce') {
            const bounceVal = Math.sin((frame - lyric.effectStartFrame) * 0.4) * lyric.effectIntensity * 3;
            transformStyles += ` translateY(${bounceVal}px)`;
          } else if (lyric.effect === 'Zoom') {
            const progress = (frame - lyric.effectStartFrame) / (lyric.effectEndFrame - lyric.effectStartFrame);
            const zoomVal = 1 + Math.sin(progress * Math.PI) * (lyric.effectIntensity * 0.1);
            transformStyles += ` scale(${zoomVal})`;
          } else if (lyric.effect === 'Blur') {
            const progress = (frame - lyric.effectStartFrame) / (lyric.effectEndFrame - lyric.effectStartFrame);
            const blurAmt = (1 - progress) * lyric.effectIntensity;
            transformStyles += ` blur(${blurAmt}px)`;
          }
        }

        // Entry effects
        const entryProgress = (frame - lyric.startFrame) / lyric.effectSpeed;
        if (entryProgress < 1 && entryProgress > 0) {
          if (lyric.textEffect === 'Fade In') {
            opacityVal = entryProgress;
          } else if (lyric.textEffect === 'Zoom In') {
            const scaleFactor = entryProgress;
            transformStyles += ` scale(${scaleFactor})`;
            opacityVal = entryProgress;
          } else if (lyric.textEffect === 'Bounce In') {
            const scaleFactor = Math.sin(entryProgress * Math.PI / 2) * 1.1;
            transformStyles += ` scale(${scaleFactor})`;
          }
        }

        return (
          <div
            key={lyric.id}
            style={{
              position: 'absolute',
              color: textColor,
              fontFamily: fontName,
              fontSize: '64px',
              fontWeight: 800,
              textAlign: 'center',
              transform: transformStyles,
              opacity: opacityVal,
              textShadow: textShadowStyle,
              transition: 'transform 0.05s ease-out, opacity 0.1s ease-out',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            {lyric.text}
          </div>
        );
      })}
    </div>
  );
};
