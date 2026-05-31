# PNG2JPEG

> Offline Windows app for batch PNG → JPEG conversion with real JPEG-template emulation and a built-in metadata viewer / bulk editor.

[![Latest release](https://img.shields.io/github/v/release/ValentinnoCruz/PNG-to-JPEG?label=release)](https://github.com/ValentinnoCruz/PNG-to-JPEG/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)](https://github.com/ValentinnoCruz/PNG-to-JPEG/releases/latest)
[![Electron](https://img.shields.io/badge/electron-41-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)

PNG2JPEG converts PNGs to JPEGs that match the byte-level characteristics of a reference JPEG (encoder, quantization tables, subsampling) instead of producing a generic re-encode. It also ships a full-featured **Editor** for bulk-managing project metadata (EXIF + custom XMP) across thousands of images.

Built for an internal Sprout imaging workflow — runs entirely offline, no telemetry, no cloud.

---

## Features

### Converter
- **Template-driven JPEG output** — point at a reference JPEG; new files inherit its encoder, quality, quantization tables, chroma subsampling, and color profile.
- **Batch conversion** with per-file progress, throughput, and a cancellable run.
- **Recursive folder ingest** with a resilient walker that skips and reports unreadable folders instead of failing the whole batch.
- **Optional sidecar JSON** written next to each output (full ExifTool dump for downstream tools).
- **Custom XMP-Sprout tags** — project fields like `Location-index`, `CameraType`, `PtzParameters` are preserved through the round-trip.

### Editor (Browse / Edit / Inspect)
- **Browse** — sortable, filterable table view of a folder of images with thumbnail previews.
- **Edit** — double-click any cell to edit; bulk **find-and-replace** across the current selection; column-level editing.
- **Inspect** — full ExifTool metadata dump for the active row, grouped by namespace.
- **CSV export** of the current Browse view.
- **Backups** — every edit writes a `.bak` next to the original.
- **Read-only fields** — technical EXIF fields (dimensions, color space, etc.) are protected from accidental edits.

### Quality of life
- **In-app Setup modal** — one-click access to the docs for the single manual dependency (ImageMagick).
- **Dependency check** — live status row for ImageMagick, ExifTool, and the custom XMP config, with "Get it" links for whatever's missing.
- **Dark theme** — readable slate palette tuned for long sessions.

---

## Install

### For end users (recommended)

1. Grab the latest **`PNG2JPEG Setup x.y.z.exe`** from the [Releases page](https://github.com/ValentinnoCruz/PNG-to-JPEG/releases/latest).
2. Run it. Windows SmartScreen may warn (unsigned binary) — click **More info → Run anyway**.
3. Install **ImageMagick** from <https://imagemagick.org/script/download.php#windows>:
   - Pick the **Q16, x64, dynamic** installer.
   - During install, **tick "Install legacy utilities"** and **"Add application directory to your system path"**.
4. Open PNG2JPEG → click **Check Dependencies** in the top bar. All three rows should be green.

The in-app **Setup** modal repeats these instructions if you ever need them.

### Why isn't ImageMagick bundled?

The portable ImageMagick build is silently stalled by some corporate EDR/AV products on first execution from non–`Program Files` paths, even though the binary is properly signed. The official signed installer goes through normal allow-listing and works reliably. ExifTool and the custom XMP config are bundled.

---

## Dependencies

| Tool                | Required | Shipped in installer | Notes                                                                |
| ------------------- | -------- | -------------------- | -------------------------------------------------------------------- |
| **ImageMagick** Q16 | ✅       | ❌ (install yourself) | Drives the actual PNG → JPEG encode. Must be on `PATH`.              |
| **ExifTool**        | ✅       | ✅                    | Reads and writes all metadata.                                       |
| `exiftool_config`   | ✅       | ✅                    | Defines the custom XMP-Sprout namespace (`Location-index`, etc.).    |

---

## Development

### Prerequisites
- **Node.js 18+** and **npm**
- **Windows 10/11** (the app is Windows-only by design — it targets corporate Windows imaging workflows)
- **ImageMagick** on `PATH` (see install instructions above)
- **PowerShell 5.1+** (ships with Windows)

### Setup

```powershell
git clone https://github.com/ValentinnoCruz/PNG-to-JPEG.git
cd PNG-to-JPEG
npm install
npm run fetch-tools   # downloads ExifTool into tools/exiftool/
npm start             # runs the Electron app in dev
```

### Scripts

| Command                 | What it does                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm start`             | Runs the app in dev mode via Electron.                                                                |
| `npm run fetch-tools`   | Downloads the latest ExifTool from exiftool.org into `tools/exiftool/`. Idempotent; `-Force` to redo. |
| `npm run dist`          | `fetch-tools` + builds the NSIS installer (`dist/PNG2JPEG Setup x.y.z.exe`).                          |
| `npm run dist:nofetch`  | Builds the installer without re-running the fetch (use when `tools/` is already populated).           |
| `npm run pack`          | Builds an unpacked `win-unpacked/` tree (handy for debugging the installed layout).                   |

### Project layout

```
.
├── main.js                # Electron main process — IPC handlers, ImageMagick/ExifTool orchestration
├── preload.js             # contextBridge: exposes window.converterApi to the renderer
├── renderer.js            # UI logic (Converter + Editor)
├── index.html             # App shell + modals (Setup, About, etc.)
├── styles.css             # Dark theme (slate palette + accents)
├── exiftool_config        # Custom XMP-Sprout namespace definition (required by ExifTool)
├── assets/                # Icons (app icon, brand glyphs)
├── scripts/
│   └── fetch-tools.ps1    # Downloads ExifTool from exiftool.org
└── tools/                 # Populated by fetch-tools.ps1; bundled by electron-builder
    └── exiftool/
```

### Architecture (one paragraph)

Standard Electron split. The **main** process (`main.js`) owns the file system, spawns `magick.exe` and `exiftool.exe` as child processes, and exposes IPC handlers like `start-conversion`, `read-image-metadata`, `apply-metadata-edits`, `check-dependencies`. The **renderer** (`renderer.js` + `index.html` + `styles.css`) is a vanilla-JS UI that talks to the main process via `window.converterApi` (set up in `preload.js`). Tool resolution checks `resources/tools/<name>/<exe>` (installer build), then `tools/<name>/<exe>` (dev), then `PATH`.

---

## Releasing

```powershell
# 1. Bump version in package.json (and the title/brand in index.html)
# 2. Build
npm run dist
# 3. Smoke-test dist\PNG2JPEG Setup x.y.z.exe
# 4. Commit, push, merge to main
# 5. Tag and push
git tag -a vX.Y.Z -m "PNG2JPEG vX.Y.Z — <one-line summary>"
git push origin vX.Y.Z
# 6. Draft a GitHub Release from the tag and attach the installer
```

Bump `appId` (in `package.json` → `build.appId`) only on **major** version changes when you want a side-by-side install. Patch/minor releases keep the same `appId` so they upgrade in place.

---

## Troubleshooting

- **"magick is not recognized"** — ImageMagick isn't on `PATH`. Re-run its installer and check **"Add application directory to your system path"**, or add it manually.
- **ExifTool status is red in a dev clone** — run `npm run fetch-tools` to populate `tools/exiftool/`.
- **SmartScreen blocks the installer** — expected (no code-signing certificate). Click **More info → Run anyway**.
- **Antivirus quarantines bundled `exiftool.exe`** — whitelist it. ExifTool is a well-known open-source utility but is occasionally flagged.
- **Config download link 404s** — the in-app link points at the `experimental` branch's `exiftool_config`. If the branch was renamed, update the URL in `renderer.js`.

---

## Tech stack

- [Electron 41](https://www.electronjs.org/) — desktop runtime
- [electron-builder 26](https://www.electron.build/) — NSIS Windows installer
- [ImageMagick 7](https://imagemagick.org/) — JPEG encoding
- [ExifTool](https://exiftool.org/) — metadata read/write
- Vanilla JS + CSS for the UI (no framework)

---

## License

Internal tool — not currently published under an OSS license. Contact the author before redistributing.

## Author

[**Val Cruz**](https://github.com/ValentinnoCruz)
