PNG to JPEG Metadata Converter v2
=================================

What this app does
------------------
1. Converts PNG images to high-quality JPEG files.
2. Preserves image dimensions.
3. Copies standard metadata using ExifTool.
4. Extracts custom PNG metadata fields and embeds them as JSON into the JPEG.
5. Writes the same custom metadata to a sidecar JSON file next to the JPEG.
6. Generates a CSV report and full metadata dump files for every source/output pair.

Why v2 exists
-------------
Your sample PNG used custom PNG metadata fields:

- Timestamp
- Location-index
- CameraType
- Ptz
- PtzParameters
- RoomCoordinates
- ImagingDevice
- CameraTableLocation
- BaselineHeight
- Location

A normal PNG to JPEG conversion did not preserve those fields. v2 explicitly extracts them and stores them in multiple JPEG-readable locations:

- JPEG Comment
- EXIF UserComment
- XMP Description
- Sidecar JSON file: *_metadata.json

Important limitation
--------------------
JPEG cannot store transparency. Transparent PNG pixels are flattened against the selected background color. The default is white.

Important backend note
----------------------
This app preserves the metadata, but your backend/webpage may still need to be updated to read it from the JPEG Comment, EXIF UserComment, XMP Description, or the sidecar JSON file. If the backend only knows how to read PNG text chunks, it may still fail until the parser is updated.

Required tools
--------------
This app uses two trusted command-line tools:

1. ImageMagick 7+
   Used for PNG to JPEG conversion.
   The command needs to be available as: magick

2. ExifTool
   Used for metadata copying, embedding, and metadata export.
   The command needs to be available as: exiftool

You can either:
A) Install both tools and add them to your Windows PATH, or
B) Put magick.exe and exiftool.exe in this app's tools folder before building.

Suggested folder layout
-----------------------
PNG_to_JPEG_Metadata_App_v2/
  assets/
    icon.ico
  tools/
    magick.exe       optional
    exiftool.exe     optional
  main.js
  preload.js
  index.html
  renderer.js
  styles.css
  package.json

How to run in development
-------------------------
1. Open Command Prompt or PowerShell in this folder.
2. Run:

   npm install
   npm start

How to build a Windows installer
--------------------------------
Run:

   npm run dist

The installer will be created in the dist folder.

How to verify one output manually
---------------------------------
Run this against the converted JPG:

   exiftool -G -a -s "converted.jpg"

Look for UserComment, Comment, Description, or ImageDescription. Those should contain JSON with a projectMetadata object.

You can also inspect the generated sidecar file:

   converted_metadata.json

Expected pass condition
-----------------------
The CSV should show:

- DimensionsMatch = Yes
- RequiredTagsChecked includes the project fields found in the PNG
- PreservedInEmbeddedJson includes the project fields
- MissingFromJpeg is blank
- Status = Converted and verified
