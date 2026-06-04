import React, {useEffect, useState} from 'react';
import {Player, PlayerRef} from '@remotion/player';
import {TimelineTracks} from './components/TimelineTracks';
import {EditorTabs} from './components/EditorTabs';
import {LyricComposition} from './components/LyricComposition';
import {GlobalSettings, initialLyrics, LyricBlock} from './types';

const App: React.FC = () => {
  const [lyrics, setLyrics] = useState<LyricBlock[]>(initialLyrics);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [durationInFrames, setDurationInFrames] = useState(300);
  const [fps] = useState(30);
  const [audioFile, setAudioFile] = useState<{name: string; url: string; duration?: number} | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    font: 'Outfit',
    textEffect: 'Pop In',
    effectSpeed: 5,
    textColor: '#ffffff',
    backgroundColor: '#0b0c10',
    outlineColor: '#000000',
  });
  const [activeTab, setActiveTab] = useState<'edit' | 'input' | 'output'>('input');
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [previewHeight, setPreviewHeight] = useState(440);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const selectedBlock = lyrics.find((lyric) => lyric.id === selectedId);

  useEffect(() => {
    if (!player) return;
    const handleFrameUpdate = () => setCurrentFrame(Math.round(player.getCurrentFrame()));
    player.addEventListener('frameupdate', handleFrameUpdate);
    return () => player.removeEventListener('frameupdate', handleFrameUpdate);
  }, [player]);

  const handleSeek = (frame: number) => {
    setCurrentFrame(frame);
    player?.seekTo(frame);
  };

  const handleAddLyric = () => {
    const nextId = `block-${Date.now()}`;
    const newBlock: LyricBlock = {
      id: nextId,
      text: '新しい歌詞',
      track: 0,
      startFrame: currentFrame,
      endFrame: Math.min(durationInFrames, currentFrame + 60),
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
      textColor: globalSettings.textColor,
    };
    setLyrics((prev) => [...prev, newBlock]);
    setSelectedId(nextId);
    setActiveTab('edit');
  };

  const handleDeleteLyric = () => {
    if (!selectedId) return;
    setLyrics((prev) => prev.filter((lyric) => lyric.id !== selectedId));
    setSelectedId(null);
  };

  const startLayoutDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = previewHeight;

    const onMove = (moveEvent: MouseEvent) => {
      const viewportReserve = 280;
      const maxHeight = Math.max(240, window.innerHeight - viewportReserve);
      setPreviewHeight(Math.max(240, Math.min(maxHeight, startHeight + moveEvent.clientY - startY)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startPanelDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = rightPanelWidth;

    const onMove = (moveEvent: MouseEvent) => {
      const minRight = 340;
      const maxRight = Math.max(minRight, window.innerWidth * 0.5);
      setRightPanelWidth(Math.max(minRight, Math.min(maxRight, startWidth - (moveEvent.clientX - startX))));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    const maxFrame = Math.max(300, ...lyrics.map((lyric) => lyric.endFrame));
    if (maxFrame > durationInFrames) {
      setDurationInFrames(maxFrame + 30);
    }
  }, [lyrics, durationInFrames]);

  useEffect(() => {
    if (!audioFile?.duration) return;
    const audioFrames = Math.max(1, Math.ceil(audioFile.duration * fps));
    const lyricFrames = Math.max(0, ...lyrics.map((lyric) => lyric.endFrame + 30));
    const nextDuration = Math.max(300, audioFrames, lyricFrames);
    setDurationInFrames(nextDuration);
    setCurrentFrame((frame) => Math.min(frame, nextDuration));
  }, [audioFile?.duration, fps, lyrics]);

  return (
    <div style={{display: 'grid', gridTemplateColumns: `minmax(0, 1fr) 8px minmax(340px, ${rightPanelWidth}px)`, gap: 10, padding: 18, height: '100vh', boxSizing: 'border-box'}}>
      <div style={{display: 'grid', gridTemplateRows: `${previewHeight}px auto 8px minmax(220px, 1fr) auto`, gap: 12, minHeight: 0, overflow: 'hidden'}}>
        <div
          className="panel"
          style={{
            display: 'grid',
            gridTemplateColumns: '180px minmax(0, 1fr)',
            gap: 12,
            minHeight: 0,
            overflow: 'hidden',
            backgroundColor: '#040507',
          }}
        >
          <div style={{fontSize: 13, fontWeight: 800, color: '#9ca3af', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, padding: '6px 2px'}}>
            <span>プレビュー (1920x1080 / 透明背景)</span>
            <span>{selectedBlock ? `選択中: ${selectedBlock.text}` : '未選択'}</span>
          </div>

          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, minHeight: 0, overflow: 'hidden'}}>
            <Player
              ref={setPlayer}
              component={LyricComposition}
              inputProps={{lyrics, globalSettings}}
              durationInFrames={durationInFrames}
              fps={fps}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{
                width: `min(100%, ${Math.max(160, (previewHeight - 28) * 16 / 9)}px)`,
                height: 'auto',
                maxHeight: '100%',
                maxWidth: '100%',
                aspectRatio: '16/9',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                borderRadius: 8,
                backgroundColor: globalSettings.backgroundColor,
              }}
              controls
            />
          </div>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', fontSize: 13, color: '#9ca3af'}}>
          <div>
            再生時間: <span style={{color: '#f3f4f6', fontWeight: 'bold'}}>{(currentFrame / fps).toFixed(2)}s</span> / {(durationInFrames / fps).toFixed(2)}s
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <button onClick={() => player?.seekTo(Math.max(0, currentFrame - 1))}>↶</button>
            <button onClick={() => player?.play()}>▶</button>
          </div>
          <div>
            フレーム: <span style={{color: '#f3f4f6', fontWeight: 'bold'}}>{currentFrame}f</span> / {durationInFrames}f
          </div>
        </div>

        <div
          onMouseDown={startLayoutDrag}
          title="ドラッグしてプレビューとタイムラインの高さを調整"
          style={{
            height: 8,
            borderRadius: 999,
            background: 'linear-gradient(90deg, transparent, rgba(59,130,246,.7), transparent)',
            cursor: 'row-resize',
          }}
        />

        <TimelineTracks
          lyrics={lyrics}
          setLyrics={setLyrics}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          currentFrame={currentFrame}
          setCurrentFrame={handleSeek}
          durationInFrames={durationInFrames}
        />

        <div style={{display: 'flex', justifyContent: 'flex-start', padding: '0 4px'}}>
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
            }}
          >
            + 歌詞ブロックを追加 (現在のフレーム)
          </button>
        </div>
      </div>

      <div
        onMouseDown={startPanelDrag}
        title="ドラッグしてタイムラインと詳細パネルの幅を調整"
        style={{
          width: 8,
          minWidth: 8,
          height: '100%',
          borderRadius: 999,
          background: 'linear-gradient(180deg, transparent, rgba(59,130,246,.55), transparent)',
          cursor: 'col-resize',
        }}
      />

      <div style={{height: '100%', overflow: 'hidden'}}>
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
