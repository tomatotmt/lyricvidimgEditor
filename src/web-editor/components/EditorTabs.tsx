import React, {useEffect, useRef, useState} from 'react';
import {Player} from '@remotion/player';
import {
  COLOR_PALETTE,
  EFFECT_OPTIONS,
  FONT_OPTIONS,
  GlobalSettings,
  LyricBlock,
  LyricKeyframeProperty,
  TEXT_EFFECT_OPTIONS,
  THREE_TEXT_EFFECT_OPTIONS,
} from '../types';
import {
  buildAnimatedStyle,
  getDisplayEffectAnimation,
  getTextEffectAnimation,
} from '../effects';
import {LyricComposition} from './LyricComposition';

interface EditorTabsProps {
  lyrics: LyricBlock[];
  setLyrics: React.Dispatch<React.SetStateAction<LyricBlock[]>>;
  selectedId: string | null;
  globalSettings: GlobalSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  audioFile: {name: string; url: string; duration?: number} | null;
  setAudioFile: (file: {name: string; url: string; duration?: number} | null) => void;
  durationInFrames: number;
  currentFrame: number;
  trackCount: number;
  setTrackCount: React.Dispatch<React.SetStateAction<number>>;
  activeTab: 'edit' | 'input' | 'output' | 'help';
  setActiveTab: (tab: 'edit' | 'input' | 'output' | 'help') => void;
  onAddLyric: () => void;
  onDeleteLyric: () => void;
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.08)',
  paddingTop: 12,
};

const buttonStyle: React.CSSProperties = {
  padding: 10,
  border: 'none',
  borderRadius: 8,
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
};

type ExportStatus = {
  kind: 'idle' | 'rendering' | 'done' | 'error';
  message: string;
};

type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<FileSystemFileHandle>;

type WritableFile = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

type FileSystemFileHandle = {
  createWritable: () => Promise<WritableFile>;
};

const hasSaveFilePicker = (value: Window): value is Window & {showSaveFilePicker: SaveFilePicker} =>
  'showSaveFilePicker' in value;

const KEYFRAME_PROPERTIES: Array<{value: LyricKeyframeProperty; label: string; type: 'number' | 'color' | 'text'}> = [
  {value: 'x', label: 'X位置', type: 'number'},
  {value: 'y', label: 'Y位置', type: 'number'},
  {value: 'scale', label: '倍率', type: 'number'},
  {value: 'rotation', label: '角度', type: 'number'},
  {value: 'textColor', label: '文字色', type: 'color'},
  {value: 'textBackgroundColor', label: '文字背景色', type: 'color'},
  {value: 'outlineColor', label: '枠線色', type: 'color'},
  {value: 'outlineWidth', label: '枠線幅', type: 'number'},
  {value: 'effectIntensity', label: 'エフェクト強度', type: 'number'},
  {value: 'effectStartFrame', label: 'エフェクト開始', type: 'number'},
  {value: 'effectEndFrame', label: 'エフェクト終了', type: 'number'},
  {value: 'effectSpeed', label: '表示速度', type: 'number'},
];

const keyframeLabel = (property: LyricKeyframeProperty | undefined) =>
  KEYFRAME_PROPERTIES.find((item) => item.value === property)?.label ?? property ?? '設定';

const numericKeyframes = new Set<LyricKeyframeProperty>([
  'x',
  'y',
  'scale',
  'rotation',
  'outlineWidth',
  'effectIntensity',
  'effectStartFrame',
  'effectEndFrame',
  'effectSpeed',
]);

