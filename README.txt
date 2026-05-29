Image Metadata Manager v4.5
===========================

Offline Windows/Electron QA utility for converting PNG images into JPEG images while emulating the current real JPEG metadata format used by the project. It also includes a cleaner metadata viewer/editor with selective bulk editing.

What v4.5 adds:
- Redesigned dark/slate UI for both the PNG to JPEG converter and Metadata Viewer / Editor.
- Cleaner converter workflow: Select Input, Template JPEG, Output Settings, Convert.
- Metadata viewer defaults to Project Fields instead of showing everything at once.
- Full metadata is still available through the All Metadata panel with group filters.
- Users can view metadata by mode: Project Fields, Camera/EXIF, Technical, or All Metadata Summary.
- Users can select multiple images and bulk edit only the checked fields.
- Unchecked fields remain untouched during bulk edits.
- Timestamp placeholder now matches the current JPEG reference format: YYYY:MM:DD HH:MM:SS.mmm-0500.
- Converter syncs EXIF DateTimeOriginal/CreateDate/ModifyDate from the PNG/project Timestamp by default so template dates do not conflict.

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
