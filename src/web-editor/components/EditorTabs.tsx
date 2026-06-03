import React, { useRef } from 'react';
import { LyricBlock, GlobalSettings, FONT_OPTIONS, EFFECT_OPTIONS, TEXT_EFFECT_OPTIONS, COLOR_PALETTE } from '../types';

interface EditorTabsProps {
  lyrics: LyricBlock[];
  setLyrics: React.Dispatch<React.SetStateAction<LyricBlock[]>>;
  selectedId: string | null;
  globalSettings: GlobalSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  audioFile: { name: string; url: string } | null;
  setAudioFile: (file: { name: string; url: string } | null) => void;
  durationInFrames: number;
  activeTab: 'edit' | 'input' | 'output';
  setActiveTab: (tab: 'edit' | 'input' | 'output') => void;
  onAddLyric: () => void;
  onDeleteLyric: () => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  lyrics,
  setLyrics,
  selectedId,
  globalSettings,
  setGlobalSettings,
  audioFile,
  setAudioFile,
  durationInFrames,
  activeTab,
  setActiveTab,
  onAddLyric,
  onDeleteLyric
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const selectedBlock = lyrics.find(l => l.id === selectedId);

  const updateSelectedBlock = (updates: Partial<LyricBlock>) => {
    if (!selectedId) return;
    setLyrics(prev => prev.map(l => l.id === selectedId ? { ...l, ...updates } : l));
  };

  const handleLrcImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Simple LRC Parser
      const lines = text.split('\n');
      const parsedLyrics: LyricBlock[] = [];
      let currentTrack = 0;

      lines.forEach((line, idx) => {
        const timeMatch = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (timeMatch) {
          const min = parseInt(timeMatch[1]);
          const sec = parseInt(timeMatch[2]);
          const ms = parseInt(timeMatch[3]);
          const content = timeMatch[4].trim();

          if (content) {
            const timeInSec = min * 60 + sec + ms / (ms > 99 ? 1000 : 100);
            const startFrame = Math.round(timeInSec * 30); // assuming 30 fps
            parsedLyrics.push({
              id: `lrc-${idx}`,
              text: content,
              track: currentTrack,
              startFrame,
              endFrame: startFrame + 90, // default 3 seconds
              scale: 1,
              x: 0,
              y: 0,
              effect: 'Pop',
              effectIntensity: 5,
              effectStartFrame: startFrame,
              effectEndFrame: startFrame + 45,
              font: globalSettings.font,
              textEffect: globalSettings.textEffect,
              effectSpeed: globalSettings.effectSpeed,
              textColor: globalSettings.textColor
            });
            // Alternate tracks to make overlapping clear
            currentTrack = (currentTrack + 1) % 5;
          }
        }
      });

