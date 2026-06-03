import React, { useRef } from 'react';
import { LyricBlock } from '../types';

interface TimelineTracksProps {
  lyrics: LyricBlock[];
  setLyrics: React.Dispatch<React.SetStateAction<LyricBlock[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  durationInFrames: number;
}

export const TimelineTracks: React.FC<TimelineTracksProps> = ({
  lyrics,
  setLyrics,
  selectedId,
  setSelectedId,
  currentFrame,
  setCurrentFrame,
  durationInFrames
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ id: string; startFrame: number; endFrame: number; startX: number } | null>(null);

  const frameWidthPct = 100 / durationInFrames;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If clicking a lyric block or dragging, don't seek
    if ((e.target as HTMLElement).closest('.lyric-block')) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickPct = clickX / rect.width;
      const targetFrame = Math.max(0, Math.min(durationInFrames, Math.round(clickPct * durationInFrames)));
      setCurrentFrame(targetFrame);
    }
  };

  const handleBlockMouseDown = (e: React.MouseEvent, block: LyricBlock) => {
    e.stopPropagation();
    setSelectedId(block.id);
    dragStartRef.current = {
      id: block.id,
      startFrame: block.startFrame,
      endFrame: block.endFrame,
      startX: e.clientX
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaFrames = Math.round((deltaX / rect.width) * durationInFrames);
      
      const newStart = Math.max(0, Math.min(durationInFrames - (dragStartRef.current.endFrame - dragStartRef.current.startFrame), dragStartRef.current.startFrame + deltaFrames));
      const duration = dragStartRef.current.endFrame - dragStartRef.current.startFrame;

      setLyrics(prev => prev.map(l => l.id === dragStartRef.current!.id ? {
        ...l,
        startFrame: newStart,
        endFrame: newStart + duration
      } : l));
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: '#12131a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Time indicators */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: 11, color: '#6b7280', fontWeight: 'bold' }}>
        <span>0f</span>
        <span>{Math.round(durationInFrames * 0.25)}f</span>
        <span>{Math.round(durationInFrames * 0.5)}f</span>
        <span>{Math.round(durationInFrames * 0.75)}f</span>
        <span>{durationInFrames}f</span>
      </div>

      {/* Grid Container */}
      <div
        ref={containerRef}
        onClick={handleTimelineClick}
        style={{
          position: 'relative',
          backgroundColor: '#07080b',
          borderRadius: 8,
          overflow: 'hidden',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* Playhead line */}
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
            boxShadow: '0 0 8px #ef4444'
          }}
        />

        {/* Tracks */}
        {[0, 1, 2, 3, 4].map(trackIndex => (
          <div
            key={trackIndex}
            style={{
              height: 48,
              borderBottom: trackIndex < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              position: 'relative'
            }}
          >
            <div style={{ position: 'absolute', left: 8, top: 4, fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 'bold', zIndex: 1 }}>
              TRACK {trackIndex + 1}
            </div>

            {lyrics
              .filter(l => l.track === trackIndex)
              .map(block => {
                const widthPct = ((block.endFrame - block.startFrame) / durationInFrames) * 100;
                const leftPct = (block.startFrame / durationInFrames) * 100;

                return (
                  <div
                    key={block.id}
                    onMouseDown={(e) => handleBlockMouseDown(e, block)}
                    className={`lyric-block ${selectedId === block.id ? 'selected' : ''}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                  >
                    {block.text || '(empty)'}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};
