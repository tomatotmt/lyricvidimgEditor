import React, {useRef} from 'react';
import {LyricBlock} from '../types';

interface TimelineTracksProps {
  lyrics: LyricBlock[];
  setLyrics: React.Dispatch<React.SetStateAction<LyricBlock[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  durationInFrames: number;
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

const TRACK_COUNT = 10;
const TRACK_HEIGHT = 48;

export const TimelineTracks: React.FC<TimelineTracksProps> = ({
  lyrics,
  setLyrics,
  selectedId,
  setSelectedId,
  currentFrame,
  setCurrentFrame,
  durationInFrames,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<DragState | null>(null);
  const frameWidthPct = 100 / durationInFrames;
  const trackIndexes = Array.from({length: TRACK_COUNT}, (_, index) => index);

  const frameDeltaFromPointer = (clientX: number, drag: DragState, altKey: boolean) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const rawDelta = (clientX - drag.startX) / rect.width * durationInFrames;
    return altKey ? Math.round(rawDelta) : Math.round(rawDelta / 5) * 5;
  };

  const trackFromPointer = (clientY: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(TRACK_COUNT - 1, Math.floor((clientY - rect.top) / TRACK_HEIGHT)));
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

        {trackIndexes.map((trackIndex) => (
          <div
            key={trackIndex}
            style={{
              height: TRACK_HEIGHT,
              borderBottom: trackIndex < TRACK_COUNT - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              position: 'relative',
            }}
          >
            <div style={{position: 'absolute', left: 8, top: 4, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 'bold', zIndex: 1}}>
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
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};
