import React, {useEffect, useRef, useState} from 'react';
import {Player, PlayerRef} from '@remotion/player';
import {TimelineTracks} from './components/TimelineTracks';
import {EditorTabs} from './components/EditorTabs';
import {LyricComposition} from './components/LyricComposition';
import {BeatMarker, GlobalSettings, initialLyrics, LyricBlock} from './types';
import {withGeneratedTokens} from './lyricTokens';

type HistorySnapshot = {
  lyrics: LyricBlock[];
  globalSettings: GlobalSettings;
  trackCount: number;
  selectedId: string | null;
};

type ProjectStateUpdate = {
  lyrics: LyricBlock[];
  globalSettings: GlobalSettings;
  trackCount?: number;
  selectedId?: string | null;
};

const App: React.FC = () => {
  const [lyrics, setLyrics] = useState<LyricBlock[]>(initialLyrics);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [durationInFrames, setDurationInFrames] = useState(300);
  const [trackCount, setTrackCount] = useState(4);
  const [fps] = useState(30);
  const [audioFile, setAudioFile] = useState<{name: string; url: string; duration?: number} | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    font: 'Outfit',
    textEffect: 'Pop In',
    effectSpeed: 5,
    textColor: '#ffffff',
    backgroundColor: '#0b0c10',
    outlineColor: '#000000',
    textBackgroundColor: 'transparent',
    outlineWidth: 2,
    fadeInFrames: 8,
    fadeOutFrames: 8,
    fadeInPattern: 'Linear',
    fadeOutPattern: 'Linear',
  });
  const [activeTab, setActiveTab] = useState<'edit' | 'input' | 'output' | 'help'>('input');
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [previewHeight, setPreviewHeight] = useState(440);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [previewPositionDragEnabled, setPreviewPositionDragEnabled] = useState(false);
  const [repeatSelectedBlockEnabled, setRepeatSelectedBlockEnabled] = useState(false);
  const [beatMarkers, setBeatMarkers] = useState<BeatMarker[]>([]);
  const [beatSnapEnabled, setBeatSnapEnabled] = useState(true);
  const undoStackRef = useRef<HistorySnapshot[]>([]);
  const redoStackRef = useRef<HistorySnapshot[]>([]);
  const selectedBlock = lyrics.find((lyric) => lyric.id === selectedId);

  const snapshot = () => ({
    lyrics: structuredClone(lyrics),
    globalSettings: structuredClone(globalSettings),
    trackCount,
    selectedId,
  });

  const recordHistory = () => {
    undoStackRef.current = [...undoStackRef.current.slice(-79), snapshot()];
    redoStackRef.current = [];
  };

  const setLyricsWithHistory: React.Dispatch<React.SetStateAction<LyricBlock[]>> = (action) => {
    recordHistory();
    setLyrics(action);
  };

  const setGlobalSettingsWithHistory: React.Dispatch<React.SetStateAction<GlobalSettings>> = (action) => {
    recordHistory();
    setGlobalSettings(action);
  };

  const undo = () => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    redoStackRef.current.push(snapshot());
    setLyrics(previous.lyrics);
    setGlobalSettings(previous.globalSettings);
    setTrackCount(previous.trackCount);
    setSelectedId(previous.selectedId && previous.lyrics.some((lyric) => lyric.id === previous.selectedId) ? previous.selectedId : null);
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(snapshot());
    setLyrics(next.lyrics);
    setGlobalSettings(next.globalSettings);
    setTrackCount(next.trackCount);
    setSelectedId(next.selectedId && next.lyrics.some((lyric) => lyric.id === next.selectedId) ? next.selectedId : null);
  };

  const applyProjectStateUpdate = (update: ProjectStateUpdate) => {
    recordHistory();
    setLyrics(update.lyrics);
    setGlobalSettings(update.globalSettings);
    if (update.trackCount !== undefined) setTrackCount(update.trackCount);
    if (update.selectedId !== undefined) setSelectedId(update.selectedId);
  };

  useEffect(() => {
    if (!player) return;
    const handleFrameUpdate = () => {
      const frame = Math.round(player.getCurrentFrame());
      if (repeatSelectedBlockEnabled && selectedBlock && frame >= selectedBlock.endFrame) {
        player.seekTo(selectedBlock.startFrame);
        setCurrentFrame(selectedBlock.startFrame);
        return;
      }
      setCurrentFrame(frame);
    };
    player.addEventListener('frameupdate', handleFrameUpdate);
    return () => player.removeEventListener('frameupdate', handleFrameUpdate);
  }, [player, repeatSelectedBlockEnabled, selectedBlock?.id, selectedBlock?.startFrame, selectedBlock?.endFrame]);

  const handleSeek = (frame: number) => {
    setCurrentFrame(frame);
    player?.seekTo(frame);
  };

  const togglePlayback = () => {
    if (!player) return;
    if (repeatSelectedBlockEnabled && selectedBlock) {
      const frame = Math.round(player.getCurrentFrame());
      if (frame < selectedBlock.startFrame || frame >= selectedBlock.endFrame) {
        handleSeek(selectedBlock.startFrame);
      }
    }
    player.toggle();
  };

  const updateSelectedPosition = (x: number, y: number) => {
    if (!selectedId) return;
    setLyrics((prev) => prev.map((lyric) => (lyric.id === selectedId ? {...lyric, x, y} : lyric)));
  };

  const startPreviewLyricDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!previewPositionDragEnabled || !selectedBlock) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = selectedBlock.x;
    const initialY = selectedBlock.y;

    const onMove = (moveEvent: MouseEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 1920;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 1080;
      updateSelectedPosition(Math.round(initialX + deltaX), Math.round(initialY + deltaY));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
      rotation: 0,
      effect: 'None',
      inEffect: 'None',
      outEffect: 'None',
      effectIntensity: 5,
      effectStartFrame: currentFrame,
      effectEndFrame: Math.min(durationInFrames, currentFrame + 30),
      effectSwitchFrame: Math.min(durationInFrames, currentFrame + 15),
      fadeInFrames: globalSettings.fadeInFrames ?? 8,
      fadeOutFrames: globalSettings.fadeOutFrames ?? 8,
      fadeInPattern: globalSettings.fadeInPattern ?? 'Linear',
      fadeOutPattern: globalSettings.fadeOutPattern ?? 'Linear',
      font: globalSettings.font,
      textEffect: globalSettings.textEffect,
      effectSpeed: globalSettings.effectSpeed,
      textColor: globalSettings.textColor,
      textBackgroundColor: globalSettings.textBackgroundColor ?? 'transparent',
      outlineColor: globalSettings.outlineColor,
      outlineWidth: globalSettings.outlineWidth ?? 2,
    };
    recordHistory();
    setLyrics((prev) => [...prev, withGeneratedTokens(newBlock)]);
    setSelectedId(nextId);
    setActiveTab('edit');
  };

  const handleDeleteLyric = () => {
    if (!selectedId) return;
    recordHistory();
    setLyrics((prev) => prev.filter((lyric) => lyric.id !== selectedId));
    setSelectedId(null);
  };

  const handleAddTrack = () => {
    recordHistory();
    setTrackCount((count) => count + 1);
  };

  const handleDeleteTrack = (trackIndex: number) => {
    if (trackCount <= 1) return;
    recordHistory();
    setLyrics((prev) =>
      prev
        .filter((lyric) => lyric.track !== trackIndex)
        .map((lyric) => (lyric.track > trackIndex ? {...lyric, track: lyric.track - 1} : lyric))
    );
    setSelectedId((id) => {
      const selected = lyrics.find((lyric) => lyric.id === id);
      return selected?.track === trackIndex ? null : id;
    });
    setTrackCount((count) => Math.max(1, count - 1));
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

  useEffect(() => {
    if (!audioFile?.url) return;
    setCurrentFrame(0);
    player?.seekTo(0);
  }, [audioFile?.url, player]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) =>
      target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        handleDeleteLyric();
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlayback();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleSeek(Math.min(durationInFrames, currentFrame + 1));
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleSeek(Math.max(0, currentFrame - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentFrame, durationInFrames, player, selectedId, lyrics, globalSettings, repeatSelectedBlockEnabled, selectedBlock]);

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
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              <span>プレビュー (1920x1080 / 透明背景)</span>
              <label style={{display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  checked={previewPositionDragEnabled}
                  onChange={(event) => setPreviewPositionDragEnabled(event.target.checked)}
                  style={{width: 14, height: 14}}
                />
                文字位置ドラッグ
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0, cursor: selectedBlock ? 'pointer' : 'not-allowed', opacity: selectedBlock ? 1 : 0.55}}>
                <input
                  type="checkbox"
                  checked={repeatSelectedBlockEnabled}
                  onChange={(event) => setRepeatSelectedBlockEnabled(event.target.checked)}
                  disabled={!selectedBlock}
                  style={{width: 14, height: 14}}
                />
                選択テキスト範囲をリピート再生
              </label>
            </div>
            <span>{selectedBlock ? `選択中: ${selectedBlock.text}` : '未選択'}</span>
          </div>

          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, minHeight: 0, overflow: 'hidden'}}>
            <div
              style={{
                position: 'relative',
                width: `min(100%, ${Math.max(160, (previewHeight - 28) * 16 / 9)}px)`,
                height: 'auto',
                maxHeight: '100%',
                maxWidth: '100%',
                aspectRatio: '16/9',
              }}
            >
              <Player
                ref={setPlayer}
                component={LyricComposition}
                inputProps={{lyrics, globalSettings, audioUrl: audioFile?.url, beatMarkers}}
                durationInFrames={durationInFrames}
                fps={fps}
                compositionWidth={1920}
                compositionHeight={1080}
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '100%',
                  maxWidth: '100%',
                  aspectRatio: '16/9',
                  display: 'block',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                  borderRadius: 8,
                  backgroundColor: globalSettings.backgroundColor,
                }}
                controls
              />
              {previewPositionDragEnabled && (
                <div
                  onMouseDown={startPreviewLyricDrag}
                  title={selectedBlock ? 'ドラッグして選択中の歌詞のXY位置を変更' : 'タイムライン上のリリックブロックを選択してください'}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 5,
                    cursor: selectedBlock ? 'move' : 'not-allowed',
                    borderRadius: 8,
                    border: selectedBlock ? '1px dashed rgba(59,130,246,.7)' : '1px dashed rgba(156,163,175,.35)',
                    background: 'rgba(59,130,246,.03)',
                    pointerEvents: 'auto',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px', fontSize: 13, color: '#9ca3af'}}>
          <div>
            再生時間: <span style={{color: '#f3f4f6', fontWeight: 'bold'}}>{(currentFrame / fps).toFixed(2)}s</span> / {(durationInFrames / fps).toFixed(2)}s
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <button onClick={undo} title="戻す (Ctrl+Z)">↶</button>
            <button onClick={redo} title="やり直し (Shift+Ctrl+Z)">↷</button>
            <button onClick={togglePlayback} title="再生/停止 (Space)">▶</button>
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
          setLyrics={setLyricsWithHistory}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          currentFrame={currentFrame}
          setCurrentFrame={handleSeek}
          durationInFrames={durationInFrames}
          trackCount={trackCount}
          onDeleteTrack={handleDeleteTrack}
          audioUrl={audioFile?.url}
          beatMarkers={beatMarkers}
          onBeatMarkersChange={setBeatMarkers}
          beatSnapEnabled={beatSnapEnabled}
          setBeatSnapEnabled={setBeatSnapEnabled}
        />

        <div style={{display: 'flex', justifyContent: 'flex-start', gap: 10, padding: '0 4px'}}>
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
          <button
            onClick={handleAddTrack}
            style={{
              padding: '10px 16px',
              backgroundColor: '#111827',
              color: 'white',
              border: '1px solid rgba(255,255,255,.14)',
              borderRadius: 8,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            + トラック追加
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
          setLyrics={setLyricsWithHistory}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          globalSettings={globalSettings}
          setGlobalSettings={setGlobalSettingsWithHistory}
          audioFile={audioFile}
          setAudioFile={setAudioFile}
          beatMarkers={beatMarkers}
          setBeatMarkers={setBeatMarkers}
          durationInFrames={durationInFrames}
          currentFrame={currentFrame}
          trackCount={trackCount}
          setTrackCount={setTrackCount}
          applyProjectStateUpdate={applyProjectStateUpdate}
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
