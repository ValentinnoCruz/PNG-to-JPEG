PNG to JPEG Metadata Converter v4.3
===================================

This is an offline Windows/Electron QA utility for converting PNG images into JPEG images while emulating the current real JPEG metadata format used by the project. It also includes a safer metadata viewer/bulk editor.

What v4.3 adds:
- Converter tab still converts PNG to JPEG using a real JPEG metadata template.
- Converter syncs EXIF DateTimeOriginal/CreateDate/ModifyDate from the PNG/project Timestamp by default so template dates do not conflict with image-specific XMP Timestamp.
- Metadata Viewer / Bulk Editor tab now separates fields into safe project fields, advanced EXIF/template fields, and read-only technical fields.
- Standard editor can update project metadata fields as individual XMP-Sprout tags.
- Advanced editor can update selected EXIF/template fields when closer real-JPEG emulation is needed.
- Read-only technical fields are visible but not editable.
- Bulk edits can create backup copies before changes are applied.

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

Read-only technical fields:
- FileType
- MIMEType
- ImageWidth
- ImageHeight
- ImageSize
- FileSize
- EncodingProcess
- BitsPerSample
- ColorComponents
- YCbCrSubSampling

Important notes:
- The converter writes project fields as individual XMP-Sprout tags to match the current JPEG workflow.
- The editor writes project fields as XMP-Sprout tags.
- The advanced editor is intended only for controlled metadata emulation. Leave advanced fields blank if you do not want to change them.
- JPEG cannot preserve PNG transparency. Transparent pixels are flattened against the selected background color.
- Keep the exiftool_config file. It is required for custom XMP tag writing.
