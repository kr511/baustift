const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

// Overridable for local testing: APP_URL=http://localhost:3000 npm start
const APP_URL = process.env.APP_URL || "https://swietelsky-faber-tagesbericht.vercel.app";
const APP_ORIGIN = new URL(APP_URL).origin;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // Same-origin stays in the app window, everything else opens in the
  // system browser (https only).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (new URL(url).origin !== APP_ORIGIN && url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== APP_ORIGIN) {
      event.preventDefault();
      if (url.startsWith("https://")) shell.openExternal(url);
    }
  });

  win.webContents.on("did-fail-load", (event, code, desc, url, isMainFrame) => {
    if (isMainFrame) win.loadFile(path.join(__dirname, "error.html"));
  });

  win.loadURL(APP_URL);
  return win;
}

function buildMenu(win) {
  const template = [
    {
      label: "Datei",
      submenu: [
        {
          label: "Drucken",
          accelerator: "CmdOrCtrl+P",
          click: () => win.webContents.print(),
        },
        { type: "separator" },
        { role: "quit", label: "Beenden" },
      ],
    },
    {
      label: "Ansicht",
      submenu: [
        {
          label: "Neu laden",
          accelerator: "CmdOrCtrl+R",
          click: () => win.loadURL(APP_URL),
        },
        { type: "separator" },
        { role: "zoomIn", label: "Vergrößern" },
        { role: "zoomOut", label: "Verkleinern" },
        { role: "resetZoom", label: "Standardgröße" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  const win = createWindow();
  buildMenu(win);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
