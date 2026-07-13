const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

// Overridable for local testing: APP_URL=http://localhost:3000 npm start
const DEFAULT_APP_URL = "https://swietelsky-faber-tagesbericht.vercel.app";

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isAllowedAppUrl(url) {
  return url.protocol === "https:" || (url.protocol === "http:" && isLoopbackHost(url.hostname));
}

const configuredAppUrl = parseUrl(process.env.APP_URL || DEFAULT_APP_URL);
const appUrl = configuredAppUrl && isAllowedAppUrl(configuredAppUrl)
  ? configuredAppUrl
  : parseUrl(DEFAULT_APP_URL);
const APP_URL = appUrl.href;
const APP_ORIGIN = appUrl.origin;

function classifyNavigation(url) {
  const parsed = parseUrl(url);
  if (!parsed) return { type: "blocked" };
  if (parsed.origin === APP_ORIGIN) return { type: "internal", url: parsed.href };
  if (parsed.protocol === "https:" || parsed.protocol === "mailto:") {
    return { type: "external", url: parsed.href };
  }
  return { type: "blocked" };
}

function openExternal(url) {
  void shell.openExternal(url).catch(() => {});
}

function createWindow(initialUrl = APP_URL) {
  const initialNavigation = classifyNavigation(initialUrl);
  const sichereStartUrl = initialNavigation.type === "internal"
    ? initialNavigation.url
    : APP_URL;
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

  // Same-origin target=_blank links get their own equally isolated app
  // window. External HTTPS and mail links never load inside Electron; all
  // other origins and protocols are blocked.
  win.webContents.setWindowOpenHandler(({ url }) => {
    const navigation = classifyNavigation(url);
    if (navigation.type === "internal") {
      createWindow(navigation.url);
    } else if (navigation.type === "external") {
      openExternal(navigation.url);
    }
    return { action: "deny" };
  });

  function handleNavigation(event, url) {
    const navigation = classifyNavigation(url);
    if (navigation.type !== "internal") {
      event.preventDefault();
      if (navigation.type === "external") openExternal(navigation.url);
    }
  }

  win.webContents.on("will-navigate", handleNavigation);
  win.webContents.on("will-redirect", handleNavigation);

  win.webContents.on("did-fail-load", (event, code, desc, url, isMainFrame) => {
    if (isMainFrame) win.loadFile(path.join(__dirname, "error.html"));
  });

  win.loadURL(sichereStartUrl);
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
