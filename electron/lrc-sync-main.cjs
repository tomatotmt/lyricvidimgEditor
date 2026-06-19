const {app, BrowserWindow, Menu, shell} = require('electron');
const path = require('node:path');

const isDev = process.env.LRC_SYNC_DEV_SERVER;

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'lrcSyncTool',
    backgroundColor: '#071018',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.on('page-title-updated', (event) => {
    event.preventDefault();
    window.setTitle('lrcSyncTool');
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {role: 'close'},
      ],
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

  window.webContents.setWindowOpenHandler(({url}) => {
    shell.openExternal(url);
    return {action: 'deny'};
  });

  if (isDev) {
    await window.loadURL(isDev);
    return;
  }

  await window.loadFile(path.join(__dirname, '..', 'dist-lrc-sync-tool', 'lrc-sync-tool.html'));
};

app.whenReady().then(() => {
  app.setName('lrcSyncTool');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
