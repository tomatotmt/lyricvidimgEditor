import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {createServer as createHttpServer} from 'node:http';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {createServer as createNetServer} from 'node:net';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer as createViteServer} from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const preferredPort = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';
const remotionEntry = path.join(root, 'src/remotion/index.tsx');

const canUsePort = (candidatePort) =>
  new Promise((resolve) => {
    const tester = createNetServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(candidatePort);
  });

const findAvailablePort = async (startPort) => {
  for (let candidatePort = startPort; candidatePort < startPort + 40; candidatePort += 1) {
    if (await canUsePort(candidatePort)) {
      return candidatePort;
    }
  }
  throw new Error(`No available port found from ${startPort} to ${startPort + 39}.`);
};

const port = await findAvailablePort(preferredPort);

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
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

const renderMov = async (payload) => {
  const lyrics = Array.isArray(payload.lyrics) ? payload.lyrics : [];
  const durationInFrames = Math.max(1, Math.round(Number(payload.durationInFrames) || 300));
  const inputProps = {
    lyrics,
    globalSettings: payload.globalSettings,
    durationInFrames,
  };
  const tempDir = await mkdtemp(path.join(tmpdir(), 'lyricvid-export-'));
  const outputLocation = path.join(tempDir, 'transparent_video.mov');

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
      codec: 'prores',
      proResProfile: '4444',
      pixelFormat: 'yuva444p10le',
      imageFormat: 'png',
      outputLocation,
      overwrite: true,
      muted: true,
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

const vite = await createViteServer({
  root,
  appType: 'spa',
  server: {
    middlewareMode: true,
    hmr: {
      host,
      port,
    },
  },
});

const server = createHttpServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/api/export/mov') {
    try {
      const payload = await readJsonBody(request);
      const result = await renderMov(payload);
      response.writeHead(200, {
        'Content-Type': 'video/quicktime',
        'Content-Disposition': 'attachment; filename="transparent_video.mov"',
        'Content-Length': result.buffer.length,
      });
      response.end(result.buffer);
      await result.cleanup();
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'MOV export failed.',
      });
    }
    return;
  }

  vite.middlewares(request, response);
});

const listen = (candidatePort) =>
  new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve(candidatePort);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(candidatePort, host);
  });

let actualPort = port;
for (;;) {
  try {
    await listen(actualPort);
    break;
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'EADDRINUSE') {
      throw error;
    }
    actualPort += 1;
  }
}

if (actualPort !== preferredPort) {
  console.log(`Port ${preferredPort} is busy, using ${actualPort} instead.`);
}
console.log(`Local:   http://${host}:${actualPort}/`);