const EffectPreview: React.FC<{
  effect: string;
  kind: 'effect' | 'textEffect';
}> = ({effect, kind}) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setFrame((value) => (value + 1) % 90), 33);
    return () => window.clearInterval(id);
  }, []);

  const context = {
    frame,
    startFrame: 0,
    endFrame: 90,
    speed: 5,
    intensity: 6,
  };
  const isThreePreview =
    kind === 'textEffect' && THREE_TEXT_EFFECT_OPTIONS.includes(effect as (typeof THREE_TEXT_EFFECT_OPTIONS)[number]);
  const previewLyric: LyricBlock = {
    id: `preview-${effect}`,
    text: 'テスト',
    track: 0,
    startFrame: 0,
    endFrame: 90,
    scale: isThreePreview ? 0.72 : 1,
    x: 0,
    y: 0,
    rotation: 0,
    effect: kind === 'effect' ? effect : 'None',
    effectIntensity: 6,
    effectStartFrame: 0,
    effectEndFrame: 90,
    font: 'Noto Sans JP',
    textEffect: kind === 'textEffect' ? effect : 'None',
    effectSpeed: 5,
    textColor: '#ffffff',
    textBackgroundColor: 'transparent',
    outlineColor: '#000000',
    outlineWidth: 2,
  };
  const previewSettings: GlobalSettings = {
    font: 'Noto Sans JP',
    textEffect: 'None',
    effectSpeed: 5,
    textColor: '#ffffff',
    backgroundColor: '#05070b',
    outlineColor: '#000000',
    textBackgroundColor: 'transparent',
    outlineWidth: 2,
  };
  const animation =
    isThreePreview
      ? null
      : kind === 'effect'
      ? getDisplayEffectAnimation(effect, context, '#ffffff')
      : getTextEffectAnimation(effect, context, 'テスト');
  const style = animation ? buildAnimatedStyle(animation, '', '0 0 10px rgba(0,0,0,.6)', '#ffffff') : {};

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        height: isThreePreview ? 96 : 54,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 8,
        background: '#05070b',
        marginBottom: 8,
      }}
    >
      {isThreePreview ? (
        <Player
          component={LyricComposition}
          inputProps={{lyrics: [previewLyric], globalSettings: previewSettings}}
          durationInFrames={90}
          fps={30}
          compositionWidth={640}
          compositionHeight={220}
          autoPlay
          loop
          initiallyMuted
          controls={false}
          acknowledgeRemotionLicense
          style={{width: '100%', height: '100%'}}
        />
      ) : (
        <span
          style={{
            display: 'inline-block',
            fontSize: 24,
            fontWeight: 900,
            transformOrigin: 'center',
            ...style,
          }}
        >
          {animation?.text ?? 'テスト'}
        </span>
      )}
    </div>
  );
};