      if (parsedLyrics.length > 0) {
        setLyrics(parsedLyrics);
      }
    };
    reader.readAsText(file);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudioFile({ name: file.name, url });
  };

  const exportProjectJson = () => {
    const data = JSON.stringify({ lyrics, globalSettings }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
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
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.lyrics && Array.isArray(parsed.lyrics)) {
          setLyrics(parsed.lyrics);
        }
        if (parsed.globalSettings) {
          setGlobalSettings(parsed.globalSettings);
        }
      } catch (err) {
        alert('Invalid JSON project data');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {/* Tabs list */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 16 }}>
        <button className={`tab-button ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>
          邱ｨ髮・        </button>
        <button className={`tab-button ${activeTab === 'input' ? 'active' : ''}`} onClick={() => setActiveTab('input')}>
          蜈･蜉帙・蜈ｱ騾・        </button>
        <button className={`tab-button ${activeTab === 'output' ? 'active' : ''}`} onClick={() => setActiveTab('output')}>
          蜃ｺ蜉・        </button>
      </div>

      {/* Tabs content container */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* EDIT TAB */}
        {activeTab === 'edit' && (
          selectedBlock ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label>豁瑚ｩ槭ユ繧ｭ繧ｹ繝・/label>
                <input
                  type="text"
                  value={selectedBlock.text}
                  onChange={(e) => updateSelectedBlock({ text: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={onAddLyric} style={{ flex: 1, padding: '10px', background: '#3b82f6', border: 'none', borderRadius: 8, color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  + 陦瑚ｿｽ蜉
                </button>
                <button onClick={onDeleteLyric} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', borderRadius: 8, color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                  蜑企勁
                </button>
              </div>

              {/* Asset Details */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#f3f4f6' }}>邏譚舌・隧ｳ邏ｰ</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label>蛟咲紫 (Scale): {selectedBlock.scale.toFixed(1)}x</label>
                    <input
                      type="range" min="0.5" max="3" step="0.1" value={selectedBlock.scale}
                      onChange={(e) => updateSelectedBlock({ scale: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label>菴咲ｽｮ X: {selectedBlock.x}px</label>
                      <input
                        type="range" min="-500" max="500" step="10" value={selectedBlock.x}
                        onChange={(e) => updateSelectedBlock({ x: parseInt(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label>菴咲ｽｮ Y: {selectedBlock.y}px</label>
                      <input
                        type="range" min="-500" max="500" step="10" value={selectedBlock.y}
                        onChange={(e) => updateSelectedBlock({ y: parseInt(e.target.value) })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label>髢句ｧ九ヵ繝ｬ繝ｼ繝: {selectedBlock.startFrame}f</label>
                      <input
                        type="number" value={selectedBlock.startFrame}
                        onChange={(e) => updateSelectedBlock({ startFrame: Math.max(0, parseInt(e.target.value) || 0) })}
                      />
                    </div>
                    <div>
                      <label>邨ゆｺ・ヵ繝ｬ繝ｼ繝: {selectedBlock.endFrame}f</label>
                      <input
                        type="number" value={selectedBlock.endFrame}
                        onChange={(e) => updateSelectedBlock({ endFrame: Math.max(selectedBlock.startFrame, parseInt(e.target.value) || 0) })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shared FX */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#f3f4f6' }}>邏譚・繝ｪ繝ｪ繝・け蜈ｱ逕ｨ繧ｨ繝輔ぉ繧ｯ繝・/h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label>繧ｨ繝輔ぉ繧ｯ繝医ｒ驕ｸ謚・/label>
                    <select
                      value={selectedBlock.effect}
                      onChange={(e) => updateSelectedBlock({ effect: e.target.value })}
                    >
                      {EFFECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>繧ｨ繝輔ぉ繧ｯ繝亥ｼｷ蠎ｦ: {selectedBlock.effectIntensity}</label>
                    <input
                      type="range" min="0" max="10" step="1" value={selectedBlock.effectIntensity}
                      onChange={(e) => updateSelectedBlock({ effectIntensity: parseInt(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label>髢句ｧ九ヵ繝ｬ繝ｼ繝: {selectedBlock.effectStartFrame}f</label>
                      <input
                        type="number" value={selectedBlock.effectStartFrame}
                        onChange={(e) => updateSelectedBlock({ effectStartFrame: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label>邨ゆｺ・ヵ繝ｬ繝ｼ繝: {selectedBlock.effectEndFrame}f</label>
                      <input
                        type="number" value={selectedBlock.effectEndFrame}
                        onChange={(e) => updateSelectedBlock({ effectEndFrame: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lyric Custom */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#f3f4f6' }}>繝ｪ繝ｪ繝・け蝗ｺ譛芽ｨｭ螳・/h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label>譁・ｭ励ヵ繧ｩ繝ｳ繝・/label>
                    <select
                      value={selectedBlock.font}
                      onChange={(e) => updateSelectedBlock({ font: e.target.value })}
                    >
                      {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>譁・ｭ苓｡ｨ遉ｺ繧ｨ繝輔ぉ繧ｯ繝・/label>
                    <select
                      value={selectedBlock.textEffect}
                      onChange={(e) => updateSelectedBlock({ textEffect: e.target.value })}
                    >
                      {TEXT_EFFECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>繧ｨ繝輔ぉ繧ｯ繝磯溷ｺｦ: {selectedBlock.effectSpeed}</label>
                    <input
                      type="range" min="1" max="10" step="1" value={selectedBlock.effectSpeed}
                      onChange={(e) => updateSelectedBlock({ effectSpeed: parseInt(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label>譁・ｭ苓牡</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {COLOR_PALETTE.map(c => (
                        <button
                          key={c}
                          onClick={() => updateSelectedBlock({ textColor: c })}
                          style={{ width: 24, height: 24, backgroundColor: c, border: selectedBlock.textColor === c ? '2px solid #3b82f6' : '1px solid #555', borderRadius: 4, cursor: 'pointer' }}
                        />
                      ))}
                    </div>
                    <input
                      type="text" value={selectedBlock.textColor}
                      onChange={(e) => updateSelectedBlock({ textColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
              繧ｿ繧､繝繝ｩ繧､繝ｳ荳翫・繝悶Ο繝・け繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲・            </div>
          )
        )}

        {/* INPUT / COMMON TAB */}
        {activeTab === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* External Files */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#f3f4f6' }}>螟夜Κ繝輔ぃ繧､繝ｫ</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label>豁瑚ｩ槭ヵ繧｡繧､繝ｫ (.lrc) 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ</label>
                  <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: 10, background: '#1f2937', color: 'white', border: '1px solid #4b5563', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                    LRC 繝輔ぃ繧､繝ｫ繧帝∈謚・                  </button>
                  <input type="file" ref={fileInputRef} accept=".lrc" onChange={handleLrcImport} style={{ display: 'none' }} />
                </div>
                <div>
                  <label>髻ｳ讌ｽ繝輔ぃ繧､繝ｫ (.mp3, .wav) 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ</label>
                  <button onClick={() => audioInputRef.current?.click()} style={{ width: '100%', padding: 10, background: '#1f2937', color: 'white', border: '1px solid #4b5563', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                    髻ｳ讌ｽ繝輔ぃ繧､繝ｫ繧帝∈謚・                  </button>
                  <input type="file" ref={audioInputRef} accept="audio/*" onChange={handleAudioUpload} style={{ display: 'none' }} />
                  {audioFile && <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>七 {audioFile.name}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                  <button onClick={exportProjectJson} style={{ padding: 10, background: '#10b981', border: 'none', borderRadius: 8, color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                    繝・・繧ｿ蜃ｺ蜉・                  </button>
                  <button onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => importProjectJson(e as any);
                    input.click();
                  }} style={{ padding: 10, background: '#f59e0b', border: 'none', borderRadius: 8, color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                    繝・・繧ｿ隱ｭ霎ｼ
                  </button>
                </div>
              </div>
            </div>

            {/* Lyric Common Settings */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#f3f4f6' }}>繝ｪ繝ｪ繝・け蜈ｱ騾夊ｨｭ螳・/h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label>譁・ｭ励ヵ繧ｩ繝ｳ繝・/label>
                  <select
                    value={globalSettings.font}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, font: e.target.value }))}
                  >
                    {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label>譁・ｭ苓｡ｨ遉ｺ繧ｨ繝輔ぉ繧ｯ繝・/label>
                  <select
                    value={globalSettings.textEffect}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, textEffect: e.target.value }))}
                  >
                    {TEXT_EFFECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label>繧ｨ繝輔ぉ繧ｯ繝磯溷ｺｦ: {globalSettings.effectSpeed}</label>
                  <input
                    type="range" min="1" max="10" step="1" value={globalSettings.effectSpeed}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, effectSpeed: parseInt(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label>譁・ｭ苓牡</label>
                  <input
                    type="color" value={globalSettings.textColor}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, textColor: e.target.value }))}
                  />
                </div>
                <div>
                  <label>閭梧勹濶ｲ</label>
                  <input
                    type="color" value={globalSettings.backgroundColor}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  />
                </div>
                <div>
                  <label>譫邱壹・濶ｲ</label>
                  <input
                    type="color" value={globalSettings.outlineColor}
                    onChange={(e) => setGlobalSettings(prev => ({ ...prev, outlineColor: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OUTPUT TAB */}
        {activeTab === 'output' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#f3f4f6' }}>蜍慕判繧ｨ繧ｯ繧ｹ繝昴・繝・/h4>
              <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: '1.5' }}>
                閭梧勹縺碁城℃縺輔ｌ縺溽┌蝨ｧ邵ｮ縺ｮMOV繝輔ぃ繧､繝ｫ (ProRes 4444) 縺ｧ譖ｸ縺榊・縺励∪縺吶ゆｻ･荳九・繧ｳ繝槭Φ繝峨ｒ螳溯｡後☆繧九％縺ｨ縺ｧ繝ｭ繝ｼ繧ｫ繝ｫ迺ｰ蠅・〒繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ縺悟庄閭ｽ縺ｧ縺吶・              </p>
              <div style={{ background: '#000', padding: 12, borderRadius: 8, border: '1px solid #333', position: 'relative', marginTop: 12 }}>
                <pre style={{ margin: 0, fontSize: 11, color: '#10b981', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                  npx remotion render src/index.ts LyricVideo out/transparent_video.mov --codec=prores4444
                </pre>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('npx remotion render src/index.ts LyricVideo out/transparent_video.mov --codec=prores4444');
                  alert('繧ｳ繝槭Φ繝峨ｒ繧ｳ繝斐・縺励∪縺励◆・・);
                }}
                style={{ width: '100%', padding: '12px', background: '#3b82f6', border: 'none', borderRadius: 8, color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: 16 }}
              >
                繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ繧ｳ繝槭Φ繝峨ｒ繧ｳ繝斐・
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
