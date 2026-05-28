PNG to JPEG Metadata Converter v3
=================================

What this app does
------------------
1. Converts PNG images to JPEG files.
2. Preserves image dimensions.
3. Copies standard metadata using ExifTool when possible.
4. Extracts the custom project metadata fields from the PNG.
5. Writes those fields into the JPEG as individual XMP tags.
6. Also stores the same custom metadata as a JSON backup in JPEG Comment, EXIF UserComment, XMP Description, and a sidecar JSON file.
7. Generates a CSV report and full metadata dump files for every source/output pair.

Why v3 exists
-------------
Your current JPEG sample stores project-specific fields directly in XMP, for example:

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

v2 preserved those fields as embedded JSON, which was useful as a backup. v3 is stricter: it writes each field as its own XMP tag and verifies each one in the output JPEG.

Important ExifTool config note
------------------------------
The included exiftool_config file defines the custom XMP fields so ExifTool can write them. Do not delete this file.

The app writes them under the XMP-Sprout namespace. In normal ExifTool output using:

  exiftool -G -a -s "converted.jpg"

these fields should appear under the [XMP] group, similar to the current JPEG metadata sample.

If your backend requires a specific XMP namespace URI from the camera/developer pipeline, ask the dev team for that exact URI and update the NAMESPACE line in exiftool_config.

Important limitation
--------------------
JPEG cannot store transparency. Transparent PNG pixels are flattened against the selected background color. The default is white.

Required tools
--------------
This app uses two command-line tools:

1. ImageMagick 7+
   Used for PNG to JPEG conversion.
   The command needs to be available as: magick

2. ExifTool
   Used for metadata copying, XMP writing, and metadata export.
   The command needs to be available as: exiftool

You can either:
A) Install both tools and add them to your Windows PATH, or
B) Put magick.exe and exiftool.exe in this app's tools folder before building.

Suggested folder layout
-----------------------
PNG_to_JPEG_Metadata_App_v3/
  assets/
    icon.ico
  tools/
    magick.exe       optional
    exiftool.exe     optional
  exiftool_config
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

Look for these direct XMP fields:

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

For namespace-level detail, run:

   exiftool -G1 -a -s "converted.jpg"

Expected pass condition
-----------------------
The CSV should show:

- DimensionsMatch = Yes
- RequiredTagsChecked includes the project fields found in the PNG
- PreservedAsIndividualXmpTags includes the project fields
- MissingIndividualXmpTags is blank
- MismatchedIndividualXmpTags is blank
- Status = Converted and verified

If PreservedInEmbeddedJsonBackup is populated but PreservedAsIndividualXmpTags is missing fields, the metadata was backed up but did not get written in the current JPEG XMP target format.
