# lyricvidEditor

Remotion + React + Vite を使ったリリック動画作成アプリ（Web UI エディタ）。

---

## 別環境で開発を始める手順

### 1. リポジトリをクローン
```bash
git clone https://github.com/tomatotmt/lyricvidEditor.git
cd lyricvidEditor
```

### 2. 依存パッケージをインストール
```bash
npm install
```

### 3. 開発サーバーを起動
```bash
npm run web
```

ブラウザで http://localhost:3000/ を開くとエディタが起動します。

---

## プロジェクト構成

```
lyricvidEditor/
├── index.html                        # Viteアプリのエントリーポイント
├── vite.config.ts                    # Vite設定
├── package.json
└── src/
    └── web-editor/
        ├── main.tsx                  # Reactアプリのマウント
        ├── App.tsx                   # メインレイアウト・状態管理
        ├── types.ts                  # 型定義・エフェクト定数
        ├── editor.css                # スタイルシート
        └── components/
            ├── TimelineTracks.tsx    # 5トラックのタイムライン
            ├── EditorTabs.tsx        # 編集 / 入力・共通 / 出力 タブパネル
            └── LyricComposition.tsx  # Remotionプレビュー用コンポジション
```

---

## 主な機能

- **5トラックタイムライン** : 最大5本のリリックトラックを並列管理。ブロックをドラッグで移動・タイムラインクリックでシーク。
- **編集タブ** : 選択したリリックブロックの位置・スケール・フレーム・エフェクト・フォント・文字色を調整。
- **入力・共通タブ** :
  - `.lrc` ファイルを読み込んでリリックをタイムラインに自動配置
  - 音楽ファイル（.mp3 / .wav）の読み込み
  - 作業データの JSON エクスポート / インポート
  - リリック共通設定（フォント・エフェクト・文字色・背景色・枠線色）
- **出力タブ** : 背景透過・無圧縮 MOV（ProRes 4444）でのレンダリングコマンドを生成・コピー。
