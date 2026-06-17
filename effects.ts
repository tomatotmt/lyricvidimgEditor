import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {LyricComposition} from '../web-editor/components/LyricComposition';
import {GlobalSettings, LyricBlock, initialLyrics} from '../web-editor/types';

type RenderProps = {
  lyrics: LyricBlock[];
  globalSettings: GlobalSettings;
  durationInFrames: number;
  audioUrl?: string;
};

const defaultGlobalSettings: GlobalSettings = {
  font: 'Outfit',
  textEffect: 'Pop In',
  effectSpeed: 5,
  textColor: '#ffffff',
  backgroundColor: 'transparent',
  outlineColor: '#000000',
  textBackgroundColor: 'transparent',
  outlineWidth: 2,
  fadeInFrames: 8,
  fadeOutFrames: 8,
  fadeInPattern: 'Linear',
  fadeOutPattern: 'Linear',
};

const defaultProps: RenderProps = {
  lyrics: initialLyrics,
  globalSettings: defaultGlobalSettings,
  durationInFrames: 300,
};

const RenderComposition: React.FC<RenderProps> = ({lyrics, globalSettings, audioUrl}) => (
  <LyricComposition lyrics={lyrics} globalSettings={globalSettings} audioUrl={audioUrl} />
);

const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LyricVideo"
      component={RenderComposition}
      durationInFrames={defaultProps.durationInFrames}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
      calculateMetadata={({props}: {props: RenderProps}) => ({
        durationInFrames: Math.max(1, Math.round(props.durationInFrames ?? defaultProps.durationInFrames)),
        fps: 30,
        width: 1920,
        height: 1080,
      })}
    />
  );
};

registerRoot(RemotionRoot);
