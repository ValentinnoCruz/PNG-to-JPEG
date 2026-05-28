const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fsp = require('fs/promises');
const { spawn, spawnSync } = require('child_process');

const APP_ID = 'com.valcruz.pngjpegmetadata';
app.setAppUserModelId(APP_ID);

const DEFAULT_PROJECT_TAGS = [
  'Timestamp',
  'Location-index',
  'CameraType',
  'Ptz',
  'PtzParameters',
  'RoomCoordinates',
  'ImagingDevice',
  'CameraTableLocation',
  'BaselineHeight',
  'Location'
];

let mainWindow;
let resolvedMagick = null;
let resolvedExifTool = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function toolCandidates(toolName) {
  const exeName = process.platform === 'win32' ? `${toolName}.exe` : toolName;
  const candidates = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'tools', exeName));
  }

  candidates.push(path.join(__dirname, 'tools', exeName));
  candidates.push(toolName);
  if (process.platform === 'win32') candidates.push(exeName);

  return [...new Set(candidates)];
}

function testCommand(command, args) {
  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10000
    });

    return {
      ok: result.status === 0,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      error: result.error ? result.error.message : ''
    };
  } catch (error) {
    return { ok: false, stdout: '', stderr: '', error: error.message };
  }
}

function resolveTool(toolName, versionArgs) {
  const attempts = [];
  for (const candidate of toolCandidates(toolName)) {
    const result = testCommand(candidate, versionArgs);
    attempts.push({ candidate, ...result });
    if (result.ok) return { ok: true, command: candidate, attempts, version: `${result.stdout}${result.stderr}`.trim() };
  }
  return { ok: false, command: null, attempts, version: '' };
}

