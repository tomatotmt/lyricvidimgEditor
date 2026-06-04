import React, {useEffect, useRef, useState} from 'react';
import {
  COLOR_PALETTE,
  EFFECT_OPTIONS,
  FONT_OPTIONS,
  GlobalSettings,
  LyricBlock,
  TEXT_EFFECT_OPTIONS,
  THREE_TEXT_EFFECT_OPTIONS,
} from '../types';
import {
  buildAnimatedStyle,
  getDisplayEffectAnimation,
  getTextEffectAnimation,
  mergeAnimation,
} from '../effects';

interface EditorTabsProps {
  lyrics: LyricBlock[];
  setLyrics: React.Dispatch<React.SetStateAction<LyricBlock[]>>;
  selectedId: string | null;
  globalSettings: GlobalSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  audioFile: {name: string; url: string; duration?: number} | null;
  setAudioFile: (file: {name: string; url: string; duration?: number} | null) => void;
  durationInFrames: number;
  activeTab: 'edit' | 'input' | 'output';
  setActiveTab: (tab: 'edit' | 'input' | 'output') => void;
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
  const animation =
    isThreePreview
      ? {opacity: 1, transformExtra: `perspective(560px) rotateY(${frame * 4}deg) translateZ(${Math.sin(frame * 0.08) * 28}px)`, textShadow: '0 0 18px #67e8f9, 0 0 34px #fb7185'}
      : kind === 'effect'
      ? getDisplayEffectAnimation(effect, context, '#ffffff')
      : getTextEffectAnimation(effect, context, 'テスト');
  const style = buildAnimatedStyle(animation, '', '0 0 10px rgba(0,0,0,.6)', '#ffffff');

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        height: 54,
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
      <span
        style={{
          display: 'inline-block',
          fontSize: 24,
          fontWeight: 900,
          transformOrigin: 'center',
          ...style,
        }}
      >
        {animation.text ?? 'テスト'}
      </span>
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
  activeTab,
  setActiveTab,
  onAddLyric,
  onDeleteLyric,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const selectedBlock = lyrics.find((lyric) => lyric.id === selectedId);

  const updateSelectedBlock = (updates: Partial<LyricBlock>) => {
    if (!selectedId) return;
    setLyrics((prev) => prev.map((lyric) => (lyric.id === selectedId ? {...lyric, ...updates} : lyric)));
  };

  const handleLrcImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = String(event.target?.result ?? '').split('\n');
      const parsedLyrics: LyricBlock[] = [];
      let currentTrack = 0;
      const maxImportTracks = 10;

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
          track: currentTrack,
          startFrame,
          endFrame: startFrame + 90,
          scale: 1,
          x: 0,
          y: 0,
          effect: 'None',
          effectIntensity: 5,
          effectStartFrame: startFrame,
          effectEndFrame: startFrame + 45,
          font: globalSettings.font,
          textEffect: globalSettings.textEffect,
          effectSpeed: globalSettings.effectSpeed,
          textColor: globalSettings.textColor,
        });
        currentTrack = (currentTrack + 1) % maxImportTracks;
      });

      if (parsedLyrics.length > 0) setLyrics(parsedLyrics);
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
    const blob = new Blob([JSON.stringify({lyrics, globalSettings}, null, 2)], {type: 'application/json'});
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
      } catch {
        alert('Invalid JSON project data');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="panel" style={{height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'}}>
      <div style={{display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 16}}>
        {(['edit', 'input', 'output'] as const).map((tab) => (
          <button key={tab} className={`tab-button ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'edit' ? '編集' : tab === 'input' ? '入力・共通' : '出力'}
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
                <label>倍率: {selectedBlock.scale.toFixed(1)}x</label>
                <input type="range" min="0.5" max="3" step="0.1" value={selectedBlock.scale} onChange={(e) => updateSelectedBlock({scale: Number(e.target.value)})} />
                <label>X位置: {selectedBlock.x}px</label>
                <input type="range" min="-500" max="500" step="10" value={selectedBlock.x} onChange={(e) => updateSelectedBlock({x: Number(e.target.value)})} />
                <label>Y位置: {selectedBlock.y}px</label>
                <input type="range" min="-500" max="500" step="10" value={selectedBlock.y} onChange={(e) => updateSelectedBlock({y: Number(e.target.value)})} />
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
                <label>背景色</label>
                <input type="color" value={globalSettings.backgroundColor} onChange={(e) => setGlobalSettings((prev) => ({...prev, backgroundColor: e.target.value}))} />
              </div>
              <div style={fieldStyle}>
                <label>枠線色</label>
                <input type="color" value={globalSettings.outlineColor} onChange={(e) => setGlobalSettings((prev) => ({...prev, outlineColor: e.target.value}))} />
              </div>
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
              Remotionのレンダリングコマンドで透明背景のMOVを書き出します。
            </p>
            <pre style={{margin: 0, fontSize: 11, color: '#10b981', overflowX: 'auto', whiteSpace: 'pre-wrap', background: '#000', padding: 12, borderRadius: 8}}>
              npx remotion render src/index.ts LyricVideo out/transparent_video.mov --codec=prores4444
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
