module.exports = {
  appId: 'local.lyricvideditor.lrcsynctool',
  productName: 'lrcSyncTool',
  directories: {
    output: 'release/lrcSyncTool',
  },
  files: [
    'dist-lrc-sync-tool/**/*',
    'electron/lrc-sync-main.cjs',
    'package.json',
  ],
  extraMetadata: {
    main: 'electron/lrc-sync-main.cjs',
  },
  win: {
    target: ['nsis', 'zip'],
  },
  mac: {
    target: ['dmg', 'zip'],
    category: 'public.app-category.music',
  },
  linux: {
    target: ['AppImage', 'zip'],
    category: 'Audio',
  },
};
