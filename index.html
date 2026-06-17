import React, {useEffect, useRef, useState} from 'react';
import {LyricBlock} from '../types';

interface TimelineTracksProps {
  lyrics: LyricBlock[];
  setLyrics: React.Dispatch<React.SetStateAction<LyricBlock[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  durationInFrames: number;
  trackCount: number;
  onDeleteTrack: (trackIndex: number) => void;
  audioUrl?: string;
}

type DragMode = 'move' | 'resize-start' | 'resize-end';

type DragState = {
  id: string;
  startFrame: number;
  endFrame: number;
  track: number;
  startX: number;
  startY: number;
  mode: DragMode;
};

const TRACK_HEIGHT = 24;
const WAVEFORM_HEIGHT = 34;

export const TimelineTracks: React.FC<TimelineTracksProps> = ({
  lyrics,
  setLyrics,
  selectedId,
  setSelectedId,
  currentFrame,
  setCurrentFrame,
  durationInFrames,
  trackCount,
  onDeleteTrack,
  audioUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<DragState | null>(null);
  const keyframeDragRef = useRef<{blockId: string; keyframeId: string; startFrame: number; startX: number} | null>(null);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const frameWidthPct = 100 / durationInFrames;
  const trackIndexes = Array.from({length: trackCount}, (_, index) => index);

  useEffect(() => {
    if (!audioUrl) {
      setWaveform(null);
      return;
    }
    let cancelled = false;
    fetch(audioUrl)
      .then((response) => response.arrayBuffer())
      .then(async (buffer) => {
        const AudioContextClass = window.AudioContext || (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
        if (!AudioContextClass) return;
        const context = new AudioContextClass();
        const audioBuffer = await context.decodeAudioData(buffer.slice(0));
        const channel = audioBuffer.getChannelData(0);
        const samples = 900;
        const points = Array.from({length: samples}, (_, index) => {
          const start = Math.floor((index / samples) * channel.length);
          const end = Math.floor(((index + 1) / samples) * channel.length);
          let peak = 0;
          for (let i = start; i < end; i += 1) peak = Math.max(peak, Math.abs(channel[i] ?? 0));
          return peak;
        });
        await context.close();
        if (!cancelled) setWaveform(points);
      })
      .catch(() => {
        if (!cancelled) setWaveform(null);
      });
    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !waveform) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(dpr, dpr);
    context.clearRect(0, 0, rect.width, rect.height);
    context.strokeStyle = 'rgba(34,211,238,.55)';
    context.lineWidth = 1;
    const mid = rect.height / 2;
    waveform.forEach((value, index) => {
      const x = (index / Math.max(1, waveform.length - 1)) * rect.width;
      const y = value * (rect.height / 2 - 3);
      context.beginPath();
      context.moveTo(x, mid - y);
      context.lineTo(x, mid + y);
      context.stroke();
    });
  }, [waveform, durationInFrames]);

  const frameDeltaFromPointer = (clientX: number, drag: DragState, altKey: boolean) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const rawDelta = (clientX - drag.startX) / rect.width * durationInFrames;
    return altKey ? Math.round(rawDelta) : Math.round(rawDelta / 5) * 5;
  };

  const trackFromPointer = (clientY: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(trackCount - 1, Math.floor((clientY - rect.top) / TRACK_HEIGHT)));
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.lyric-block')) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPct = clickX / rect.width;
    const targetFrame = Math.max(0, Math.min(durationInFrames, Math.round(clickPct * durationInFrames)));
    setCurrentFrame(targetFrame);
  };

