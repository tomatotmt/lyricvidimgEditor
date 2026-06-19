import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

type LyricLine = {
  id: string;
  text: string;
  time: number | null;
};

const formatTime = (seconds: number) => {
  const totalCentiseconds = Math.round(Math.max(0, seconds) * 100);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const whole = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(whole).padStart(2, '0');
  const cc = String(centiseconds).padStart(2, '0');
  return `[${mm}:${ss}.${cc}]`;
};

const parseTimestamp = (value: string) => {
  const match = value.match(/^\[(\d+):(\d{2})(?:[.:](\d{2,3}))?\](.*)$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fractionText = match[3] ?? '0';
  const fraction = Number(fractionText) / (fractionText.length === 3 ? 1000 : 100);
  return {
    time: minutes * 60 + seconds + fraction,
    text: match[4].trim(),
  };
};

const parseLyrics = (source: string): LyricLine[] =>
  source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parsed = parseTimestamp(line);
      return {
        id: `line-${Date.now()}-${index}`,
        text: parsed?.text || line,
        time: parsed?.time ?? null,
      };
    });

const buildLrc = (lines: LyricLine[]) =>
  lines
    .filter((line) => line.text.trim())
    .map((line) => `${line.time === null ? '[--:--.--]' : formatTime(line.time)}${line.text}`)
    .join('\n');

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const App: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const waveformWrapRef = useRef<HTMLDivElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lyricsText, setLyricsText] = useState('夜明けまで走って\n君の声が重なる\n壊れるほど光って\nもう一度、光の中へ');
  const [lines, setLines] = useState<LyricLine[]>(() => parseLyrics('夜明けまで走って\n君の声が重なる\n壊れるほど光って\nもう一度、光の中へ'));
  const [activeIndex, setActiveIndex] = useState(0);
  const [waveform, setWaveform] = useState<number[] | null>(null);
  const [copied, setCopied] = useState(false);
  const lrcOutput = useMemo(() => buildLrc(lines), [lines]);
  const stampedCount = lines.filter((line) => line.time !== null).length;
  const hasUnstampedLines = lines.some((line) => line.time === null);
  const activeLine = lines[activeIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
    };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !waveform) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#08111d';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = 'rgba(34,211,238,.72)';
    ctx.lineWidth = 1;
    const mid = rect.height / 2;
    waveform.forEach((value, index) => {
      const x = (index / Math.max(1, waveform.length - 1)) * rect.width;
      const height = Math.max(1, value * (rect.height / 2 - 6));
      ctx.beginPath();
      ctx.moveTo(x, mid - height);
      ctx.lineTo(x, mid + height);
      ctx.stroke();
    });
  }, [waveform]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === ' ') {
        event.preventDefault();
        void togglePlayback();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        stampCurrentLine();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((value) => Math.max(0, value - 1));
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((value) => Math.min(lines.length - 1, value + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const loadAudioFile = async (file: File) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioName(file.name);
    setWaveform(null);
    const buffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const decoded = await context.decodeAudioData(buffer.slice(0));
    const channel = decoded.getChannelData(0);
    const sampleCount = 1200;
    const points = Array.from({length: sampleCount}, (_, index) => {
      const start = Math.floor((index / sampleCount) * channel.length);
      const end = Math.floor(((index + 1) / sampleCount) * channel.length);
      let peak = 0;
      for (let i = start; i < end; i += 1) peak = Math.max(peak, Math.abs(channel[i] ?? 0));
      return peak;
    });
    setDuration(decoded.duration);
    setWaveform(points);
    await context.close();
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = clamp(time, 0, duration || audio.duration || 0);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const setLineTime = (index: number, time: number | null) => {
    setLines((prev) => prev.map((line, lineIndex) => lineIndex === index ? {...line, time} : line));
  };

  const setLineTimeFromInput = (index: number, value: string) => {
    if (value === '') {
      setLineTime(index, null);
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setLineTime(index, clamp(parsed, 0, duration || Number.MAX_SAFE_INTEGER));
  };

  const stampCurrentLine = () => {
    if (!lines[activeIndex]) return;
    setLineTime(activeIndex, currentTime);
    setActiveIndex((value) => Math.min(lines.length - 1, value + 1));
  };

  const applyLyricsText = () => {
    const nextLines = parseLyrics(lyricsText);
    setLines(nextLines);
    setActiveIndex(0);
  };

  const distributeUnstamped = () => {
    if (lines.length === 0) return;
    const endTime = duration || Math.max(...lines.map((line) => line.time ?? 0), 60);
    setLines((prev) => prev.map((line, index) => ({
      ...line,
      time: line.time ?? (index / Math.max(1, prev.length - 1)) * endTime,
    })));
  };

  const clearTimes = () => {
    setLines((prev) => prev.map((line) => ({...line, time: null})));
    setActiveIndex(0);
  };

  const downloadLrc = () => {
    if (hasUnstampedLines) return;
    const blob = new Blob([`${lrcOutput}\n`], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${audioName.replace(/\.[^.]+$/, '') || 'synced-lyrics'}.lrc`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyLrc = async () => {
    if (hasUnstampedLines) return;
    try {
      await navigator.clipboard.writeText(lrcOutput);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    } catch {
      setCopied(false);
    }
  };

  const updateMarkerFromPointer = (index: number, clientX: number) => {
    const wrap = waveformWrapRef.current;
    if (!wrap || !duration) return;
    const rect = wrap.getBoundingClientRect();
    const time = clamp(((clientX - rect.left) / rect.width) * duration, 0, duration);
    setLineTime(index, time);
    seekTo(time);
  };

  const handleMarkerPointerDown = (event: React.PointerEvent, index: number) => {
    event.stopPropagation();
    setActiveIndex(index);
    updateMarkerFromPointer(index, event.clientX);
    const onMove = (moveEvent: PointerEvent) => updateMarkerFromPointer(index, moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <main className="sync-shell">
      <header className="topbar">
        <div>
          <h1>lrcSyncTool</h1>
          <p>曲を再生しながらEnterで歌い出しを打刻し、時間付きLRCを書き出します。</p>
        </div>
        <span className="app-badge">Standalone LRC app</span>
      </header>

      <section className="setup-grid">
        <label className="file-panel">
          <span>音源ファイル</span>
          <input
            type="file"
            accept="audio/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadAudioFile(file);
            }}
          />
          <strong>{audioName || '未選択'}</strong>
        </label>

        <label className="file-panel">
          <span>歌詞ファイル (.txt / .lrc)</span>
          <input
            type="file"
            accept=".txt,.lrc,text/plain"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              setLyricsText(text);
              const nextLines = parseLyrics(text);
              setLines(nextLines);
              setActiveIndex(0);
            }}
          />
          <strong>{lines.length} lines</strong>
        </label>
      </section>

      <section className="workspace">
        <div className="left-pane">
          <div className="panel player-panel">
            {/* This standalone browser tool is outside Remotion rendering. */}
            {/* eslint-disable-next-line @remotion/warn-native-media-tag */}
            <audio ref={audioRef} src={audioUrl ?? undefined} />
            <div className="transport">
              <button type="button" onClick={() => void togglePlayback()} disabled={!audioUrl}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" onClick={stampCurrentLine} disabled={!activeLine}>
                Stamp Enter
              </button>
              <button type="button" onClick={() => seekTo(currentTime - 1)} disabled={!audioUrl}>-1s</button>
              <button type="button" onClick={() => seekTo(currentTime + 1)} disabled={!audioUrl}>+1s</button>
              <span>{formatTime(currentTime)} / {duration ? formatTime(duration) : '--:--'}</span>
            </div>
            <div
              ref={waveformWrapRef}
              className="waveform-wrap"
              onClick={(event) => updateMarkerFromPointer(activeIndex, event.clientX)}
            >
              <canvas ref={waveformCanvasRef} />
              {!waveform && <div className="waveform-empty">音源を読み込むと波形が表示されます</div>}
              {duration > 0 && (
                <div className="playhead" style={{left: `${(currentTime / duration) * 100}%`}} />
              )}
              {lines.map((line, index) => line.time === null || !duration ? null : (
                <button
                  key={line.id}
                  className={`marker ${index === activeIndex ? 'active' : ''}`}
                  style={{left: `${(line.time / duration) * 100}%`}}
                  title={`${formatTime(line.time)} ${line.text}`}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => handleMarkerPointerDown(event, index)}
                  type="button"
                />
              ))}
            </div>
            <div className="hint-row">
              <span>Space: 再生/停止</span>
              <span>Enter: 現在行を打刻</span>
              <span>↑/↓: 行移動</span>
              <span>波形クリック: 現在行を配置</span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">
              <h2>歌詞入力</h2>
              <button type="button" onClick={applyLyricsText}>行リストへ反映</button>
            </div>
            <textarea
              value={lyricsText}
              onChange={(event) => setLyricsText(event.target.value)}
              placeholder="時間なし歌詞、または既存LRCを貼り付け"
            />
          </div>
        </div>

        <div className="right-pane">
          <div className="panel lines-panel">
            <div className="panel-title">
              <h2>同期行</h2>
              <span>{stampedCount}/{lines.length} stamped</span>
            </div>
            <div className="line-list">
              {lines.map((line, index) => (
                <button
                  key={line.id}
                  className={`line-row ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => {
                    setActiveIndex(index);
                    if (line.time !== null) seekTo(line.time);
                  }}
                  type="button"
                >
                  <span className="line-index">{String(index + 1).padStart(2, '0')}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={line.time ?? ''}
                    placeholder="--"
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setLineTimeFromInput(index, event.target.value)}
                  />
                  <span className="line-text">{line.text}</span>
                  <span className="line-time">{line.time === null ? '未打刻' : formatTime(line.time)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel output-panel">
            <div className="panel-title">
              <h2>LRC出力</h2>
              {hasUnstampedLines && <span className="output-warning">未打刻行があります</span>}
              <div className="button-cluster">
                <button type="button" onClick={distributeUnstamped}>未打刻を均等配置</button>
                <button type="button" onClick={clearTimes}>時刻クリア</button>
                <button type="button" onClick={() => void copyLrc()} disabled={hasUnstampedLines}>{copied ? 'Copied' : 'コピー'}</button>
                <button type="button" onClick={downloadLrc} disabled={hasUnstampedLines}>LRC保存</button>
              </div>
            </div>
            <textarea readOnly value={lrcOutput} />
          </div>
        </div>
      </section>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
