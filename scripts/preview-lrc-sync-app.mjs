import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const env = {...process.env};

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['electron/lrc-sync-main.cjs'], {
  env,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
