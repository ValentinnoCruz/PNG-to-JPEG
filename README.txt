PNG to JPEG Metadata Converter
==============================

What this app does
------------------
1. Converts PNG images to high-quality JPEG files.
2. Copies metadata from the source PNG to the output JPEG using ExifTool.
3. Verifies dimensions and selected metadata tags.
4. Generates a CSV report and full metadata dump files for each source/output pair.

Important limitation
--------------------
JPEG cannot store transparency. Any transparent PNG pixels are flattened against the selected background color. The default is white.

Required tools
--------------
This app uses two trusted command-line tools:

1. ImageMagick 7+
   Used for PNG to JPEG conversion.
   The command needs to be available as: magick

2. ExifTool
   Used for metadata copying and metadata export.
   The command needs to be available as: exiftool

You can either:
A) Install both tools and add them to your Windows PATH, or
B) Put magick.exe and exiftool.exe in this app's tools folder before building.

Suggested folder layout
-----------------------
PNG_to_JPEG_Metadata_App/
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

Recommended QA workflow
-----------------------
Start with 5-10 known-good PNG images.
Convert them.
Review the generated conversion_report.csv.
Open the metadata_dumps folder and compare source PNG metadata vs output JPG metadata for the fields your web app/backend actually reads.

Suggested verification tags
--------------------------
ImageWidth, ImageHeight, XResolution, YResolution, DateTimeOriginal, CreateDate, ModifyDate, GPSLatitude, GPSLongitude, ColorSpace, ICC_Profile, Zone, Table, Tray, Location

Notes
-----
The app copies metadata using:

exiftool -overwrite_original -TagsFromFile source.png -all:all -icc_profile output.jpg

The app converts using:

magick source.png -background white -alpha remove -alpha off -sampling-factor 4:4:4 -quality 95 output.jpg
