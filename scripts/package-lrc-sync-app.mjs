import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronExecutable = require('electron');
const electronDist = path.dirname(electronExecutable);
const outputRoot = path.join(repoRoot, 'release', 'lrcSyncTool-app');
const platform = process.platform;

const copyAppPayload = async (resourcesDir) => {
  await fs.rm(path.join(resourcesDir, 'default_app.asar'), {force: true});
  const appDir = path.join(resourcesDir, 'app');
  await fs.mkdir(appDir, {recursive: true});
  await fs.cp(path.join(repoRoot, 'dist-lrc-sync-tool'), path.join(appDir, 'dist-lrc-sync-tool'), {recursive: true});
  await fs.cp(path.join(repoRoot, 'electron'), path.join(appDir, 'electron'), {recursive: true});
  await fs.writeFile(
    path.join(appDir, 'package.json'),
    JSON.stringify({
      name: 'lrc-sync-tool',
      version: '1.0.0',
      main: 'electron/lrc-sync-main.cjs',
      private: true,
    }, null, 2),
  );
};

await fs.rm(outputRoot, {recursive: true, force: true});
await fs.mkdir(path.dirname(outputRoot), {recursive: true});

if (platform === 'darwin') {
  const sourceApp = path.dirname(path.dirname(electronDist));
  const targetApp = path.join(outputRoot, 'lrcSyncTool.app');
  await fs.cp(sourceApp, targetApp, {recursive: true});
  await copyAppPayload(path.join(targetApp, 'Contents', 'Resources'));
  console.log(`Created ${targetApp}`);
} else {
  await fs.cp(electronDist, outputRoot, {recursive: true});
  await copyAppPayload(path.join(outputRoot, 'resources'));

  if (platform === 'win32') {
    await fs.rename(path.join(outputRoot, 'electron.exe'), path.join(outputRoot, 'lrcSyncTool.exe'));
  } else {
    await fs.rename(path.join(outputRoot, 'electron'), path.join(outputRoot, 'lrcSyncTool'));
  }

  console.log(`Created ${outputRoot}`);
}
