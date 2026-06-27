# lyricvidimgEditor

Lyric-first MV editor built with React, Vite, and Remotion.

The app focuses on lyric timing/editing first, then lets you place still images on a timeline and animate them with beat-synced image effects. The current export target is MP4.

## Setup

```bash
git clone https://github.com/tomatotmt/lyricvidimgEditor.git
cd lyricvidimgEditor
npm install
npm run web
```

Open the URL printed by the server, usually:

```txt
http://127.0.0.1:3000/
```

If port 3000 is busy, the dev server automatically uses the next available port.

## Main Features

- LRC import and lyric block timeline editing
- Word, mora, and character-level lyric timing
- Beat marker detection, manual beat markers, and BPM grid markers
- Multiple lyric tracks for main lyrics, overlaps, emphasis, and accent lines
- Text effects, display effects, fade settings, and keyframes
- Experimental real-time 3D text effects with Three.js
- Still image timeline with up to 3 image layers
- PNG transparency support through image uploads
- Image effect slots by category:
  - Motion
  - Glitch
  - Color
  - Texture
- Quick image effect presets for common MV looks
- MP4 export from the web UI
- Project JSON export/import including lyrics, images, beat markers, settings, and embedded audio when available

## Scripts

```bash
npm run web
npm run build
npm run lint
```

`npm run web` starts the combined Vite + Remotion export server.

## Project Workflow

1. Import an audio file.
2. Import an LRC file or add lyric blocks manually.
3. Adjust lyric timing on the timeline.
4. Add still images and place them on image layers.
5. Select a lyric or image block and edit it in the inspector.
6. Use beat markers and image effect presets to build movement quickly.
7. Export MP4 from the Output tab.

## Project Save Format

The project export is a JSON file named `lyricvidimg-project.json`.

It stores:

- Lyrics and lyric timing
- Image blocks and image Data URLs
- Image effect slots and keyframes
- Global settings
- Beat markers
- Track count
- Audio Data URL when the browser has finished loading it

Large audio and image assets can make the JSON file large. For now this is intentional so another PC can reopen the project without manually collecting image files.

## Notes

- `node_modules` and `dist` are intentionally ignored.
- The default renderer/export path is MP4/H.264.
- Transparent ProRes/MOV export is not the default target anymore and should be treated as a future advanced option.
