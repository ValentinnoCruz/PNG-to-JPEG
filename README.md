# PNG to JPEG Converter

A high-fidelity, fully-offline desktop app for converting PNG images to JPEG. Drag in your PNGs, tweak the quality, and export — no uploads, no cloud, no tracking. Built with React + Vite and packaged as a Windows desktop app with Electron.

## Features

- **Drag-and-drop** PNG → JPEG conversion in batch.
- **100% local** — files never leave your machine.
- **PNG metadata extraction** (DPI, EXIF where present) preserved/displayed during conversion.
- **Adjustable JPEG quality** for size/quality trade-offs.
- **One-click download** of converted images.
- Clean, modern UI built with **React 18**, **Tailwind CSS v4**, and **lucide-react** icons.

## Tech stack

| Layer | Tech |
|---|---|
| UI | React 18, Tailwind CSS v4, lucide-react |
| Bundler / dev server | Vite 8 |
| Desktop shell | Electron 41 |
| Packaging | electron-builder 26 (NSIS installer for Windows) |

## Requirements

- **Node.js 20.19+** or **22.12+** (Vite 8 requirement — Node 22 LTS recommended).
- **npm** (ships with Node).
- **Windows 10/11** to produce a Windows installer with `npm run package:win`.

## Getting started

```powershell
git clone https://github.com/ValentinnoCruz/PNG-to-JPEG.git
cd PNG-to-JPEG/png-to-jpeg-app
npm install
```

### Run in the browser (dev mode)

```powershell
npm run dev
```

Opens the Vite dev server with hot-module reloading.

### Run as a desktop app (dev mode)

Build the web assets, then launch Electron against them:

```powershell
npm run build
npx electron .
```

### Build the Windows installer

```powershell
npm run package:win
```

Outputs to `release/`:

- `PNG to JPEG Converter Setup 1.0.1.exe` — the NSIS installer.
- `win-unpacked/PNG to JPEG Converter.exe` — the raw executable (run it directly without installing).

## Project structure

```
png-to-jpeg-app/
├── build/
│   └── icon.ico          # App icon (multi-res, auto-discovered by electron-builder)
├── public/               # Static assets served as-is by Vite
├── src/
│   ├── App.jsx           # Main React component (UI + conversion logic)
│   ├── main.jsx          # React entry point
│   ├── App.css / index.css
│   └── assets/
├── main.js               # Electron main-process entry (creates BrowserWindow)
├── vite.config.js        # Vite config (base: './' for Electron file:// loads)
├── package.json          # Scripts + electron-builder config
└── README.md
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server with HMR. |
| `npm run build` | Build production web assets to `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run package:win` | Build web assets + produce Windows installer in `release/`. |

## Releasing

1. Bump `version` in `package.json` (e.g. `1.0.1` → `1.0.2`).
2. `npm run package:win`.
3. Test the installer from `release/`.
4. Upload the `.exe` to a GitHub Release.

> Keep `appId` (`com.valentinnocruz.pngconverter`) stable across releases — changing it makes Windows treat the new version as a separate app instead of an in-place upgrade.

## License

This project is private and not currently licensed for redistribution.
