const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

// Overridable for local testing: APP_URL=http://localhost:3000/berichte npm start
//
// Points at /berichte (not the bare domain) so the desktop window opens
// straight into the app instead of the public marketing landing page.
// proxy.ts redirects unauthenticated requests to /login automatically, so
// logged-out users still land in the right place.
const APP_URL =
  process.env.APP_URL ||
  "https://swietelsky-faber-tagesbericht.vercel.app/berichte";
const APP_ORIGIN = new URL(APP_URL).origin;

// electron-builder setzt diese Env-Var zur Laufzeit der portablen Version.
// Portable Builds unterstützen kein Auto-Update (kein Installationsordner,
// den electron-updater überschreiben könnte) — dort bleibt nur der manuelle
// Download von der Baustift-Webseite.
const IST_PORTABLE = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);

let manuellePruefungAktiv = false;

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
    {
      label: "Hilfe",
      submenu: [
        {
          label: "Nach Updates suchen",
          click: () => pruefeAufUpdates(win, { manuell: true }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Sowohl vom "Nach Updates suchen"-Menüpunkt als auch automatisch (siehe
// setupAutoUpdater) aufgerufen. Bei manueller Prüfung bekommt der Nutzer auch
// dann eine Rückmeldung, wenn kein Update verfügbar ist oder die Prüfung
// fehlschlägt; im Hintergrund bleibt das stumm.
function pruefeAufUpdates(win, { manuell = false } = {}) {
  if (!app.isPackaged) {
    if (manuell) {
      dialog.showMessageBox(win, {
        type: "info",
        message: "Updates sind nur in der installierten Version verfügbar.",
      });
    }
    return;
  }
  if (IST_PORTABLE) {
    if (manuell) {
      dialog.showMessageBox(win, {
        type: "info",
        message:
          "Die portable Version aktualisiert sich nicht automatisch. Bitte die neueste Version von der Baustift-Webseite herunterladen.",
      });
    }
    return;
  }

  manuellePruefungAktiv = manuell;
  autoUpdater.checkForUpdates().catch((err) => {
    console.error("Update-Prüfung fehlgeschlagen:", err);
    if (manuellePruefungAktiv) {
      dialog.showMessageBox(win, {
        type: "error",
        message: "Update-Prüfung fehlgeschlagen. Bitte später erneut versuchen.",
        detail: String(err?.message ?? err),
      });
    }
    manuellePruefungAktiv = false;
  });
}

function setupAutoUpdater(win) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-not-available", () => {
    if (manuellePruefungAktiv) {
      dialog.showMessageBox(win, {
        type: "info",
        title: "Kein Update verfügbar",
        message: "Baustift ist auf dem neuesten Stand.",
      });
    }
    manuellePruefungAktiv = false;
  });

  autoUpdater.on("update-downloaded", (info) => {
    manuellePruefungAktiv = false;
    dialog
      .showMessageBox(win, {
        type: "info",
        title: "Update heruntergeladen",
        message: `Baustift ${info.version} steht bereit.`,
        detail:
          "Das Update wird beim nächsten Neustart installiert. Jetzt neu starten?",
        buttons: ["Jetzt neu starten", "Später"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-Update-Fehler:", err);
    manuellePruefungAktiv = false;
  });

  // Kurz nach dem Start prüfen (nicht sofort, um den Start nicht zu
  // verzögern), danach alle 4 Stunden erneut — viele Nutzer lassen die App
  // über den ganzen Arbeitstag offen.
  setTimeout(() => pruefeAufUpdates(win), 10_000);
  setInterval(() => pruefeAufUpdates(win), 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  const win = createWindow();
  buildMenu(win);
  if (app.isPackaged && !IST_PORTABLE) setupAutoUpdater(win);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
