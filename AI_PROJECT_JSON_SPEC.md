# AI Project JSON Spec for lyricvidEditor

この仕様書は、LRCファイルをもとにAIが `lyric-project.json` を生成するためのルールです。

---

## 目的

AIは歌詞の雰囲気、言葉の強さ、サビ/余韻/強調箇所を読み取り、lyricvidEditorで読み込めるJSONを生成します。

ユーザーは生成されたJSONをエディタの `データ読込` から読み込み、最終チェックと微調整を行います。

---

## JSON全体構造

```json
{
  "lyrics": [],
  "globalSettings": {},
  "trackCount": 4,
  "beatMarkers": []
}
```

---

## トラック定義

```txt
track: 0 = Main Lyrics
通常のメイン歌詞。LRCの基本行はここに配置する。

track: 1 = Alt / Overlap
重なり、ハモリ、追いかけ、余韻のある歌詞。

track: 2 = Emphasis
強調語、決め台詞、サビ頭、叫び、印象的な単語。

track: 3 = FX / Accent
短い装飾語、環境音的な言葉、3D/グリッチ/アクセント演出。
```

---

## LyricBlock

各歌詞ブロックは以下の形式にします。

```json
{
  "id": "lrc-001",
  "text": "君の声が響く",
  "track": 0,
  "startFrame": 120,
  "endFrame": 180,
  "scale": 1,
  "x": 0,
  "y": -80,
  "rotation": 0,
  "effect": "Slide",
  "inEffect": "Slide",
  "outEffect": "Blur",
  "effectIntensity": 5,
  "effectStartFrame": 120,
  "effectEndFrame": 180,
  "effectSwitchFrame": 155,
  "fadeInFrames": 8,
  "fadeOutFrames": 10,
  "fadeInPattern": "Linear",
  "fadeOutPattern": "Linear",
  "font": "Noto Sans JP",
  "textEffect": "Karaoke Sweep",
  "effectSpeed": 6,
  "textColor": "#ffffff",
  "textBackgroundColor": "transparent",
  "outlineColor": "#000000",
  "outlineWidth": 2,
  "tokenMode": "mora",
  "tokens": [],
  "keyframes": []
}
```

---

## 必須フィールド

```txt
id
text
track
startFrame
endFrame
scale
x
y
effect
inEffect
outEffect
effectIntensity
effectStartFrame
effectEndFrame
font
textEffect
effectSpeed
textColor
outlineColor
outlineWidth
```

---

## tokenMode

```txt
auto
基本指定。空白があれば単語寄り、空白なし日本語はモーラ寄り。

word
英語、スペース区切り日本語、ラップ、区切りを強く見せたい歌詞。

mora
日本語の歌唱感、バラード、カラオケ風の追従。

char
グリッチ、タイプライター、文字単位の細かい演出。
```

AI生成時は基本 `auto` または `mora` を使います。

---

## エフェクトフェーズ

```txt
inEffect
登場エフェクト。歌詞が出る時の動き。

textEffect
歌唱中エフェクト。歌詞が表示されている間の文字演出。

outEffect
退場エフェクト。歌詞が消える時の動き。
```

---

## 推奨エフェクト選択

### 静か・余韻・切ない

```json
{
  "inEffect": "Blur",
  "textEffect": "Whisper Fade",
  "outEffect": "Slow Zoom",
  "font": "Sawarabi Mincho",
  "textColor": "#dbeafe"
}
```

### 優しい・透明感

```json
{
  "inEffect": "Glow",
  "textEffect": "Karaoke Sweep",
  "outEffect": "Blur",
  "font": "Murecho",
  "textColor": "#e0f2fe"
}
```

### サビ・高揚感

```json
{
  "inEffect": "Neon",
  "textEffect": "Beat Glow",
  "outEffect": "Glow",
  "font": "Noto Sans JP",
  "textColor": "#fef08a"
}
```

### 強い言葉・叫び・決め

```json
{
  "track": 2,
  "inEffect": "Shake",
  "textEffect": "Shout Impact",
  "outEffect": "Zoom",
  "font": "Impact",
  "textColor": "#facc15",
  "outlineWidth": 5
}
```

### 低音・ドロップ

