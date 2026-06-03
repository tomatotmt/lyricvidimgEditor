import React, { useState, useRef, useEffect } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { TimelineTracks } from './components/TimelineTracks';
import { EditorTabs } from './components/EditorTabs';
import { LyricComposition } from './components/LyricComposition';
import { LyricBlock, GlobalSettings, initialLyrics } from './types';

const App: React.FC = () => {
  const [lyrics, setLyrics] = useState<LyricBlock[]>(initialLyrics);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [durationInFrames, setDurationInFrames] = useState(300); // default 10 seconds
  const [fps] = useState(30);
  
  const [audioFile, setAudioFile] = useState<{ name: string; url: string } | null>(null);
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    font: 'Outfit',
    textEffect: 'Bounce In',
    effectSpeed: 5,
    textColor: '#ffffff',
    backgroundColor: '#0b0c10',
    outlineColor: '#000000'
  });

  const [activeTab, setActiveTab] = useState<'edit' | 'input' | 'output'>('input');
  
  const [player, setPlayer] = useState<PlayerRef | null>(null);

  // Sync player frame change event to react state
  useEffect(() => {
    if (!player) return;

    const handleFrameUpdate = () => {
      setCurrentFrame(Math.round(player.getCurrentFrame()));
    };

    player.addEventListener('frameupdate', handleFrameUpdate);
    return () => {
      player.removeEventListener('frameupdate', handleFrameUpdate);
    };
  }, [player]);

  const handleSeek = (frame: number) => {
    setCurrentFrame(frame);
    if (player) {
      player.seekTo(frame);
    }
  };

  const handleAddLyric = () => {
    const nextId = `block-${Date.now()}`;
    const newBlock: LyricBlock = {
      id: nextId,
      text: '譁ｰ縺励＞豁瑚ｩ・,
      track: 0,
      startFrame: currentFrame,
      endFrame: Math.min(durationInFrames, currentFrame + 60), // default 2 seconds
      scale: 1,
      x: 0,
      y: 0,
      effect: 'None',
      effectIntensity: 5,
      effectStartFrame: currentFrame,
      effectEndFrame: Math.min(durationInFrames, currentFrame + 30),
      font: globalSettings.font,
      textEffect: globalSettings.textEffect,
      effectSpeed: globalSettings.effectSpeed,
      textColor: globalSettings.textColor
    };
    setLyrics(prev => [...prev, newBlock]);
    setSelectedId(nextId);
    setActiveTab('edit');
  };

  const handleDeleteLyric = () => {
    if (!selectedId) return;
    setLyrics(prev => prev.filter(l => l.id !== selectedId));
    setSelectedId(null);
  };

  // Adjust duration if a block goes beyond current duration
  useEffect(() => {
    let maxFrame = 300;
    lyrics.forEach(l => {
      if (l.endFrame > maxFrame) {
        maxFrame = l.endFrame;
      }
    });
    // Add some buffer
    if (maxFrame > durationInFrames) {
      setDurationInFrames(maxFrame + 30);
    }
  }, [lyrics, durationInFrames]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24, padding: 24, height: 'calc(100vh - 48px)', boxSizing: 'border-box' }}>
      
      {/* LEFT COLUMN: Preview & Timelines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflow: 'hidden' }}>
        
        {/* Preview Container */}
        <div
          className="panel"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: '#040507',
            position: 'relative'
          }}
        >
          <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 13, fontWeight: 'bold', color: '#9ca3af', zIndex: 10 }}>
            繝励Ξ繝薙Η繝ｼ (1920x1080)
          </div>

          <div style={{ width: '100%', height: 'calc(100% - 32px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Player
              ref={setPlayer}
              component={LyricComposition}
              inputProps={{ lyrics, globalSettings }}
              durationInFrames={durationInFrames}
              fps={fps}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{
                width: '100%',
                maxHeight: '100%',
                aspectRatio: '16/9',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                borderRadius: 8,
                backgroundColor: globalSettings.backgroundColor
              }}
              controls
            />
          </div>
        </div>

        {/* Playback time / frame count info bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', fontSize: 13, color: '#9ca3af' }}>
          <div>
            蜀咲函譎る俣: <span style={{ color: '#f3f4f6', fontWeight: 'bold' }}>{((currentFrame) / fps).toFixed(2)}s</span> / {((durationInFrames) / fps).toFixed(2)}s
          </div>
          <div>
            繝輔Ξ繝ｼ繝謨ｰ: <span style={{ color: '#f3f4f6', fontWeight: 'bold' }}>{currentFrame}f</span> / {durationInFrames}f
          </div>
        </div>

        {/* 5-Track Timeline */}
        <TimelineTracks
          lyrics={lyrics}
          setLyrics={setLyrics}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          currentFrame={currentFrame}
          setCurrentFrame={handleSeek}
          durationInFrames={durationInFrames}
        />
        
        {/* Quick action button under timeline */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '0 4px' }}>
          <button
            onClick={handleAddLyric}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
          >
            + 豁瑚ｩ槭ヶ繝ｭ繝・け繧定ｿｽ蜉 (迴ｾ蝨ｨ縺ｮ繝輔Ξ繝ｼ繝)
          </button>
        </div>

      </div>

      {/* RIGHT COLUMN: Tabbed details panel */}
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <EditorTabs
          lyrics={lyrics}
          setLyrics={setLyrics}
          selectedId={selectedId}
          globalSettings={globalSettings}
          setGlobalSettings={setGlobalSettings}
          audioFile={audioFile}
          setAudioFile={setAudioFile}
          durationInFrames={durationInFrames}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onAddLyric={handleAddLyric}
          onDeleteLyric={handleDeleteLyric}
        />
      </div>

    </div>
  );
};

export default App;