function runCommand(command, args, options = {}) {
  const { cwd, onData } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: false
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      if (onData) onData(text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      if (onData) onData(text);
    });

    child.on('error', (error) => {
      reject(new Error(`${command} failed to start: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`${command} exited with code ${code}\n${stderr || stdout}`));
      }
    });
  });
}

function isPng(filePath) {
  return filePath.toLowerCase().endsWith('.png');
}

async function walkForPngs(folderPath, recursive = true) {
  const found = [];
  const entries = await fsp.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory() && recursive) {
      found.push(...await walkForPngs(fullPath, recursive));
    } else if (entry.isFile() && isPng(fullPath)) {
      found.push(fullPath);
    }
  }

  return found;
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

function normalizeMetadataValue(value) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(normalizeMetadataValue).join('|');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim();
}

function requestedTagList(raw) {
  const tags = String(raw || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...new Set(tags)];
}

function extractProjectMetadata(sourceMeta, requestedTags) {
  const projectMetadata = {};
  const missingFromSource = [];

  for (const tag of requestedTags) {
    const value = sourceMeta[tag];
    const normalized = normalizeMetadataValue(value);
    if (normalized) {
      projectMetadata[tag] = value;
    } else {
      missingFromSource.push(tag);
    }
  }

  return { projectMetadata, missingFromSource };
}

function tryParseJson(value) {
  if (!value) return null;
  const text = normalizeMetadataValue(value);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function findEmbeddedMetadata(jpegMeta) {
  const candidates = [
    jpegMeta.UserComment,
    jpegMeta.Comment,
    jpegMeta.Description,
    jpegMeta.ImageDescription
  ];

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed && parsed.projectMetadata && typeof parsed.projectMetadata === 'object') {
      return parsed;
    }
  }

  return null;
}

function compareProjectTags(sourceMeta, jpegMeta, embeddedMeta, requestedTags) {
  const checked = [];
  const directPreserved = [];
  const embeddedPreserved = [];
  const missing = [];
  const mismatched = [];

  const embeddedProject = embeddedMeta?.projectMetadata || {};

  for (const tag of requestedTags) {
    const sourceValue = normalizeMetadataValue(sourceMeta[tag]);
    if (!sourceValue) continue;

    checked.push(tag);

    const directValue = normalizeMetadataValue(jpegMeta[tag]);
    const embeddedValue = normalizeMetadataValue(embeddedProject[tag]);

    if (directValue && directValue === sourceValue) {
      directPreserved.push(tag);
      continue;
    }

    if (embeddedValue && embeddedValue === sourceValue) {
      embeddedPreserved.push(tag);
      continue;
    }

    if (!directValue && !embeddedValue) {
      missing.push(tag);
    } else {
      mismatched.push(`${tag}: source='${sourceValue}' JPEG/direct='${directValue}' JPEG/embedded='${embeddedValue}'`);
    }
  }

  return { checked, directPreserved, embeddedPreserved, missing, mismatched };
}

async function getDimensions(filePath) {
  const result = await runCommand(resolvedMagick, ['identify', '-format', '%w,%h', filePath]);
  const [width, height] = result.stdout.trim().split(',').map(Number);
  return { width, height };
}

async function getMetadataJson(filePath) {
  const result = await runCommand(resolvedExifTool, ['-j', '-a', '-s', filePath]);
  const parsed = JSON.parse(result.stdout);
  return parsed[0] || {};
}

async function getMetadataText(filePath) {
  const result = await runCommand(resolvedExifTool, ['-G', '-a', '-s', filePath]);
  return result.stdout;
}

function outputPathFor(sourceFile, options) {
  const baseName = path.basename(sourceFile, path.extname(sourceFile)) + '.jpg';
  let outputDir = options.outputDir;

  if (options.sourceRoot && options.preserveFolders) {
    const relativeDir = path.relative(options.sourceRoot, path.dirname(sourceFile));
    outputDir = path.join(options.outputDir, relativeDir);
  }

  return path.join(outputDir, baseName);
}

function sidecarPathFor(destinationFile) {
  const dir = path.dirname(destinationFile);
  const base = path.basename(destinationFile, path.extname(destinationFile));
  return path.join(dir, `${base}_metadata.json`);
}

ipcMain.handle('check-dependencies', async () => {
  const magick = resolveTool('magick', ['-version']);
  const exiftool = resolveTool('exiftool', ['-ver']);

  if (magick.ok) resolvedMagick = magick.command;
  if (exiftool.ok) resolvedExifTool = exiftool.command;

  return {
    magick: {
      ok: magick.ok,
      command: magick.command,
      version: magick.version.split('\n')[0] || '',
      attempts: magick.attempts
    },
    exiftool: {
      ok: exiftool.ok,
      command: exiftool.command,
      version: exiftool.version.split('\n')[0] || '',
      attempts: exiftool.attempts
    }
  };
});

ipcMain.handle('select-png-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select PNG files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'PNG Images', extensions: ['png'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) return { canceled: true, files: [] };
  return { canceled: false, files: result.filePaths.filter(isPng), sourceRoot: '' };
});

ipcMain.handle('select-png-folder', async (_, recursive) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a folder containing PNG files',
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths.length) return { canceled: true, files: [], sourceRoot: '' };

  const sourceRoot = result.filePaths[0];
  const files = await walkForPngs(sourceRoot, recursive);
  return { canceled: false, files, sourceRoot };
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select output folder',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths.length) return { canceled: true, folder: '' };
  return { canceled: false, folder: result.filePaths[0] };
});

ipcMain.handle('start-conversion', async (event, options) => {
  const depCheck = {
    magick: resolveTool('magick', ['-version']),
    exiftool: resolveTool('exiftool', ['-ver'])
  };

  if (!depCheck.magick.ok || !depCheck.exiftool.ok) {
    throw new Error('Missing dependency. Install ImageMagick and ExifTool, or place magick.exe and exiftool.exe in the app tools folder. Then run Check Tools again.');
  }

  resolvedMagick = depCheck.magick.command;
  resolvedExifTool = depCheck.exiftool.command;

  const files = Array.isArray(options.files) ? options.files.filter(isPng) : [];
  if (!files.length) throw new Error('No PNG files selected.');
  if (!options.outputDir) throw new Error('No output folder selected.');

  const quality = String(Number(options.quality || 95));
  const background = options.background || 'white';
  const requestedTags = requestedTagList(options.verifyTags || DEFAULT_PROJECT_TAGS.join(', '));
  const reportRows = [];
  const startedAt = new Date();
  const reportStamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(options.outputDir, `_conversion_report_${reportStamp}`);
  const dumpsDir = path.join(reportDir, 'metadata_dumps');
  await fsp.mkdir(dumpsDir, { recursive: true });

  let successCount = 0;
  let warningCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const sourceFile = files[i];
    const destinationFile = outputPathFor(sourceFile, options);
    const sidecarFile = sidecarPathFor(destinationFile);
    const fileLabel = path.basename(sourceFile);

    event.sender.send('convert-progress', {
      index: i + 1,
      total: files.length,
      file: sourceFile,
      message: `Starting ${fileLabel}`,
      level: 'info'
    });

    const row = {
      SourceFile: sourceFile,
      OutputFile: destinationFile,
      SidecarJson: sidecarFile,
      Status: 'Unknown',
      SourceWidth: '',
      SourceHeight: '',
      JpegWidth: '',
      JpegHeight: '',
      DimensionsMatch: '',
      RequiredTagsChecked: '',
      MissingFromSourcePNG: '',
      PreservedDirectInJpeg: '',
      PreservedInEmbeddedJson: '',
      MissingFromJpeg: '',
      MismatchedFields: '',
      EmbeddedMetadataLocations: 'JPEG Comment; EXIF UserComment; XMP Description; sidecar JSON',
      Error: ''
    };

    try {
      await fsp.mkdir(path.dirname(destinationFile), { recursive: true });

      await runCommand(resolvedMagick, [
        sourceFile,
        '-background', background,
        '-alpha', 'remove',
        '-alpha', 'off',
        '-sampling-factor', '4:4:4',
        '-quality', quality,
        destinationFile
      ]);

      // First attempt a broad metadata copy. This often preserves standard EXIF/XMP/ICC data.
      await runCommand(resolvedExifTool, [
        '-overwrite_original',
        '-TagsFromFile', sourceFile,
        '-all:all',
        '-icc_profile',
        destinationFile
      ]);

      const sourceMeta = await getMetadataJson(sourceFile);
      const { projectMetadata, missingFromSource } = extractProjectMetadata(sourceMeta, requestedTags);

      const embeddedPayload = {
        metadataSchema: 'png-to-jpeg-project-metadata-v1',
        sourceFileName: path.basename(sourceFile),
        outputFileName: path.basename(destinationFile),
        createdAt: new Date().toISOString(),
        note: 'Custom PNG metadata preserved as JSON because PNG text chunks do not map cleanly to JPEG fields.',
        projectMetadata
      };

      const embeddedJson = JSON.stringify(embeddedPayload);
      await fsp.writeFile(sidecarFile, JSON.stringify(embeddedPayload, null, 2), 'utf8');

      // Explicit preservation pass: embed the custom PNG fields into multiple JPEG-readable places.
      // This is the important v2 change.
      await runCommand(resolvedExifTool, [
        '-overwrite_original',
        `-Comment=${embeddedJson}`,
        `-UserComment=${embeddedJson}`,
        `-ImageDescription=${embeddedJson}`,
        `-XMP-dc:Description=${embeddedJson}`,
        destinationFile
      ]);

      const [sourceDims, jpegDims, jpegMeta] = await Promise.all([
        getDimensions(sourceFile),
        getDimensions(destinationFile),
        getMetadataJson(destinationFile)
      ]);

      row.SourceWidth = sourceDims.width;
      row.SourceHeight = sourceDims.height;
      row.JpegWidth = jpegDims.width;
      row.JpegHeight = jpegDims.height;
      row.DimensionsMatch = sourceDims.width === jpegDims.width && sourceDims.height === jpegDims.height ? 'Yes' : 'No';
      row.MissingFromSourcePNG = missingFromSource.join('; ');

      const embeddedFromJpeg = findEmbeddedMetadata(jpegMeta);
      const tagResult = compareProjectTags(sourceMeta, jpegMeta, embeddedFromJpeg, requestedTags);

      row.RequiredTagsChecked = tagResult.checked.join('; ');
      row.PreservedDirectInJpeg = tagResult.directPreserved.join('; ');
      row.PreservedInEmbeddedJson = tagResult.embeddedPreserved.join('; ');
      row.MissingFromJpeg = tagResult.missing.join('; ');
      row.MismatchedFields = tagResult.mismatched.join(' | ');

      const safeBase = path.basename(sourceFile, path.extname(sourceFile)).replace(/[^a-z0-9_-]/gi, '_');
      const unique = `${String(i + 1).padStart(4, '0')}_${safeBase}`;
      await fsp.writeFile(path.join(dumpsDir, `${unique}_source_png_metadata.txt`), await getMetadataText(sourceFile), 'utf8');
      await fsp.writeFile(path.join(dumpsDir, `${unique}_output_jpg_metadata.txt`), await getMetadataText(destinationFile), 'utf8');
      await fsp.writeFile(path.join(dumpsDir, `${unique}_embedded_metadata.json`), JSON.stringify(embeddedPayload, null, 2), 'utf8');

      const hasWarnings = row.DimensionsMatch !== 'Yes' || row.MissingFromJpeg || row.MismatchedFields || !embeddedFromJpeg;
      if (hasWarnings) {
        row.Status = 'Converted with warnings';
        warningCount++;
      } else {
        row.Status = 'Converted and verified';
        successCount++;
      }

      event.sender.send('convert-progress', {
        index: i + 1,
        total: files.length,
        file: sourceFile,
        message: `${row.Status}: ${fileLabel}`,
        level: row.Status === 'Converted and verified' ? 'success' : 'warn'
      });
    } catch (error) {
      row.Status = 'Failed';
      row.Error = error.message;
      failCount++;

      event.sender.send('convert-progress', {
        index: i + 1,
        total: files.length,
        file: sourceFile,
        message: `Failed: ${fileLabel} — ${error.message}`,
        level: 'error'
      });
    }

    reportRows.push(row);
  }

  const reportPath = path.join(reportDir, 'conversion_report.csv');
  await fsp.writeFile(reportPath, toCsv(reportRows), 'utf8');

  const summaryPath = path.join(reportDir, 'summary.txt');
  await fsp.writeFile(summaryPath, [
    'PNG to JPEG Metadata Converter v2 - Summary',
    `Started: ${startedAt.toString()}`,
    `Finished: ${new Date().toString()}`,
    `Total PNG files: ${files.length}`,
    `Converted and verified: ${successCount}`,
    `Converted with warnings: ${warningCount}`,
    `Failed: ${failCount}`,
    '',
    `Output folder: ${options.outputDir}`,
    `Report CSV: ${reportPath}`,
    `Metadata dumps: ${dumpsDir}`,
    '',
    'What v2 verifies:',
    '1. JPEG dimensions match the source PNG.',
    '2. Standard metadata copy is attempted using ExifTool.',
    '3. Required custom PNG fields are extracted and embedded as JSON into the JPEG Comment, EXIF UserComment, XMP Description, and a sidecar JSON file.',
    '4. The CSV reports whether each required field was preserved directly or inside the embedded JSON block.',
    '',
    'Important limitation:',
    'JPEG cannot store PNG transparency. Transparent pixels are flattened against the selected background color.',
    'If your backend currently reads PNG text chunks only, the backend may need to be updated to read the embedded JPEG JSON or the sidecar JSON.'
  ].join('\n'), 'utf8');

  return {
    total: files.length,
    successCount,
    warningCount,
    failCount,
    reportPath,
    summaryPath,
    reportDir
  };
});