const EffectPicker: React.FC<{
  label: string;
  value: string;
  options: readonly string[];
  kind: 'effect' | 'textEffect';
  onChange: (value: string) => void;
}> = ({label, value, options, kind, onChange}) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(value);

  return (
    <div style={fieldStyle}>
      <label>{label}</label>
      <button
        type="button"
        onClick={() => {
          setHovered(value);
          setOpen((current) => !current);
        }}
        style={{
          width: '100%',
          padding: '9px 10px',
          borderRadius: 8,
          border: '1px solid #374151',
          background: '#111827',
          color: '#f3f4f6',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {value}
      </button>
      {open && (
        <div
          style={{
            border: '1px solid #374151',
            borderRadius: 8,
            background: '#0b1020',
            padding: 8,
            boxShadow: '0 12px 28px rgba(0,0,0,.35)',
          }}
        >
          <EffectPreview effect={hovered || value} kind={kind} />
          <div style={{maxHeight: 260, overflowY: 'auto', paddingRight: 2}}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onMouseEnter={() => setHovered(option)}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 6,
                  background: option === value ? '#2563eb' : 'transparent',
                  color: option === value ? '#ffffff' : '#d1d5db',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const EditorTabs: React.FC<EditorTabsProps> = ({
  lyrics,
  setLyrics,
  selectedId,
  globalSettings,
  setGlobalSettings,
  audioFile,
  setAudioFile,
  durationInFrames,
  currentFrame,
  trackCount,
  setTrackCount,
  activeTab,
  setActiveTab,
  onAddLyric,
  onDeleteLyric,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const selectedBlock = lyrics.find((lyric) => lyric.id === selectedId);
  const [keyframeProperty, setKeyframeProperty] = useState<LyricKeyframeProperty>('x');
  const [keyframeValue, setKeyframeValue] = useState('');
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    kind: 'idle',
    message: '透明背景のProRes 4444 MOVを書き出します。',
  });

  const updateSelectedBlock = (updates: Partial<LyricBlock>) => {
    if (!selectedId) return;
    setLyrics((prev) => prev.map((lyric) => (lyric.id === selectedId ? {...lyric, ...updates} : lyric)));
  };

  useEffect(() => {
    if (!selectedBlock) return;
    const value = selectedBlock[keyframeProperty] ?? (keyframeProperty === 'textBackgroundColor' ? 'transparent' : '');
    setKeyframeValue(String(value));
  }, [keyframeProperty, selectedBlock?.id]);

  const addKeyframe = (property: LyricKeyframeProperty, value: string | number, frame = currentFrame) => {
    if (!selectedBlock) return;
    const normalizedValue = numericKeyframes.has(property) ? Number(value) : String(value);
    const nextKeyframe = {
      id: `kf-${Date.now()}`,
      frame,
      property,
      value: normalizedValue,
    };
    const keyframes = [
      ...(selectedBlock.keyframes ?? []).filter((keyframe) => !(keyframe.frame === frame && keyframe.property === property)),
      nextKeyframe,
    ]
      .sort((a, b) => a.frame - b.frame);
    updateSelectedBlock({keyframes});
  };

  const addSelectedKeyframe = () => addKeyframe(keyframeProperty, keyframeValue || selectedBlock?.[keyframeProperty] || 0);

  const addKeyframes = (property: LyricKeyframeProperty, value: string | number, frames: number[]) => {
    if (!selectedBlock) return;
    const normalizedValue = numericKeyframes.has(property) ? Number(value) : String(value);
    const uniqueFrames = [...new Set(frames)];
    updateSelectedBlock({
      keyframes: [
        ...(selectedBlock.keyframes ?? []).filter(
          (keyframe) => !(keyframe.property === property && uniqueFrames.includes(keyframe.frame))
        ),
        ...uniqueFrames.map((frame) => ({id: `kf-${Date.now()}-${property}-${frame}`, frame, property, value: normalizedValue})),
      ].sort((a, b) => a.frame - b.frame),
    });
  };

  const addPlacementKeyframe = () => {
    if (!selectedBlock) return;
    const frames = [
      ['x', selectedBlock.x],
      ['y', selectedBlock.y],
      ['scale', selectedBlock.scale],
      ['rotation', selectedBlock.rotation ?? 0],
    ] as const;
    updateSelectedBlock({
      keyframes: [
        ...(selectedBlock.keyframes ?? []).filter(
          (keyframe) => !(keyframe.frame === currentFrame && frames.some(([property]) => property === keyframe.property))
        ),
        ...frames.map(([property, value]) => ({id: `kf-${Date.now()}-${property}`, frame: currentFrame, property, value})),
      ].sort((a, b) => a.frame - b.frame),
    });
  };

  const addColorKeyframe = () => {
    if (!selectedBlock) return;
    const frames = [
      ['textColor', selectedBlock.textColor || globalSettings.textColor],
      ['textBackgroundColor', selectedBlock.textBackgroundColor ?? globalSettings.textBackgroundColor ?? 'transparent'],
      ['outlineColor', selectedBlock.outlineColor ?? globalSettings.outlineColor],
      ['outlineWidth', selectedBlock.outlineWidth ?? globalSettings.outlineWidth ?? 2],
    ] as const;
    updateSelectedBlock({
      keyframes: [
        ...(selectedBlock.keyframes ?? []).filter(
          (keyframe) => !(keyframe.frame === currentFrame && frames.some(([property]) => property === keyframe.property))
        ),
        ...frames.map(([property, value]) => ({id: `kf-${Date.now()}-${property}`, frame: currentFrame, property, value})),
      ].sort((a, b) => a.frame - b.frame),
    });
  };

  const updateKeyframe = (id: string, updates: Partial<NonNullable<LyricBlock['keyframes']>[number]>) => {
    if (!selectedBlock) return;
    updateSelectedBlock({
      keyframes: (selectedBlock.keyframes ?? [])
        .map((keyframe) => (keyframe.id === id ? {...keyframe, ...updates} : keyframe))
        .sort((a, b) => a.frame - b.frame),
    });
  };

  const deleteKeyframe = (id: string) => {
    if (!selectedBlock) return;
    updateSelectedBlock({keyframes: (selectedBlock.keyframes ?? []).filter((keyframe) => keyframe.id !== id)});
  };

  const handleLrcImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = String(event.target?.result ?? '').split('\n');
        const parsedLyrics: LyricBlock[] = [];

      lines.forEach((line, index) => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (!match) return;
        const min = Number(match[1]);
        const sec = Number(match[2]);
        const ms = Number(match[3]);
        const content = match[4].trim();
        if (!content) return;

        const timeInSec = min * 60 + sec + ms / (ms > 99 ? 1000 : 100);
        const startFrame = Math.round(timeInSec * 30);
        parsedLyrics.push({
          id: `lrc-${index}`,
          text: content,
          track: parsedLyrics.length,
          startFrame,
          endFrame: startFrame + 90,
          scale: 1,
          x: 0,
          y: 0,
          rotation: 0,
          effect: 'None',
          effectIntensity: 5,
          effectStartFrame: startFrame,
          effectEndFrame: startFrame + 45,
          font: globalSettings.font,
          textEffect: globalSettings.textEffect,
          effectSpeed: globalSettings.effectSpeed,
          textColor: globalSettings.textColor,
          textBackgroundColor: globalSettings.textBackgroundColor ?? 'transparent',
          outlineColor: globalSettings.outlineColor,
          outlineWidth: globalSettings.outlineWidth ?? 2,
        });
      });

      if (parsedLyrics.length > 0) {
        setLyrics(parsedLyrics);
        setTrackCount(Math.max(10, parsedLyrics.length));
      }
    };
    reader.readAsText(file);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setAudioFile({name: file.name, url, duration: Number.isFinite(audio.duration) ? audio.duration : undefined});
    };
    audio.onerror = () => {
      setAudioFile({name: file.name, url});
    };
  };

  const exportProjectJson = () => {
    const blob = new Blob([JSON.stringify({lyrics, globalSettings, trackCount}, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lyric-project.json';
    a.click();
  };

  const importProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result ?? '{}'));
        if (Array.isArray(parsed.lyrics)) setLyrics(parsed.lyrics);
        if (parsed.globalSettings) setGlobalSettings(parsed.globalSettings);
        if (Number.isFinite(parsed.trackCount)) {
          setTrackCount(Math.max(10, Number(parsed.trackCount)));
        } else if (Array.isArray(parsed.lyrics)) {
          setTrackCount(Math.max(10, ...parsed.lyrics.map((lyric: LyricBlock) => Number(lyric.track ?? 0) + 1)));
        }
      } catch {
        alert('Invalid JSON project data');
      }
    };
    reader.readAsText(file);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportMov = async () => {
    const filename = 'transparent_video.mov';
    let fileHandle: FileSystemFileHandle | null = null;

    try {
      if (hasSaveFilePicker(window)) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'QuickTime MOV',
              accept: {'video/quicktime': ['.mov']},
            },
          ],
        });
      }

      setExportStatus({kind: 'rendering', message: 'レンダリング中です。長めの動画では数分かかることがあります。'});
      const response = await fetch('/api/export/mov', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          lyrics,
          globalSettings,
          durationInFrames,
          fps: 30,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({error: 'MOV出力に失敗しました。'}));
        throw new Error(String(error.error ?? 'MOV出力に失敗しました。'));
      }

      const blob = await response.blob();
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        downloadBlob(blob, filename);
      }
      setExportStatus({kind: 'done', message: 'MOV出力が完了しました。'});
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setExportStatus({kind: 'idle', message: '出力をキャンセルしました。'});
        return;
      }
      setExportStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'MOV出力に失敗しました。',
      });
    }
  };

  return (
    <div className="panel" style={{height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 16}}>
        {(['edit', 'input', 'output', 'help'] as const).map((tab) => (
          <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'edit' ? '編集' : tab === 'input' ? '入力・共通' : tab === 'output' ? '出力' : '使い方'}
          </button>
        ))}
      </div>

      <div style={{flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16}}>
        {activeTab === 'edit' && selectedBlock && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <div style={fieldStyle}>
              <label>歌詞テキスト</label>
              <input type="text" value={selectedBlock.text} onChange={(e) => updateSelectedBlock({text: e.target.value})} />
            </div>

            <div style={{display: 'flex', gap: 12}}>
              <button onClick={onAddLyric} style={{...buttonStyle, flex: 1, background: '#3b82f6'}}>+ 追加</button>
              <button onClick={onDeleteLyric} style={{...buttonStyle, flex: 1, background: '#ef4444'}}>削除</button>
            </div>

            <div style={sectionStyle}>
              <h4>配置</h4>
              <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                  <div style={fieldStyle}>
                    <label>開始フレーム</label>
                    <input type="number" value={selectedBlock.startFrame} onChange={(e) => updateSelectedBlock({startFrame: Math.max(0, Number(e.target.value) || 0)})} />
                  </div>
                  <div style={fieldStyle}>
                    <label>終了フレーム</label>
                    <input type="number" value={selectedBlock.endFrame} onChange={(e) => updateSelectedBlock({endFrame: Math.max(selectedBlock.startFrame + 1, Number(e.target.value) || selectedBlock.startFrame + 1)})} />
                  </div>
                </div>
                <label>倍率: {selectedBlock.scale.toFixed(1)}x</label>
                <input type="range" min="0.5" max="3" step="0.1" value={selectedBlock.scale} onChange={(e) => updateSelectedBlock({scale: Number(e.target.value)})} />
                <label>X位置: {selectedBlock.x}px</label>
                <input type="range" min="-500" max="500" step="10" value={selectedBlock.x} onChange={(e) => updateSelectedBlock({x: Number(e.target.value)})} />
                <label>Y位置: {selectedBlock.y}px</label>
                <input type="range" min="-500" max="500" step="10" value={selectedBlock.y} onChange={(e) => updateSelectedBlock({y: Number(e.target.value)})} />
                <label>角度: {Math.round(selectedBlock.rotation ?? 0)}°</label>
                <input type="range" min="-180" max="180" step="1" value={selectedBlock.rotation ?? 0} onChange={(e) => updateSelectedBlock({rotation: Number(e.target.value)})} />
                <div style={{borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10}}>
                  <h4 style={{margin: 0}}>倍率・XYのフレーム設定</h4>
                  <button
                    type="button"
                    onClick={addPlacementKeyframe}
                    style={{...buttonStyle, width: '100%', background: '#2563eb'}}
                  >
                    現在のフレームに倍率・XY・角度を追加 ({currentFrame}f)
                  </button>
                  {(selectedBlock.keyframes ?? []).filter((keyframe) => ['x', 'y', 'scale', 'rotation'].includes(String(keyframe.property))).map((keyframe) => (
                    <div
                      key={`placement-${keyframe.id}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr',
                        gap: 8,
                        padding: 10,
                        border: '1px solid rgba(255,255,255,.08)',
                        borderRadius: 8,
                        background: '#05070b',
                      }}
                    >
                      <div style={fieldStyle}>
                        <label>フレーム</label>
                        <input type="number" value={keyframe.frame} onChange={(e) => updateKeyframe(keyframe.id, {frame: Number(e.target.value) || 0})} />
                      </div>
                      <div style={fieldStyle}>
                        <label>{keyframeLabel(keyframe.property)}</label>
                        <input type="number" step={keyframe.property === 'scale' ? '0.1' : '1'} value={Number(keyframe.value ?? 0)} onChange={(e) => updateKeyframe(keyframe.id, {value: Number(e.target.value) || 0})} />
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteKeyframe(keyframe.id)}
                        style={{...buttonStyle, gridColumn: '1 / -1', padding: 8, background: '#ef4444'}}
                      >
                        このフレーム設定を削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h4>色のフレーム設定</h4>
              <button
                type="button"
                onClick={addColorKeyframe}
                style={{...buttonStyle, width: '100%', background: '#2563eb'}}
              >
                現在のフレームに色・枠線幅を追加 ({currentFrame}f)
              </button>
              <div style={{display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10}}>
                {(selectedBlock.keyframes ?? []).length === 0 && (
                  <div style={{fontSize: 12, color: '#9ca3af'}}>
                    文字色/文字背景色/枠線色/枠線幅をフレームごとに登録できます。
                  </div>
                )}
                {(selectedBlock.keyframes ?? []).filter((keyframe) => ['textColor', 'textBackgroundColor', 'outlineColor', 'outlineWidth'].includes(String(keyframe.property))).map((keyframe) => (
                  <div
                    key={`color-${keyframe.id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 8,
                      padding: 10,
                      border: '1px solid rgba(255,255,255,.08)',
                      borderRadius: 8,
                      background: '#05070b',
                    }}
                  >
                    <div style={fieldStyle}>
                      <label>フレーム</label>
                      <input type="number" value={keyframe.frame} onChange={(e) => updateKeyframe(keyframe.id, {frame: Number(e.target.value) || 0})} />
                    </div>
                    <div style={fieldStyle}>
                      <label>{keyframeLabel(keyframe.property)}</label>
                      {keyframe.property === 'outlineWidth' ? (
                        <input type="number" min="0" max="12" value={Number(keyframe.value ?? 0)} onChange={(e) => updateKeyframe(keyframe.id, {value: Number(e.target.value) || 0})} />
                      ) : (
                        <input
                          type="color"
                          value={String(keyframe.value ?? '#000000') !== 'transparent' ? String(keyframe.value ?? '#000000') : '#000000'}
                          onChange={(e) => updateKeyframe(keyframe.id, {value: e.target.value})}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateKeyframe(keyframe.id, {value: 'transparent'})}
                      disabled={!['textBackgroundColor', 'outlineColor'].includes(String(keyframe.property))}
                      style={{...buttonStyle, padding: 8, background: '#374151'}}
                    >
                      透明
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteKeyframe(keyframe.id)}
                      style={{...buttonStyle, gridColumn: '1 / -1', padding: 8, background: '#ef4444'}}
                    >
                      このフレーム設定を削除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <h4>キーフレーム</h4>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                <div style={fieldStyle}>
                  <label>変更項目</label>
                  <select value={keyframeProperty} onChange={(e) => setKeyframeProperty(e.target.value as LyricKeyframeProperty)}>
                    {KEYFRAME_PROPERTIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label>値</label>
                  <input
                    type={KEYFRAME_PROPERTIES.find((item) => item.value === keyframeProperty)?.type === 'color' && keyframeValue !== 'transparent' ? 'color' : 'text'}
                    value={keyframeValue}
                    onChange={(e) => setKeyframeValue(e.target.value)}
                  />
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10}}>
                <button type="button" onClick={addSelectedKeyframe} style={{...buttonStyle, background: '#2563eb'}}>
                  現在フレームに追加
                </button>
                <button
                  type="button"
                  onClick={() => addKeyframes(keyframeProperty, keyframeValue || 0, [selectedBlock.startFrame, selectedBlock.endFrame])}
                  style={{...buttonStyle, background: '#f59e0b'}}
                >
                  開始/終了に追加
                </button>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10}}>
                {(selectedBlock.keyframes ?? []).filter((keyframe) => keyframe.property).length === 0 && (
                  <div style={{fontSize: 12, color: '#9ca3af'}}>キーフレームはまだありません。</div>
                )}
                {(selectedBlock.keyframes ?? []).filter((keyframe) => keyframe.property).map((keyframe) => (
                  <div key={`generic-${keyframe.id}`} style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', fontSize: 12, color: '#d1d5db'}}>
                    <span>{keyframe.frame}f / {keyframeLabel(keyframe.property)} = {String(keyframe.value ?? '')}</span>
                    <button type="button" onClick={() => deleteKeyframe(keyframe.id)} style={{...buttonStyle, padding: '4px 8px', background: '#ef4444'}}>削除</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={sectionStyle}>
              <h4>エフェクト</h4>
              <EffectPicker label="種類" value={selectedBlock.effect} options={EFFECT_OPTIONS} kind="effect" onChange={(value) => updateSelectedBlock({effect: value})} />
              <label>強度: {selectedBlock.effectIntensity}</label>
              <input type="range" min="0" max="10" step="1" value={selectedBlock.effectIntensity} onChange={(e) => updateSelectedBlock({effectIntensity: Number(e.target.value)})} />
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
                <div style={fieldStyle}>
                  <label>開始</label>
                  <input type="number" value={selectedBlock.effectStartFrame} onChange={(e) => updateSelectedBlock({effectStartFrame: Number(e.target.value) || 0})} />
                </div>
                <div style={fieldStyle}>
                  <label>終了</label>
                  <input type="number" value={selectedBlock.effectEndFrame} onChange={(e) => updateSelectedBlock({effectEndFrame: Number(e.target.value) || 0})} />
                </div>
              </div>
            </div>

            <div style={sectionStyle}>
              <h4>リリック表示</h4>
              <div style={fieldStyle}>
                <label>フォント</label>
                <select value={selectedBlock.font} onChange={(e) => updateSelectedBlock({font: e.target.value})}>
                  {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </div>
              <EffectPicker label="表示エフェクト" value={selectedBlock.textEffect} options={TEXT_EFFECT_OPTIONS} kind="textEffect" onChange={(value) => updateSelectedBlock({textEffect: value})} />
              <label>表示速度: {selectedBlock.effectSpeed}</label>
              <input type="range" min="1" max="10" step="1" value={selectedBlock.effectSpeed} onChange={(e) => updateSelectedBlock({effectSpeed: Number(e.target.value)})} />
              <div style={fieldStyle}>
                <label>文字色</label>
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8}}>
                  {COLOR_PALETTE.map((color) => (
                    <button key={color} onClick={() => updateSelectedBlock({textColor: color})} style={{width: 24, height: 24, backgroundColor: color, border: selectedBlock.textColor === color ? '2px solid #3b82f6' : '1px solid #555', borderRadius: 4, cursor: 'pointer'}} />
                  ))}
                </div>
                <input type="text" value={selectedBlock.textColor} onChange={(e) => updateSelectedBlock({textColor: e.target.value})} />
              </div>
              <div style={fieldStyle}>
                <label>文字背景色</label>
                <div style={{display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'center'}}>
                  <input
                    type="color"
                    value={selectedBlock.textBackgroundColor && selectedBlock.textBackgroundColor !== 'transparent' ? selectedBlock.textBackgroundColor : '#000000'}
                    onChange={(e) => updateSelectedBlock({textBackgroundColor: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => updateSelectedBlock({textBackgroundColor: 'transparent'})}
                    style={{...buttonStyle, padding: 8, background: '#374151'}}
                  >
                    透明にする
                  </button>
                </div>
                <input
                  type="text"
                  value={selectedBlock.textBackgroundColor ?? 'transparent'}
                  onChange={(e) => updateSelectedBlock({textBackgroundColor: e.target.value || 'transparent'})}
                />
              </div>
              <div style={fieldStyle}>
                <label>枠線色</label>
                <div style={{display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'center'}}>
                  <input
                    type="color"
                    value={selectedBlock.outlineColor && selectedBlock.outlineColor !== 'transparent' ? selectedBlock.outlineColor : '#000000'}
                    onChange={(e) => updateSelectedBlock({outlineColor: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => updateSelectedBlock({outlineColor: 'transparent'})}
                    style={{...buttonStyle, padding: 8, background: '#374151'}}
                  >
                    透明にする
                  </button>
                </div>
                <input
                  type="text"
                  value={selectedBlock.outlineColor ?? globalSettings.outlineColor}
                  onChange={(e) => updateSelectedBlock({outlineColor: e.target.value || 'transparent'})}
                />
              </div>
              <label>枠線幅: {selectedBlock.outlineWidth ?? globalSettings.outlineWidth ?? 2}px</label>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={selectedBlock.outlineWidth ?? globalSettings.outlineWidth ?? 2}
                onChange={(e) => updateSelectedBlock({outlineWidth: Number(e.target.value)})}
              />
            </div>
          </div>
        )}

        {activeTab === 'edit' && !selectedBlock && (
          <div style={{color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 40}}>
            タイムライン上のリリックブロックを選択してください。
          </div>
        )}

        {activeTab === 'input' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <div style={sectionStyle}>
              <h4>外部ファイル</h4>
              <button onClick={() => fileInputRef.current?.click()} style={{...buttonStyle, width: '100%', background: '#1f2937', border: '1px solid #4b5563'}}>LRCファイルを選択</button>
              <input type="file" ref={fileInputRef} accept=".lrc" onChange={handleLrcImport} style={{display: 'none'}} />
              <button onClick={() => audioInputRef.current?.click()} style={{...buttonStyle, width: '100%', background: '#1f2937', border: '1px solid #4b5563', marginTop: 10}}>音楽ファイルを選択</button>
              <input type="file" ref={audioInputRef} accept="audio/*" onChange={handleAudioUpload} style={{display: 'none'}} />
              {audioFile && <div style={{fontSize: 12, color: '#10b981', marginTop: 6}}>{audioFile.name}</div>}
            </div>

            <div style={sectionStyle}>
              <h4>リリック共通設定</h4>
              <div style={fieldStyle}>
                <label>フォント</label>
                <select value={globalSettings.font} onChange={(e) => setGlobalSettings((prev) => ({...prev, font: e.target.value}))}>
                  {FONT_OPTIONS.map((font) => <option key={font} value={font}>{font}</option>)}
                </select>
              </div>
              <EffectPicker label="表示エフェクト" value={globalSettings.textEffect} options={TEXT_EFFECT_OPTIONS} kind="textEffect" onChange={(value) => setGlobalSettings((prev) => ({...prev, textEffect: value}))} />
              <label>表示速度: {globalSettings.effectSpeed}</label>
              <input type="range" min="1" max="10" step="1" value={globalSettings.effectSpeed} onChange={(e) => setGlobalSettings((prev) => ({...prev, effectSpeed: Number(e.target.value)}))} />
              <div style={fieldStyle}>
                <label>文字色</label>
                <input type="color" value={globalSettings.textColor} onChange={(e) => setGlobalSettings((prev) => ({...prev, textColor: e.target.value}))} />
              </div>
              <div style={fieldStyle}>
                <label>動画背景色</label>
                <input type="color" value={globalSettings.backgroundColor} onChange={(e) => setGlobalSettings((prev) => ({...prev, backgroundColor: e.target.value}))} />
              </div>
              <div style={fieldStyle}>
                <label>文字背景色</label>
                <div style={{display: 'grid', gridTemplateColumns: '44px 1fr', gap: 8, alignItems: 'center'}}>
                  <input
                    type="color"
                    value={globalSettings.textBackgroundColor && globalSettings.textBackgroundColor !== 'transparent' ? globalSettings.textBackgroundColor : '#000000'}
                    onChange={(e) => setGlobalSettings((prev) => ({...prev, textBackgroundColor: e.target.value}))}
                  />
                  <button
                    type="button"
                    onClick={() => setGlobalSettings((prev) => ({...prev, textBackgroundColor: 'transparent'}))}
                    style={{...buttonStyle, padding: 8, background: '#374151'}}
                  >
                    透明にする
                  </button>
                </div>
              </div>
              <div style={fieldStyle}>
                <label>枠線色</label>
                <input type="color" value={globalSettings.outlineColor} onChange={(e) => setGlobalSettings((prev) => ({...prev, outlineColor: e.target.value}))} />
              </div>
              <label>枠線幅: {globalSettings.outlineWidth ?? 2}px</label>
              <input type="range" min="0" max="12" step="1" value={globalSettings.outlineWidth ?? 2} onChange={(e) => setGlobalSettings((prev) => ({...prev, outlineWidth: Number(e.target.value)}))} />
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
              <button onClick={exportProjectJson} style={{...buttonStyle, background: '#10b981'}}>データ出力</button>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (event) => importProjectJson(event as unknown as React.ChangeEvent<HTMLInputElement>);
                  input.click();
                }}
                style={{...buttonStyle, background: '#f59e0b'}}
              >
                データ読込
              </button>
            </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <h4>動画エクスポート</h4>
            <p style={{fontSize: 12, color: '#9ca3af', lineHeight: 1.5}}>
              透明背景のMOVを書き出します。ブラウザが保存先選択に対応している場合は、ボタンを押したあとに保存先を選べます。
            </p>
            <button
              onClick={exportMov}
              disabled={exportStatus.kind === 'rendering'}
              style={{
                ...buttonStyle,
                background: exportStatus.kind === 'rendering' ? '#374151' : '#10b981',
                cursor: exportStatus.kind === 'rendering' ? 'wait' : 'pointer',
              }}
            >
              {exportStatus.kind === 'rendering' ? '出力中...' : 'MOVを書き出す'}
            </button>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: '#05070b',
                color: exportStatus.kind === 'error' ? '#fca5a5' : exportStatus.kind === 'done' ? '#86efac' : '#9ca3af',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {exportStatus.message}
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 16, color: '#d1d5db', fontSize: 13, lineHeight: 1.7}}>
            <div>
              <h4>基本の流れ</h4>
              <ol style={{paddingLeft: 20, margin: 0}}>
                <li>入力・共通で音楽ファイル、LRCファイル、またはプロジェクトJSONを読み込みます。</li>
                <li>タイムラインで歌詞ブロックを選択します。</li>
                <li>編集で文字、開始/終了、位置、倍率、角度、色、枠線、エフェクトを調整します。</li>
                <li>動きを付けたい項目はキーフレームに登録します。</li>
                <li>出力から透明背景のMOVを書き出します。</li>
              </ol>
            </div>
            <div style={sectionStyle}>
              <h4>タイムライン</h4>
              <p>ブロック本体をドラッグすると開始位置を移動できます。上下にドラッグするとトラックを移動できます。</p>
              <p>ブロックの左右端をドラッグすると開始フレーム/終了フレームを調整できます。Altを押しながら操作すると1フレーム単位になります。</p>
              <p>キーフレームがあるフレームには菱形マーカーが表示され、左右へドラッグしてフレーム位置を調整できます。</p>
            </div>
            <div style={sectionStyle}>
              <h4>キーフレーム</h4>
              <p>変更項目を選び、現在のフレームに値を追加すると、その項目だけが時間に沿って変化します。</p>
              <p>X位置、Y位置、倍率、角度、文字色、文字背景色、枠線色、枠線幅、エフェクト強度、エフェクト開始/終了、表示速度を登録できます。</p>
              <p>数値はフレーム間でなめらかに補間されます。色や透明指定は直前のキーフレーム値で切り替わります。</p>
            </div>
            <div style={sectionStyle}>
              <h4>ショートカット</h4>
              <p>Ctrl/Cmd+Z: 戻す、Shift+Ctrl/Cmd+Z: やり直し、Space: 再生、←/→: 1フレーム移動、Delete: 選択中の歌詞を削除。</p>
            </div>
            <div style={sectionStyle}>
              <h4>プレビュー</h4>
              <p>文字位置ドラッグをONにすると、選択中の歌詞をプレビュー上で直接動かしてX/Yを調整できます。</p>
              <p>動画背景色を透明にすると、MOV出力でも透明背景として扱われます。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
