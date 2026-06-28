const {app, BrowserWindow, Menu, shell} = require('electron');
const {createServer: createHttpServer} = require('node:http');
const {createServer: createNetServer} = require('node:net');
const {mkdtemp, readFile, rm} = require('node:fs/promises');
const {createReadStream, existsSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {fileURLToPath, pathToFileURL} = require('node:url');

const host = '127.0.0.1';
const preferredPort = 38560;
const appRoot = app.getAppPath();
const distRoot = path.join(appRoot, 'dist');
const remotionEntry = path.join(appRoot, 'src', 'remotion', 'index.tsx');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
]);

const canUsePort = (candidatePort) =>
  new Promise((resolve) => {
    const tester = createNetServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(candidatePort, host);
  });

const findAvailablePort = async (startPort) => {
  for (let candidatePort = startPort; candidatePort < startPort + 40; candidatePort += 1) {
    if (await canUsePort(candidatePort)) return candidatePort;
  }
  throw new Error('No available local port was found.');
};

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 200 * 1024 * 1024) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    request.on('error', reject);
  });

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {'Content-Type': 'application/json; charset=utf-8'});
  response.end(JSON.stringify(payload));
};

const renderMp4 = async (payload) => {
  const [{bundle}, {renderMedia, selectComposition}] = await Promise.all([
    import('@remotion/bundler'),
    import('@remotion/renderer'),
  ]);
  const lyrics = Array.isArray(payload.lyrics) ? payload.lyrics : [];
  const imageBlocks = Array.isArray(payload.imageBlocks) ? payload.imageBlocks : [];
  const durationInFrames = Math.max(1, Math.round(Number(payload.durationInFrames) || 300));
  const inputProps = {
    lyrics,
    imageBlocks,
    globalSettings: payload.globalSettings,
    audioUrl: typeof payload.audioUrl === 'string' ? payload.audioUrl : undefined,
    beatMarkers: Array.isArray(payload.beatMarkers) ? payload.beatMarkers : [],
    durationInFrames,
  };
  const tempDir = await mkdtemp(path.join(tmpdir(), 'lyricvid-export-'));
  const outputLocation = path.join(tempDir, 'music_video.mp4');

  try {
    const serveUrl = await bundle({
      entryPoint: remotionEntry,
      onProgress: () => undefined,
    });
    const composition = await selectComposition({
      serveUrl,
      id: 'LyricVideo',
      inputProps,
      logLevel: 'warn',
    });
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      codec: 'h264',
      crf: 18,
      imageFormat: 'jpeg',
      outputLocation,
      overwrite: true,
      muted: !inputProps.audioUrl,
      logLevel: 'warn',
    });
    return {
      buffer: await readFile(outputLocation),
      cleanup: () => rm(tempDir, {recursive: true, force: true}),
    };
  } catch (error) {
    await rm(tempDir, {recursive: true, force: true});
    throw error;
  }
};

const serveStaticFile = (request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://localhost');
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = path.resolve(distRoot, relativePath);
  const fallback = path.join(distRoot, 'index.html');
  const filePath = candidate.startsWith(distRoot) && existsSync(candidate) ? candidate : fallback;
  const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
  response.writeHead(200, {'Content-Type': contentType});
  createReadStream(filePath).pipe(response);
};

const startLocalServer = async () => {
  const server = createHttpServer(async (request, response) => {
    if (request.method === 'POST' && request.url === '/api/export/mp4') {
      try {
        const payload = await readJsonBody(request);
        const result = await renderMp4(payload);
        response.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'attachment; filename="music_video.mp4"',
          'Content-Length': result.buffer.length,
        });
        response.end(result.buffer);
        await result.cleanup();
      } catch (error) {
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : 'MP4 export failed.',
        });
      }
      return;
    }
    serveStaticFile(request, response);
  });

  const port = await findAvailablePort(preferredPort);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return {server, url: `http://${host}:${port}/`};
};

const createWindow = async () => {
  const {server, url} = await startLocalServer();
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: 'lyricvidimgEditor',
    backgroundColor: '#0b0c10',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.on('closed', () => server.close());
  window.on('page-title-updated', (event) => {
    event.preventDefault();
    window.setTitle('lyricvidimgEditor');
  });
  window.webContents.setWindowOpenHandler(({url: externalUrl}) => {
    shell.openExternal(externalUrl);
    return {action: 'deny'};
  });
  await window.loadURL(url);
};

Menu.setApplicationMenu(Menu.buildFromTemplate([
  {
    label: 'File',
    submenu: [{role: 'close'}],
  },
  {
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'toggleDevTools'},
      {type: 'separator'},
      {role: 'resetZoom'},
      {role: 'zoomIn'},
      {role: 'zoomOut'},
    ],
  },
]));

app.whenReady().then(() => {
  app.setName('lyricvidimgEditor');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
