module.exports = {
  appId: 'local.lyricvidimg.editor',
  productName: 'lyricvidimgEditor',
  directories: {
    output: 'release/lyricvidimgEditor',
  },
  asar: false,
  files: [
    'dist/**/*',
    'src/**/*',
    'electron/editor-main.cjs',
    'package.json',
    'remotion.config.ts',
    'node_modules/**/*',
  ],
  extraMetadata: {
    main: 'electron/editor-main.cjs',
  },
  mac: {
    target: ['zip'],
    category: 'public.app-category.video',
  },
  win: {
    target: ['zip'],
  },
};
