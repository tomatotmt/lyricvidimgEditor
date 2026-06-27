import React, {useEffect, useRef, useState} from 'react';
import {BeatMarker, ImageBlock, LyricBlock, LyricToken} from '../types';
import {getLyricTokens} from '../lyricTokens';

interface TimelineTracksProps {
  lyrics: LyricBlock[];
  setLyrics: React.Dispatch<React.SetStateAction<LyricBlock[]>>;
  imageBlocks: ImageBlock[];
  setImageBlocks: React.Dispatch<React.SetStateAction<ImageBlock[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  durationInFrames: number;
  trackCount: number;
  onDeleteTrack: (trackIndex: number) => void;
  audioUrl?: string;
  beatMarkers: BeatMarker[];
  onBeatMarkersChange: React.Dispatch<React.SetStateAction<BeatMarker[]>>;
  beatSnapEnabled: boolean;
  setBeatSnapEnabled: (enabled: boolean) => void;
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

type BeatDragState = {
  id: string;
  startFrame: number;
  startX: number;
};

type TokenBoundaryDragState = {
  blockId: string;
  tokenId: string;
  previousTokenId: string;
  startFrame: number;
  startX: number;
  minFrame: number;
  maxFrame: number;
};

const TRACK_HEIGHT = 36;
const WAVEFORM_HEIGHT = 54;
const IMAGE_LAYER_COUNT = 3;
const SNAP_DISTANCE_FRAMES = 6;
const TRACK_LABELS = ['Main Lyrics', 'Alt / Overlap', 'Emphasis', 'FX / Accent'];
const FPS = 30;

const createBeatId = (source: NonNullable<BeatMarker['source']>, frame: number, index = 0) =>
  `${source}-beat-${Math.round(frame)}-${Date.now()}-${index}`;

const markerKey = (marker: BeatMarker, index: number) => marker.id ?? `legacy-beat-${index}-${marker.frame}`;

const sortBeatMarkers = (markers: BeatMarker[]) =>
  [...markers]
    .map((marker, index) => ({
      id: marker.id ?? createBeatId(marker.source ?? 'imported', marker.frame, index),
      frame: Math.max(0, Math.round(marker.frame)),
      strength: Math.max(0.1, Math.min(1, marker.strength)),
      source: marker.source ?? 'imported',
    }))
    .sort((a, b) => a.frame - b.frame);

const dedupeBeatMarkers = (markers: BeatMarker[]) => {
  const sorted = sortBeatMarkers(markers);
  return sorted.filter((marker, index) => index === 0 || Math.abs(marker.frame - sorted[index - 1].frame) > 1);
};

const fitTokensToBounds = (tokens: LyricToken[] | undefined, startFrame: number, endFrame: number) =>
  tokens?.map((token, index) => {
    const start = Math.max(startFrame, Math.min(endFrame - 1, Math.round(token.startFrame)));
    const end = Math.max(start + 1, Math.min(endFrame, Math.round(token.endFrame)));
    return {...token, index, startFrame: start, endFrame: end};
  });

const shiftTokens = (tokens: LyricToken[] | undefined, deltaFrames: number) =>
  tokens?.map((token) => ({
    ...token,
    startFrame: token.startFrame + deltaFrames,
    endFrame: token.endFrame + deltaFrames,
  }));

const scaleTokensToBounds = (
  tokens: LyricToken[] | undefined,
  oldStartFrame: number,
  oldEndFrame: number,
  newStartFrame: number,
  newEndFrame: number
) => {
  const oldDuration = Math.max(1, oldEndFrame - oldStartFrame);
  const newDuration = Math.max(1, newEndFrame - newStartFrame);
  return fitTokensToBounds(
    tokens?.map((token) => ({
      ...token,
      startFrame: newStartFrame + Math.round(((token.startFrame - oldStartFrame) / oldDuration) * newDuration),
      endFrame: newStartFrame + Math.round(((token.endFrame - oldStartFrame) / oldDuration) * newDuration),
    })),
    newStartFrame,
    newEndFrame
  );
};

const nearestBeatFrame = (frame: number, markers: BeatMarker[]) => {
  if (markers.length === 0) return null;
  return markers.reduce((nearest, marker) =>
    Math.abs(marker.frame - frame) < Math.abs(nearest.frame - frame) ? marker : nearest
  ).frame;
};

const snapToBeat = (frame: number, markers: BeatMarker[], enabled: boolean, force = false) => {
  if ((!enabled && !force) || markers.length === 0) return Math.round(frame);
  const nearest = nearestBeatFrame(frame, markers);
  if (nearest === null) return Math.round(frame);
  return force || Math.abs(nearest - frame) <= SNAP_DISTANCE_FRAMES ? nearest : Math.round(frame);
};

const detectBeatMarkers = (channel: Float32Array, sampleRate: number, fps = FPS, sensitivity = 0.85): BeatMarker[] => {
  const windowSeconds = 0.08;
  const windowSize = Math.max(256, Math.round(sampleRate * windowSeconds));
  const energies: number[] = [];
  for (let start = 0; start < channel.length; start += windowSize) {
    const end = Math.min(channel.length, start + windowSize);
    let sum = 0;
    for (let i = start; i < end; i += 1) {
      const value = channel[i] ?? 0;
      sum += value * value;
    }
    energies.push(Math.sqrt(sum / Math.max(1, end - start)));
  }
  if (energies.length < 3) return [];
  const mean = energies.reduce((sum, value) => sum + value, 0) / energies.length;
  const variance = energies.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / energies.length;
  const threshold = mean + Math.sqrt(variance) * sensitivity;
  const markers: BeatMarker[] = [];
  const minGapFrames = 10;
  for (let index = 1; index < energies.length - 1; index += 1) {
    const value = energies[index];
    const previous = energies[index - 1];
    const next = energies[index + 1];
    if (value < threshold || value <= previous || value < next) continue;
    const frame = Math.round(index * windowSeconds * fps);
    const last = markers[markers.length - 1];
    const strength = Math.max(0.25, Math.min(1, value / Math.max(threshold, 0.0001)));
    if (last && frame - last.frame < minGapFrames) {
      if (strength > last.strength) markers[markers.length - 1] = {id: createBeatId('detected', frame, index), frame, strength, source: 'detected'};
      continue;
    }
    markers.push({id: createBeatId('detected', frame, index), frame, strength, source: 'detected'});
  }
  return markers.slice(0, 500);
};

export const TimelineTracks: React.FC<TimelineTracksProps> = ({
  lyrics,
  setLyrics,
  imageBlocks,
  setImageBlocks,
  selectedId,
  setSelectedId,
  selectedImageId,
  setSelectedImageId,
  currentFrame,
  setCurrentFrame,
  durationInFrames,
  trackCount,
  onDeleteTrack,
  audioUrl,
  beatMarkers,
  onBeatMarkersChange,
  beatSnapEnabled,
  setBeatSnapEnabled,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<DragState | null>(null);
  const imageDragStartRef = useRef<DragState | null>(null);
  const beatDragRef = useRef<BeatDragState | null>(null);
  const tokenBoundaryDragRef = useRef<TokenBoundaryDragState | null>(null);
  const keyframeDragRef = useRef<{blockId: string; keyframeId: string; startFrame: number; startX: number} | null>(null);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [beatSensitivity, setBeatSensitivity] = useState(0.85);
  const [bpm, setBpm] = useState(120);
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
  const frameWidthPct = 100 / durationInFrames;
  const trackIndexes = Array.from({length: trackCount}, (_, index) => index);
  const imageLayerIndexes = Array.from({length: IMAGE_LAYER_COUNT}, (_, index) => index);
  const trackLabel = (trackIndex: number) => TRACK_LABELS[trackIndex] ?? `Track ${trackIndex + 1}`;
  const selectedBeat = beatMarkers.find((marker, index) => markerKey(marker, index) === selectedBeatId);
  const detectedBeatCount = beatMarkers.filter((marker) => marker.source === 'detected').length;
  const manualBeatCount = beatMarkers.filter((marker) => marker.source === 'manual' || marker.source === 'imported').length;
  const gridBeatCount = beatMarkers.filter((marker) => marker.source === 'grid').length;

  useEffect(() => {
    if (!beatMarkers.some((marker) => !marker.id || !marker.source)) return;
    onBeatMarkersChange((prev) => sortBeatMarkers(prev));
  }, [beatMarkers, onBeatMarkersChange]);

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
        if (!cancelled) {
          setWaveform(points);
          const detectedMarkers = detectBeatMarkers(channel, audioBuffer.sampleRate, FPS, beatSensitivity);
          onBeatMarkersChange((prev) =>
            dedupeBeatMarkers([
              ...prev.filter((marker) => marker.source !== 'detected'),
              ...detectedMarkers,
            ])
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWaveform(null);
          onBeatMarkersChange((prev) => prev.filter((marker) => marker.source !== 'detected'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [audioUrl, beatSensitivity, onBeatMarkersChange]);

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

  const imageLayerFromPointer = (clientY: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const y = clientY - rect.top - WAVEFORM_HEIGHT - trackCount * TRACK_HEIGHT;
    return Math.max(0, Math.min(IMAGE_LAYER_COUNT - 1, Math.floor(y / TRACK_HEIGHT)));
  };

  const frameFromPointer = (clientX: number) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = (clientX - rect.left) / Math.max(1, rect.width);
    return Math.max(0, Math.min(durationInFrames, Math.round(pct * durationInFrames)));
  };

  const addBeatMarker = (frame: number, source: NonNullable<BeatMarker['source']> = 'manual', strength = 0.8) => {
    const nextFrame = Math.max(0, Math.min(durationInFrames, Math.round(frame)));
    const marker: BeatMarker = {
      id: createBeatId(source, nextFrame),
      frame: nextFrame,
      strength,
      source,
    };
    onBeatMarkersChange((prev) => dedupeBeatMarkers([...prev, marker]));
    setSelectedBeatId(marker.id ?? null);
  };

  const deleteSelectedBeat = () => {
    if (!selectedBeatId) return;
    onBeatMarkersChange((prev) => prev.filter((marker, index) => markerKey(marker, index) !== selectedBeatId));
    setSelectedBeatId(null);
  };

  const updateSelectedBeatStrength = (strength: number) => {
    if (!selectedBeatId) return;
    const nextStrength = Math.max(0.1, Math.min(1, strength));
    onBeatMarkersChange((prev) =>
      prev.map((marker, index) =>
        markerKey(marker, index) === selectedBeatId
          ? {...marker, strength: nextStrength, source: marker.source ?? 'manual'}
          : marker
      )
    );
  };

  const clearGridBeats = () => {
    onBeatMarkersChange((prev) => prev.filter((marker) => marker.source !== 'grid'));
    if (selectedBeat?.source === 'grid') setSelectedBeatId(null);
  };

  const generateBpmGrid = () => {
    const nextBpm = Math.max(30, Math.min(240, bpm || 120));
    const intervalFrames = Math.max(1, (FPS * 60) / nextBpm);
    const gridMarkers: BeatMarker[] = [];
    for (let frame = 0, index = 0; frame <= durationInFrames; frame += intervalFrames, index += 1) {
      gridMarkers.push({
        id: createBeatId('grid', frame, index),
        frame: Math.round(frame),
        strength: index % 4 === 0 ? 0.85 : 0.55,
        source: 'grid',
      });
    }
    onBeatMarkersChange((prev) => dedupeBeatMarkers([...prev.filter((marker) => marker.source !== 'grid'), ...gridMarkers]));
  };

  const handleWaveformDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    addBeatMarker(frameFromPointer(e.clientX));
  };

  const handleBeatMouseDown = (e: React.MouseEvent, marker: BeatMarker, index: number) => {
    e.stopPropagation();
    const id = markerKey(marker, index);
    setSelectedBeatId(id);
    beatDragRef.current = {
      id,
      startFrame: marker.frame,
      startX: e.clientX,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = beatDragRef.current;
      if (!drag || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaFrames = Math.round(((moveEvent.clientX - drag.startX) / rect.width) * durationInFrames);
      const nextFrame = Math.max(0, Math.min(durationInFrames, drag.startFrame + deltaFrames));
      onBeatMarkersChange((prev) =>
        sortBeatMarkers(prev.map((item, itemIndex) =>
          markerKey(item, itemIndex) === drag.id
            ? {...item, frame: nextFrame, source: item.source ?? 'manual'}
            : item
        ))
      );
    };

    const handleMouseUp = () => {
      beatDragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.lyric-block, .image-block')) return;
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
    setSelectedImageId(null);
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
            const nextStart = snapToBeat(drag.startFrame + deltaFrames, beatMarkers, beatSnapEnabled && !moveEvent.altKey);
            const startFrame = Math.max(0, Math.min(drag.endFrame - 1, nextStart));
            return {
              ...lyric,
              startFrame,
              tokens: scaleTokensToBounds(lyric.tokens, drag.startFrame, drag.endFrame, startFrame, drag.endFrame),
            };
          }

          if (drag.mode === 'resize-end') {
            const nextEnd = snapToBeat(drag.endFrame + deltaFrames, beatMarkers, beatSnapEnabled && !moveEvent.altKey);
            const endFrame = Math.max(drag.startFrame + 1, Math.min(durationInFrames, nextEnd));
            return {
              ...lyric,
              endFrame,
              tokens: scaleTokensToBounds(lyric.tokens, drag.startFrame, drag.endFrame, drag.startFrame, endFrame),
            };
          }

          const snappedStart = snapToBeat(drag.startFrame + deltaFrames, beatMarkers, beatSnapEnabled && !moveEvent.altKey);
          const newStart = Math.max(0, Math.min(durationInFrames - duration, snappedStart));
          const frameOffset = newStart - drag.startFrame;
          return {
            ...lyric,
            startFrame: newStart,
            endFrame: newStart + duration,
            track: nextTrack,
            tokens: fitTokensToBounds(shiftTokens(lyric.tokens, frameOffset), newStart, newStart + duration),
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

  const handleImageBlockMouseDown = (e: React.MouseEvent, block: ImageBlock, mode: DragMode) => {
    e.stopPropagation();
    setSelectedImageId(block.id);
    setSelectedId(null);
    imageDragStartRef.current = {
      id: block.id,
      startFrame: block.startFrame,
      endFrame: block.endFrame,
      track: block.layer,
      startX: e.clientX,
      startY: e.clientY,
      mode,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = imageDragStartRef.current;
      if (!drag) return;
      const deltaFrames = frameDeltaFromPointer(moveEvent.clientX, drag, moveEvent.altKey);
      const duration = drag.endFrame - drag.startFrame;
      const nextLayer = drag.mode === 'move' ? imageLayerFromPointer(moveEvent.clientY) : drag.track;

      setImageBlocks((prev) =>
        prev.map((image) => {
          if (image.id !== drag.id) return image;
          if (drag.mode === 'resize-start') {
            const nextStart = snapToBeat(drag.startFrame + deltaFrames, beatMarkers, beatSnapEnabled && !moveEvent.altKey);
            return {...image, startFrame: Math.max(0, Math.min(drag.endFrame - 1, nextStart))};
          }
          if (drag.mode === 'resize-end') {
            const nextEnd = snapToBeat(drag.endFrame + deltaFrames, beatMarkers, beatSnapEnabled && !moveEvent.altKey);
            return {...image, endFrame: Math.max(drag.startFrame + 1, Math.min(durationInFrames, nextEnd))};
          }
          const snappedStart = snapToBeat(drag.startFrame + deltaFrames, beatMarkers, beatSnapEnabled && !moveEvent.altKey);
          const newStart = Math.max(0, Math.min(durationInFrames - duration, snappedStart));
          return {
            ...image,
            startFrame: newStart,
            endFrame: newStart + duration,
            layer: nextLayer as ImageBlock['layer'],
          };
        })
      );
    };

    const handleMouseUp = () => {
      imageDragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const selectedBlock = lyrics.find((lyric) => lyric.id === selectedId);
  const alignSelectedStartToBeat = () => {
    if (!selectedBlock) return;
    const snappedStart = snapToBeat(selectedBlock.startFrame, beatMarkers, true, true);
    const duration = selectedBlock.endFrame - selectedBlock.startFrame;
    setLyrics((prev) =>
      prev.map((lyric) =>
        lyric.id === selectedBlock.id
          ? {
              ...lyric,
              startFrame: snappedStart,
              endFrame: Math.min(durationInFrames, snappedStart + duration),
              tokens: fitTokensToBounds(
                shiftTokens(lyric.tokens, snappedStart - lyric.startFrame),
                snappedStart,
                Math.min(durationInFrames, snappedStart + duration)
              ),
            }
          : lyric
      )
    );
  };

  const stretchSelectedToBeatSpan = () => {
    if (!selectedBlock || beatMarkers.length === 0) return;
    const start = snapToBeat(selectedBlock.startFrame, beatMarkers, true, true);
    const nextBeat = beatMarkers.find((marker) => marker.frame > start + 4)?.frame ?? Math.min(durationInFrames, start + 30);
    setLyrics((prev) =>
      prev.map((lyric) =>
        lyric.id === selectedBlock.id
          ? {
              ...lyric,
              startFrame: start,
              endFrame: Math.max(start + 1, Math.min(durationInFrames, nextBeat)),
              tokens: scaleTokensToBounds(
                lyric.tokens,
                lyric.startFrame,
                lyric.endFrame,
                start,
                Math.max(start + 1, Math.min(durationInFrames, nextBeat))
              ),
            }
          : lyric
      )
    );
  };

  const alignSelectedStartToBar = () => {
    if (!selectedBlock || beatMarkers.length === 0) return;
    const sorted = sortBeatMarkers(beatMarkers);
    const barMarkers = sorted.filter((_, index) => index % 4 === 0);
    const target = nearestBeatFrame(selectedBlock.startFrame, barMarkers) ?? nearestBeatFrame(selectedBlock.startFrame, sorted);
    if (target === null) return;
    const duration = selectedBlock.endFrame - selectedBlock.startFrame;
    setLyrics((prev) =>
      prev.map((lyric) =>
        lyric.id === selectedBlock.id
          ? {
              ...lyric,
              startFrame: target,
              endFrame: Math.min(durationInFrames, target + duration),
              tokens: fitTokensToBounds(
                shiftTokens(lyric.tokens, target - lyric.startFrame),
                target,
                Math.min(durationInFrames, target + duration)
              ),
            }
          : lyric
      )
    );
  };

  const handleTokenBoundaryMouseDown = (e: React.MouseEvent, block: LyricBlock, token: LyricToken) => {
    e.stopPropagation();
    setSelectedId(block.id);
    const tokens = getLyricTokens(block);
    const tokenIndex = tokens.findIndex((item) => item.id === token.id);
    if (tokenIndex <= 0) return;
    const previousToken = tokens[tokenIndex - 1];
    const currentToken = tokens[tokenIndex];
    const minFrame = Math.max(block.startFrame + 1, previousToken.startFrame + 1);
    const maxFrame = Math.min(block.endFrame - 1, currentToken.endFrame - 1);
    if (minFrame > maxFrame) return;

    tokenBoundaryDragRef.current = {
      blockId: block.id,
      tokenId: currentToken.id,
      previousTokenId: previousToken.id,
      startFrame: currentToken.startFrame,
      startX: e.clientX,
      minFrame,
      maxFrame,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = tokenBoundaryDragRef.current;
      if (!drag || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaFrames = Math.round(((moveEvent.clientX - drag.startX) / rect.width) * durationInFrames);
      const rawFrame = drag.startFrame + deltaFrames;
      const snappedFrame = snapToBeat(rawFrame, beatMarkers, beatSnapEnabled && !moveEvent.altKey);
      const boundaryFrame = Math.max(drag.minFrame, Math.min(drag.maxFrame, snappedFrame));
      setCurrentFrame(boundaryFrame);
      setLyrics((prev) =>
        prev.map((lyric) => {
          if (lyric.id !== drag.blockId) return lyric;
          const nextTokens = getLyricTokens(lyric).map((item) => {
            if (item.id === drag.previousTokenId) return {...item, endFrame: boundaryFrame};
            if (item.id === drag.tokenId) return {...item, startFrame: boundaryFrame};
            return item;
          });
          return {...lyric, tokens: nextTokens};
        })
      );
    };

    const handleMouseUp = () => {
      tokenBoundaryDragRef.current = null;
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
      <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: 8}}>
        <div style={{fontSize: 12, color: '#9ca3af', fontWeight: 800}}>
          歌詞タイムライン
          <span style={{marginLeft: 8, color: beatMarkers.length ? '#67e8f9' : '#64748b'}}>
            {beatMarkers.length ? `${beatMarkers.length} beats` : 'ビート未設定'}
          </span>
          <span style={{marginLeft: 8, color: '#64748b'}}>
            detected {detectedBeatCount} / manual {manualBeatCount} / grid {gridBeatCount}
          </span>
        </div>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: 6, margin: 0, textTransform: 'none', letterSpacing: 0, cursor: 'pointer'}}>
            <input
              type="checkbox"
              checked={beatSnapEnabled}
              onChange={(event) => setBeatSnapEnabled(event.target.checked)}
              style={{width: 14, height: 14}}
            />
            ビート吸着
          </label>
          <label style={{display: 'flex', alignItems: 'center', gap: 6, margin: 0, textTransform: 'none', letterSpacing: 0}}>
            検出感度
            <input
              type="range"
              min="0.45"
              max="1.4"
              step="0.05"
              value={beatSensitivity}
              onChange={(event) => setBeatSensitivity(Number(event.target.value))}
              style={{width: 92}}
            />
          </label>
          <label style={{display: 'flex', alignItems: 'center', gap: 6, margin: 0, textTransform: 'none', letterSpacing: 0}}>
            BPM
            <input
              type="number"
              min="30"
              max="240"
              value={bpm}
              onChange={(event) => setBpm(Number(event.target.value))}
              style={{width: 64, padding: '5px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,.14)', background: '#0f172a', color: '#e5e7eb'}}
            />
          </label>
          <button type="button" onClick={generateBpmGrid} style={{fontSize: 11, padding: '6px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,.12)', background: '#0f766e', color: '#ecfeff', cursor: 'pointer'}}>
            BPMグリッド
          </button>
          <button type="button" onClick={clearGridBeats} disabled={gridBeatCount === 0} style={{fontSize: 11, padding: '6px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,.12)', background: '#111827', color: '#d1d5db', cursor: gridBeatCount ? 'pointer' : 'not-allowed'}}>
            グリッド削除
          </button>
          <button type="button" onClick={() => addBeatMarker(currentFrame)} style={{fontSize: 11, padding: '6px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,.12)', background: '#1d4ed8', color: '#dbeafe', cursor: 'pointer'}}>
            現在位置に拍
          </button>
          <button type="button" onClick={deleteSelectedBeat} disabled={!selectedBeat} style={{fontSize: 11, padding: '6px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,.12)', background: '#111827', color: '#fca5a5', cursor: selectedBeat ? 'pointer' : 'not-allowed'}}>
            選択拍を削除
          </button>
          <label style={{display: 'flex', alignItems: 'center', gap: 6, margin: 0, textTransform: 'none', letterSpacing: 0, opacity: selectedBeat ? 1 : 0.5}}>
            拍強度
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={selectedBeat?.strength ?? 0.5}
              disabled={!selectedBeat}
              onChange={(event) => updateSelectedBeatStrength(Number(event.target.value))}
              style={{width: 86}}
            />
            <span style={{width: 28, color: '#94a3b8', fontSize: 11}}>
              {selectedBeat ? selectedBeat.strength.toFixed(2) : '--'}
            </span>
          </label>
          <button type="button" onClick={alignSelectedStartToBeat} disabled={!selectedBlock || beatMarkers.length === 0} style={{fontSize: 11, padding: '6px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,.12)', background: '#111827', color: '#d1d5db', cursor: selectedBlock && beatMarkers.length ? 'pointer' : 'not-allowed'}}>
            開始を拍へ
          </button>
          <button type="button" onClick={alignSelectedStartToBar} disabled={!selectedBlock || beatMarkers.length === 0} style={{fontSize: 11, padding: '6px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,.12)', background: '#111827', color: '#d1d5db', cursor: selectedBlock && beatMarkers.length ? 'pointer' : 'not-allowed'}}>
            小節頭へ
          </button>
          <button type="button" onClick={stretchSelectedToBeatSpan} disabled={!selectedBlock || beatMarkers.length === 0} style={{fontSize: 11, padding: '6px 9px', borderRadius: 6, border: '1px solid rgba(255,255,255,.12)', background: '#111827', color: '#d1d5db', cursor: selectedBlock && beatMarkers.length ? 'pointer' : 'not-allowed'}}>
            次の検出拍まで
          </button>
        </div>
      </div>
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

        {beatMarkers.map((marker, index) => {
          const id = markerKey(marker, index);
          const selected = selectedBeatId === id;
          const isBarHead = index % 4 === 0;
          return (
            <div
              key={id}
              title={`Beat ${index + 1}: ${marker.frame}f / ${marker.source ?? 'imported'}${selected ? ' / selected' : ''}`}
              onMouseDown={(event) => handleBeatMouseDown(event, marker, index)}
              onDoubleClick={(event) => {
                event.stopPropagation();
                setSelectedBeatId(id);
                onBeatMarkersChange((prev) => prev.filter((item, itemIndex) => markerKey(item, itemIndex) !== id));
              }}
              style={{
                position: 'absolute',
                left: `${marker.frame * frameWidthPct}%`,
                top: 0,
                bottom: 0,
                width: selected ? 5 : marker.strength > 0.75 || isBarHead ? 3 : 2,
                transform: 'translateX(-50%)',
                background: selected
                  ? '#f97316'
                  : isBarHead
                    ? 'rgba(250,204,21,.9)'
                    : marker.source === 'grid'
                      ? 'rgba(168,85,247,.55)'
                      : marker.strength > 0.75
                        ? 'rgba(250,204,21,.8)'
                        : 'rgba(34,211,238,.38)',
                zIndex: selected ? 7 : 4,
                pointerEvents: 'auto',
                cursor: 'ew-resize',
                boxShadow: selected ? '0 0 12px rgba(249,115,22,.75)' : marker.strength > 0.75 || isBarHead ? '0 0 8px rgba(250,204,21,.5)' : undefined,
              }}
            />
          );
        })}

        <div
          onDoubleClick={handleWaveformDoubleClick}
          title="ダブルクリックで手動ビートを追加"
          style={{height: WAVEFORM_HEIGHT, position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,13,20,.9)'}}
        >
          <canvas ref={waveformCanvasRef} style={{width: '100%', height: '100%', display: 'block', opacity: waveform ? 1 : 0.35}} />
          {beatMarkers.slice(0, 120).map((marker, index) => (
            <span
              key={`wave-beat-${index}-${marker.frame}`}
              style={{
                position: 'absolute',
                left: `${marker.frame * frameWidthPct}%`,
                top: 6,
                width: 5,
                height: Math.max(10, marker.strength * 28),
                transform: 'translateX(-50%)',
                borderRadius: 999,
                background: marker.strength > 0.75 ? '#facc15' : '#22d3ee',
                opacity: 0.8,
                pointerEvents: 'none',
              }}
            />
          ))}
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
              {trackLabel(trackIndex)}
            </div>

            {lyrics
              .filter((lyric) => lyric.track === trackIndex)
              .map((block) => {
                const widthPct = ((block.endFrame - block.startFrame) / durationInFrames) * 100;
                const leftPct = (block.startFrame / durationInFrames) * 100;
                const tokens = getLyricTokens(block);
                const blockDuration = Math.max(1, block.endFrame - block.startFrame);

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
                    {tokens.slice(1).map((token) => (
                      <span
                        key={token.id}
                        title={`Token ${token.index + 1}: ${token.text} / ${token.startFrame}f - ドラッグで再同期、Altで1フレーム調整`}
                        onMouseDown={(event) => handleTokenBoundaryMouseDown(event, block, token)}
                        style={{
                          position: 'absolute',
                          left: `${((token.startFrame - block.startFrame) / blockDuration) * 100}%`,
                          top: 1,
                          bottom: 1,
                          width: 10,
                          transform: 'translateX(-50%)',
                          cursor: 'ew-resize',
                          pointerEvents: 'auto',
                          zIndex: 5,
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            bottom: 0,
                            width: selectedId === block.id ? 2 : 1,
                            transform: 'translateX(-50%)',
                            borderRadius: 999,
                            background: selectedId === block.id ? 'rgba(34,211,238,.9)' : 'rgba(255,255,255,.28)',
                            boxShadow: selectedId === block.id ? '0 0 8px rgba(34,211,238,.55)' : undefined,
                          }}
                        />
                      </span>
                    ))}
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

        {imageLayerIndexes.map((layerIndex) => (
          <div
            key={`image-layer-${layerIndex}`}
            style={{
              height: TRACK_HEIGHT,
              borderTop: layerIndex === 0 ? '1px solid rgba(96,165,250,0.24)' : 'none',
              borderBottom: layerIndex < IMAGE_LAYER_COUNT - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              position: 'relative',
              background: layerIndex % 2 === 0 ? 'rgba(37,99,235,.05)' : 'rgba(14,165,233,.04)',
            }}
          >
            <div style={{position: 'absolute', left: 8, top: 9, fontSize: 10, color: 'rgba(191,219,254,.62)', fontWeight: 800, zIndex: 1}}>
              Image {layerIndex + 1}
            </div>
            {imageBlocks
              .filter((image) => image.layer === layerIndex)
              .map((block) => {
                const widthPct = ((block.endFrame - block.startFrame) / durationInFrames) * 100;
                const leftPct = (block.startFrame / durationInFrames) * 100;
                return (
                  <div
                    key={block.id}
                    onMouseDown={(event) => handleImageBlockMouseDown(event, block, 'move')}
                    className="image-block"
                    title="Drag to move / drag edges to trim / Alt for 1-frame adjustment"
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: 5,
                      bottom: 5,
                      minWidth: 18,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '0 10px',
                      boxSizing: 'border-box',
                      borderRadius: 6,
                      border: selectedImageId === block.id ? '1px solid #facc15' : '1px solid rgba(125,211,252,.55)',
                      background: selectedImageId === block.id ? 'linear-gradient(90deg, rgba(14,116,144,.95), rgba(37,99,235,.88))' : 'linear-gradient(90deg, rgba(8,145,178,.85), rgba(30,64,175,.72))',
                      color: '#eff6ff',
                      fontSize: 11,
                      fontWeight: 800,
                      overflow: 'hidden',
                      cursor: 'grab',
                      zIndex: selectedImageId === block.id ? 4 : 3,
                      boxShadow: selectedImageId === block.id ? '0 0 14px rgba(250,204,21,.32)' : undefined,
                    }}
                  >
                    <span
                      onMouseDown={(event) => handleImageBlockMouseDown(event, block, 'resize-start')}
                      style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 2}}
                    />
                    <span style={{pointerEvents: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                      {block.name}
                    </span>
                    <span
                      onMouseDown={(event) => handleImageBlockMouseDown(event, block, 'resize-end')}
                      style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 2}}
                    />
                    {(block.keyframes ?? []).map((keyframe) => (
                      <span
                        key={keyframe.id}
                        title={`${keyframe.property}: ${keyframe.value} @ ${keyframe.frame}f`}
                        style={{
                          position: 'absolute',
                          left: `${((keyframe.frame - block.startFrame) / Math.max(1, block.endFrame - block.startFrame)) * 100}%`,
                          top: 2,
                          width: 8,
                          height: 8,
                          transform: 'translateX(-50%) rotate(45deg)',
                          background: '#fde68a',
                          border: '1px solid rgba(0,0,0,.45)',
                          borderRadius: 2,
                          zIndex: 4,
                          pointerEvents: 'none',
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
