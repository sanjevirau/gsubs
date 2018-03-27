const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

path = require('path');
const url = require('url');
const autoUpdater = require("electron-updater").autoUpdater;
const {ipcMain} = require('electron');



let mainWindow; // this will store the window object

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: "gSubs",
    width: 344,
    height: 540,
    resizable: false,
    frame: false,
    maximizable: false,
    fullscreenable: false
  });

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'app', 'view', 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.on('ready', function() {
  createWindow();
  console.log('log message');
  autoUpdater.checkForUpdates();
});

// When the update has been downloaded and is ready to be installed, notify the BrowserWindow
autoUpdater.on('update-downloaded', (info) => {
  console.log(info);
  mainWindow.webContents.send('updateReady');
});

autoUpdater.on('error', err => console.log(err));
autoUpdater.on('checking-for-update', () => console.log('checking-for-update'));
autoUpdater.on('update-available', () => console.log('update-available'));
autoUpdater.on('update-not-available', () => console.log('update-not-available'));

// When receiving a quitAndInstall signal, quit and install the new version ;)
ipcMain.on("quitAndInstall", (event, arg) => {
  autoUpdater.quitAndInstall();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.