PNG to JPEG Metadata Converter v4
=================================

What this app does
------------------
1. Converts PNG images to JPEG files.
2. Preserves image dimensions.
3. Optionally uses a real current JPEG as a metadata template.
4. Copies the template JPEG metadata shell first: EXIF, JFIF, XMP, ICC/profile metadata when ExifTool can write it.
5. Extracts the custom project metadata fields from each PNG.
6. Writes those PNG project fields into the final JPEG as individual XMP tags, overwriting matching template fields.
7. Also stores the same custom metadata as a JSON backup in JPEG Comment, EXIF UserComment, XMP Description, and a sidecar JSON file.
8. Generates a CSV report and full metadata dump files for every source/template/output set.

Why v4 exists
-------------
Your test goal is not only to preserve the fields the backend needs, but to emulate the metadata structure of a real current JPEG upload as closely as possible.

v3 wrote the project fields as individual XMP tags. v4 adds template mode:

  Real JPEG template = camera/app metadata shell and defaults
  Original PNG       = image pixels and actual project-specific metadata
  Final JPEG         = converted PNG image + template metadata + PNG project fields overwriting matching XMP fields

Use a template JPEG when you want your converted test images to look more like the current production/current-iteration JPEG files.

Project fields overwritten from the PNG
---------------------------------------
These fields are extracted from the PNG and written as individual XMP tags in the output JPEG:

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

Template metadata behavior
--------------------------
If you select a template JPEG, the app first runs a metadata copy from the template to the output JPEG.

This is intended for fields like:

- Make
- Model
- Software
- ExposureTime
- SerialNumber
- ColorSpace
- DateTimeOriginal/CreateDate/ModifyDate
- ResolutionUnit/XResolution/YResolution
- ICC/profile metadata
- Other real JPEG/XMP/EXIF fields present in the template

Then the app writes the PNG project fields as XMP tags so they reflect the specific source PNG image, not the template image.

Important: the app does not invent arbitrary EXIF fields. If you need Make/Model/Software/etc., provide a real current JPEG template that already has those fields.

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

Recommended settings
--------------------
Start with:

- JPEG Quality: 95
- Chroma Sampling: 4:2:0
- Background: white

4:2:0 matches your current JPEG sample more closely than 4:4:4. Use 4:4:4 only if the devs/model owners want maximum color fidelity and file size is less important.

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
PNG_to_JPEG_Metadata_App_v4/
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

Also compare the output JPEG against the template JPEG for EXIF/camera fields such as Make, Model, Software, ExposureTime, ColorSpace, SerialNumber, etc.

For namespace-level detail, run:

   exiftool -G1 -a -s "converted.jpg"

Expected pass condition
-----------------------
The CSV should show:

- TemplateMode = Yes, if you selected a template JPEG
- TemplateCopied = Yes ...
- DimensionsMatch = Yes
- RequiredTagsChecked includes the project fields found in the PNG
- PreservedAsIndividualXmpTags includes the project fields
- MissingIndividualXmpTags is blank
- MismatchedIndividualXmpTags is blank
- Status = Converted and verified

If PreservedInEmbeddedJsonBackup is populated but PreservedAsIndividualXmpTags is missing fields, the metadata was backed up but did not get written in the current JPEG XMP target format.