```json
{
  "track": 2,
  "inEffect": "Shake",
  "textEffect": "Bass Drop",
  "outEffect": "Zoom",
  "font": "Arial Black",
  "textColor": "#f97316"
}
```

### 不穏・壊れる・デジタル

```json
{
  "inEffect": "Glitch",
  "textEffect": "Glitch Entry",
  "outEffect": "Text Scramble Loop",
  "font": "MS Gothic",
  "textColor": "#ef4444"
}
```

### 未来感・3D・疾走

```json
{
  "track": 3,
  "inEffect": "3D Text Tunnel",
  "textEffect": "Neon Depth Chase",
  "outEffect": "Slow Zoom",
  "font": "Murecho",
  "textColor": "#67e8f9"
}
```

---

## フォント選択ルール

```txt
Noto Sans JP
標準。読みやすい日本語歌詞。

Murecho
ポップ、可愛い、透明感。

Sawarabi Mincho
切ない、静か、和風、余韻。

Yu Mincho / MS Mincho
和風、文学的、重い情緒。

Impact / Arial Black
英語、強調語、ドロップ、叫び。

MS Gothic / Courier New
グリッチ、デジタル、機械的。
```

---

## 色ルール

```txt
白系 #ffffff
標準、読みやすい。

水色 #bfdbfe / #67e8f9
透明感、夜、浮遊感。

黄色 #facc15 / #fef08a
サビ、希望、光、強調。

赤 #ef4444
怒り、崩壊、危険、強い感情。

紫 #c084fc / #f0abfc
夢、幻想、余韻、夜。

黒背景付き
強調語、ドロップ、字幕視認性が必要な箇所。
```

---

## keyframes

必要な場合のみ付けます。

### 位置移動

```json
[
  {
    "id": "kf-001-x-a",
    "frame": 120,
    "property": "x",
    "value": -80
  },
  {
    "id": "kf-001-x-b",
    "frame": 180,
    "property": "x",
    "value": 40
  }
]
```

### 色変化

```json
[
  {
    "id": "kf-002-color-a",
    "frame": 200,
    "property": "textColor",
    "value": "#bfdbfe"
  },
  {
    "id": "kf-002-color-b",
    "frame": 250,
    "property": "textColor",
    "value": "#fef08a"
  }
]
```

---

## beatMarkers

音源がない場合は空配列でよいです。

```json
"beatMarkers": []
```

BPMが分かる場合は、30fps換算で生成できます。

例: BPM 120 の場合、1拍 = 15 frames。

```json
{
  "id": "grid-beat-0",
  "frame": 0,
  "strength": 0.85,
  "source": "grid"
}
```

```txt
strength:
0.1 - 0.4 = 弱い拍
0.5 - 0.7 = 通常
0.8 - 1.0 = 強い拍、ドロップ、サビ頭
```

---

## LRCからのframe変換

30fps前提。

```txt
frame = 秒数 * 30
```

例:

```txt
[00:10.00] 君の声
10秒 * 30 = startFrame 300
```

終了フレームは次のLRC行の直前にします。

```txt
endFrame = nextStartFrame - 2
```

最後の行は `startFrame + 75` を基本にします。

---

## 自動演出ルール

### 通常行

```txt
track: 0
font: Noto Sans JP
textEffect: Karaoke Sweep or Word Highlight
tokenMode: auto
```

### 重なり行

```txt
track: 1
yを少しずらす
scaleを少し小さくする
textColorを淡色にする
```

### 強調語

```txt
track: 2
scale: 1.2 - 1.5
font: Impact or Arial Black
textEffect: Shout Impact / Beat Pop / Bass Drop
outlineWidth: 4 - 6
```

### 余韻・FX

```txt
track: 3
textEffect: Whisper Fade / Ghostly Rise / Neon Depth Chase
fadeOutFramesを長めにする
```

---

## AI出力時の注意

- JSON以外の説明文を混ぜない。
- エフェクト名とフォント名はシステムに存在するものだけ使う。
- `startFrame < endFrame` を必ず守る。
- `effectStartFrame` と `effectEndFrame` は歌詞ブロック内に収める。
- `effectSwitchFrame` は `effectStartFrame` と `effectEndFrame` の間に置く。
- `trackCount` は基本 `4`。
- `beatMarkers` が不明なら `[]`。
- `tokens` は空配列でもよい。エディタ側で再生成できる。
