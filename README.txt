Image Metadata Manager v4.7
===========================

Offline Windows/Electron QA utility for converting PNG images into JPEG images while emulating the current real JPEG metadata format used by the project. It also includes a cleaner metadata viewer/editor with selective bulk editing.

What v4.7 adds:
- Redesigned PNG to JPEG Converter as a two-pane workbench layout.
- Left rail: numbered step navigation (Input → Template → Settings → Convert) with live completion ticks plus pinned ImageMagick / ExifTool / Config status and a Check Tools button.
- Right canvas: persistent Job Summary header showing Input count, Template, Output folder, and current Quality / Chroma / EXIF-sync settings at a glance — visible from every step.
- One active step panel at a time keeps the working area focused; switching steps no longer requires scrolling.
- Dedicated log dock at the bottom of the canvas with the progress bar and conversion log.
- Responsive collapse below ~1180px wraps the rail above the canvas.
- All converter behaviour, IPC handlers, and Metadata Viewer / Editor functionality are unchanged.

Required tools:
- Node.js for development/building
- ImageMagick for PNG to JPEG conversion
- ExifTool for metadata reading/writing

Tool setup:
Option A: Install ImageMagick and ExifTool globally so `magick` and `exiftool` work from any terminal.
Option B: Put `magick.exe` and `exiftool.exe` in the app's tools folder.

Dev preview:
1. Open a terminal in this folder.
2. Run: npm install
3. Run: npm start

Build installer:
1. Run: npm install
2. Run: npm run dist
3. Open the dist folder and run the generated Setup .exe

Recommended conversion settings:
- JPEG Quality: 95
- Chroma Sampling: 4:2:0
- Sync EXIF date fields from PNG/project Timestamp: ON
- Embed JSON backup into JPEG metadata fields: OFF

Standard project metadata fields:
- Timestamp
- Location-index
- CameraType
- ImagingDevice
- CameraTableLocation
- BaselineHeight
- Ptz
- PtzParameters
- RoomCoordinates
- Location

Advanced EXIF/template fields:
- Make
- Model
- Software
- ExposureTime
- SerialNumber
- ColorSpace
- DateTimeOriginal
- CreateDate
- ModifyDate
- XResolution
- YResolution
- ResolutionUnit

Important notes:
- The converter writes project fields as individual XMP-Sprout tags to match the current JPEG workflow.
- The editor writes project fields as XMP-Sprout tags.
- In the editor, checkboxes control which fields get written. Placeholder text is only an example and is not written unless the field is checked and filled.
- Bulk edits modify only checked fields; all other metadata remains untouched.
- The advanced editor is intended only for controlled metadata emulation. Leave advanced fields unchecked if you do not want to change them.
- JPEG cannot preserve PNG transparency. Transparent pixels are flattened against the selected background color.
- Keep the exiftool_config file. It is required for custom XMP tag writing.
