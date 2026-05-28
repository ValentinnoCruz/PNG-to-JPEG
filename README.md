# PNG to JPEG

Local-first desktop converter for turning PNG images into JPEGs. Currently maintained as **two parallel iterations** living on separate branches.

> The default `main` branch intentionally contains no source code — pick an iteration below.

## Iterations

| Branch | Description |
|---|---|
| [`gemini-version`](https://github.com/ValentinnoCruz/PNG-to-JPEG/tree/gemini-version) | Original Electron + React + Vite implementation. Full PNG metadata pipeline (EXIF, XMP, `tEXt` / `zTXt` / `iTXt` chunks), custom app icon, packaged as a Windows installer via `electron-builder`. Tagged release: [`v1.0.1-gemini`](https://github.com/ValentinnoCruz/PNG-to-JPEG/releases/tag/v1.0.1-gemini). |
| [`experimental`](https://github.com/ValentinnoCruz/PNG-to-JPEG/tree/experimental) | A fresh, alternative approach. Empty starting point — under active exploration. |

## Working with an iteration

Clone and check out the branch you want to work on:

```powershell
git clone https://github.com/ValentinnoCruz/PNG-to-JPEG.git
cd PNG-to-JPEG

# Original implementation
git checkout gemini-version

# Or the new experimental approach
git checkout experimental
```

Each branch has its own README with build and run instructions.

## Why two branches?

The two iterations explore meaningfully different architectures and aren't intended to merge into a single codebase. Keeping them on independent branches preserves the history of each approach cleanly without one overwriting the other.
