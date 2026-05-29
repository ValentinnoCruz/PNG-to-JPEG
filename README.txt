PNG to JPEG Metadata Converter v4.2
===================================

This is an offline Windows/Electron QA utility for converting PNG images into JPEG images while emulating the current real JPEG metadata format used by the project.

What v4.2 adds:
- Converter tab still converts PNG to JPEG using a real JPEG metadata template.
- Converter now syncs EXIF DateTimeOriginal/CreateDate/ModifyDate from the PNG/project Timestamp by default so template dates do not conflict with image-specific XMP Timestamp.
- New Metadata Viewer / Bulk Editor tab.
- Viewer loads JPEG/PNG images and displays project metadata fields.
- Editor can update project metadata fields as individual XMP-Sprout tags.
- Editor can apply filled fields to one selected image or all loaded images.
- Editor can sync EXIF date fields when Timestamp is edited.

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

Required project metadata fields:
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

Important notes:
- The converter writes project fields as individual XMP-Sprout tags to match the current JPEG workflow.
- The editor writes project fields as XMP-Sprout tags. This is intended for JPEG/current metadata testing.
- JPEG cannot preserve PNG transparency. Transparent pixels are flattened against the selected background color.
- Keep the exiftool_config file. It is required for custom XMP tag writing.