  const handleBlockMouseDown = (e: React.MouseEvent, block: LyricBlock, mode: DragMode) => {
    e.stopPropagation();
    setSelectedId(block.id);
    dragStartRef.current = {
      id: block.id,
      startFrame: block.startFrame,
      endFrame: block.endFrame,
      track: block.track,
      startX: e.clientX,
      startY: e.clientY,
      mode,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = dragStartRef.current;
      if (!drag) return;

      const deltaFrames = frameDeltaFromPointer(moveEvent.clientX, drag, moveEvent.altKey);
      const duration = drag.endFrame - drag.startFrame;
      const nextTrack = drag.mode === 'move' ? trackFromPointer(moveEvent.clientY) : drag.track;

      setLyrics((prev) =>
        prev.map((lyric) => {
          if (lyric.id !== drag.id) return lyric;

          if (drag.mode === 'resize-start') {
            return {
              ...lyric,
              startFrame: Math.max(0, Math.min(drag.endFrame - 1, drag.startFrame + deltaFrames)),
            };
          }

          if (drag.mode === 'resize-end') {
            return {
              ...lyric,
              endFrame: Math.max(drag.startFrame + 1, Math.min(durationInFrames, drag.endFrame + deltaFrames)),
            };
          }

          const newStart = Math.max(0, Math.min(durationInFrames - duration, drag.startFrame + deltaFrames));
          return {
            ...lyric,
            startFrame: newStart,
            endFrame: newStart + duration,
            track: nextTrack,
          };
        })
      );
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleKeyframeMouseDown = (e: React.MouseEvent, blockId: string, keyframeId: string, frame: number) => {
    e.stopPropagation();
    keyframeDragRef.current = {blockId, keyframeId, startFrame: frame, startX: e.clientX};
    setSelectedId(blockId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = keyframeDragRef.current;
      if (!drag || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaFrames = Math.round(((moveEvent.clientX - drag.startX) / rect.width) * durationInFrames);
      setLyrics((prev) =>
        prev.map((lyric) =>
          lyric.id === drag.blockId
            ? {
                ...lyric,
                keyframes: (lyric.keyframes ?? []).map((keyframe) =>
                  keyframe.id === drag.keyframeId
                    ? {...keyframe, frame: Math.max(lyric.startFrame, Math.min(lyric.endFrame, drag.startFrame + deltaFrames))}
                    : keyframe
                ),
              }
            : lyric
        )
      );
    };

    const handleMouseUp = () => {
      keyframeDragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div style={{height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: '#12131a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: 11, color: '#6b7280', fontWeight: 'bold'}}>
        <span>0f</span>
        <span>{Math.round(durationInFrames * 0.25)}f</span>
        <span>{Math.round(durationInFrames * 0.5)}f</span>
        <span>{Math.round(durationInFrames * 0.75)}f</span>
        <span>{durationInFrames}f</span>
      </div>

      <div
        ref={containerRef}
        onClick={handleTimelineClick}
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          backgroundColor: '#07080b',
          borderRadius: 8,
          overflow: 'auto',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `${currentFrame * frameWidthPct}%`,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: '#ef4444',
            zIndex: 10,
            pointerEvents: 'none',
            boxShadow: '0 0 8px #ef4444',
          }}
        />

        <div style={{height: WAVEFORM_HEIGHT, position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,13,20,.9)'}}>
          <canvas ref={waveformCanvasRef} style={{width: '100%', height: '100%', display: 'block', opacity: waveform ? 1 : 0.35}} />
          {!waveform && (
            <div style={{position: 'absolute', left: 8, top: 9, fontSize: 10, color: 'rgba(255,255,255,.26)', fontWeight: 700}}>
              WAVEFORM
            </div>
          )}
        </div>

        {trackIndexes.map((trackIndex) => (
          <div
            key={trackIndex}
            style={{
              height: TRACK_HEIGHT,
              borderBottom: trackIndex < trackCount - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              position: 'relative',
            }}
          >
            <div style={{position: 'absolute', left: 4, top: 3, display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 'bold', zIndex: 1}}>
              <button
                type="button"
                disabled={trackCount <= 1}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteTrack(trackIndex);
                }}
                title="このトラックを削除"
                style={{
                  width: 14,
                  height: 14,
                  padding: 0,
                  border: '1px solid rgba(255,255,255,.12)',
                  borderRadius: 3,
                  background: 'rgba(239,68,68,.18)',
                  color: '#fca5a5',
                  fontSize: 10,
                  lineHeight: '12px',
                  cursor: trackCount <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                x
              </button>
              TRACK {trackIndex + 1}
            </div>

            {lyrics
              .filter((lyric) => lyric.track === trackIndex)
              .map((block) => {
                const widthPct = ((block.endFrame - block.startFrame) / durationInFrames) * 100;
                const leftPct = (block.startFrame / durationInFrames) * 100;

                return (
                  <div
                    key={block.id}
                    onMouseDown={(e) => handleBlockMouseDown(e, block, 'move')}
                    className={`lyric-block ${selectedId === block.id ? 'selected' : ''}`}
                    title="ドラッグで移動 / 上下ドラッグでTRACK移動 / 両端をAlt+ドラッグで1フレーム調整"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  >
                    <span
                      onMouseDown={(e) => handleBlockMouseDown(e, block, 'resize-start')}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 8,
                        cursor: 'ew-resize',
                        zIndex: 2,
                      }}
                    />
                    <span style={{pointerEvents: 'none', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {block.text || '(empty)'}
                    </span>
                    <span
                      onMouseDown={(e) => handleBlockMouseDown(e, block, 'resize-end')}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 8,
                        cursor: 'ew-resize',
                        zIndex: 2,
                      }}
                    />
                    {(block.keyframes ?? []).filter((keyframe) => keyframe.property).map((keyframe) => (
                      <span
                        key={keyframe.id}
                        title={`${keyframe.property}: ${String(keyframe.value ?? '')} @ ${keyframe.frame}f`}
                        onMouseDown={(event) => handleKeyframeMouseDown(event, block.id, keyframe.id, keyframe.frame)}
                        style={{
                          position: 'absolute',
                          left: `${((keyframe.frame - block.startFrame) / Math.max(1, block.endFrame - block.startFrame)) * 100}%`,
                          top: 2,
                          width: 9,
                          height: 9,
                          transform: 'translateX(-50%) rotate(45deg)',
                          background: selectedId === block.id ? '#facc15' : '#67e8f9',
                          border: '1px solid rgba(0,0,0,.45)',
                          borderRadius: 2,
                          zIndex: 4,
                          cursor: 'ew-resize',
                        }}
                      />
                    ))}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};
