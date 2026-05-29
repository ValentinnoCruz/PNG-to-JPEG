const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fsp = require('fs/promises');
const { spawn, spawnSync } = require('child_process');

const APP_ID = 'com.valcruz.pngjpegmetadata.v4_8';
app.setAppUserModelId(APP_ID);

const DEFAULT_PROJECT_TAGS = [
  'Timestamp',
  'Location-index',
  'CameraType',
  'ImagingDevice',
  'CameraTableLocation',
  'BaselineHeight',
  'Ptz',
  'PtzParameters',
  'RoomCoordinates',
  'Location'
];

const DEFAULT_ADVANCED_TAGS = [
  'Make',
  'Model',
  'Software',
  'ExposureTime',
  'SerialNumber',
  'ColorSpace',
  'DateTimeOriginal',
  'CreateDate',
  'ModifyDate',
  'XResolution',
  'YResolution',
  'ResolutionUnit'
];

const ADVANCED_EXIF_TAG_MAP = {
  Make: 'EXIF:Make',
  Model: 'EXIF:Model',
  Software: 'EXIF:Software',
  ExposureTime: 'EXIF:ExposureTime',
  SerialNumber: 'EXIF:SerialNumber',
  ColorSpace: 'EXIF:ColorSpace',
  DateTimeOriginal: 'EXIF:DateTimeOriginal',
  CreateDate: 'EXIF:CreateDate',
  ModifyDate: 'EXIF:ModifyDate',
  XResolution: 'EXIF:XResolution',
  YResolution: 'EXIF:YResolution',
  ResolutionUnit: 'EXIF:ResolutionUnit'
};

let mainWindow;
let resolvedMagick = null;
let resolvedExifTool = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
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

function configCandidates() {
  const candidates = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'exiftool_config'));
  }

  candidates.push(path.join(__dirname, 'exiftool_config'));
  return [...new Set(candidates)];
}

async function getExifToolConfigPath() {
  for (const candidate of configCandidates()) {
    try {
      await fsp.access(candidate);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return '';
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
  const { cwd, onData, allowNonZero = false } = options;

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
      if (code === 0 || allowNonZero) {
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

function isJpeg(filePath) {
  const lower = filePath.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg');
}

function isImage(filePath) {
  return isPng(filePath) || isJpeg(filePath);
}

async function walkForImages(folderPath, recursive = true) {
  const found = [];
  const entries = await fsp.readdir(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory() && recursive) {
      found.push(...await walkForImages(fullPath, recursive));
    } else if (entry.isFile() && isImage(fullPath)) {
      found.push(fullPath);
    }
  }

  return found;
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

function normalizeProjectTimestampForJpeg(value) {
  const text = normalizeMetadataValue(value);
  if (!text) return '';

  // Reference JPEG project timestamp format observed in current images:
  // YYYY:MM:DD HH:MM:SS.mmm-0500 or YYYY:MM:DD HH:MM:SS.mmm+0000
  const match = text.match(/^(\d{4})[-:](\d{2})[-:](\d{2})[T\s](\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{4}|Z)?)/);
  if (!match) return text;
  const [, year, month, day, timeRest] = match;
  return `${year}:${month}:${day} ${timeRest}`;
}

function extractProjectMetadata(sourceMeta, requestedTags) {
  const projectMetadata = {};
  const missingFromSource = [];

  for (const tag of requestedTags) {
    const value = sourceMeta[tag];
    let normalized = normalizeMetadataValue(value);
    if (tag === 'Timestamp') normalized = normalizeProjectTimestampForJpeg(normalized);
    if (normalized) {
      projectMetadata[tag] = normalized;
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
  const preservedDirectXmp = [];
  const preservedInEmbeddedJson = [];
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
      preservedDirectXmp.push(tag);
      continue;
    }

    if (embeddedValue && embeddedValue === sourceValue) {
      preservedInEmbeddedJson.push(tag);
      continue;
    }

    if (!directValue && !embeddedValue) {
      missing.push(tag);
    } else {
      mismatched.push(`${tag}: source='${sourceValue}' JPEG/direct='${directValue}' JPEG/embedded='${embeddedValue}'`);
    }
  }

  return { checked, preservedDirectXmp, preservedInEmbeddedJson, missing, mismatched };
}

function compareExactXmpTags(sourceMeta, jpegMeta, requestedTags) {
  const exactMatches = [];
  const missing = [];
  const mismatched = [];

  for (const tag of requestedTags) {
    const sourceValue = normalizeMetadataValue(sourceMeta[tag]);
    if (!sourceValue) continue;
    const jpegValue = normalizeMetadataValue(jpegMeta[tag]);

    if (!jpegValue) {
      missing.push(tag);
    } else if (jpegValue === sourceValue) {
      exactMatches.push(tag);
    } else {
      mismatched.push(`${tag}: source='${sourceValue}' JPEG/XMP='${jpegValue}'`);
    }
  }

  return { exactMatches, missing, mismatched };
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

async function getMetadataTextWithFamily1(filePath) {
  const result = await runCommand(resolvedExifTool, ['-G1', '-a', '-s', filePath]);
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

function backupOriginalPathFor(destinationFile) {
  return `${destinationFile}_original`;
}

function cleanSamplingFactor(value) {
  const allowed = new Set(['4:2:0', '4:2:2', '4:4:4']);
  return allowed.has(value) ? value : '4:2:0';
}

function buildXmpWriteArgs(projectMetadata, configPath, destinationFile) {
  const args = [];
  if (configPath) args.push('-config', configPath);
  args.push('-overwrite_original');

  for (const [tag, value] of Object.entries(projectMetadata)) {
    args.push(`-XMP-Sprout:${tag}=${normalizeMetadataValue(value)}`);
  }

  args.push(destinationFile);
  return args;
}

function buildAdvancedExifWriteArgs(advancedEdits, destinationFile) {
  const args = ['-overwrite_original'];

  for (const [field, value] of Object.entries(advancedEdits || {})) {
    const tagName = ADVANCED_EXIF_TAG_MAP[field];
    const normalized = normalizeMetadataValue(value);
    if (tagName && normalized) {
      args.push(`-${tagName}=${normalized}`);
    }
  }

  args.push(destinationFile);
  return args.length > 2 ? args : [];
}

function parseProjectTimestamp(value) {
  const original = normalizeMetadataValue(value);
  if (!original) return null;

  // Accept common project formats such as:
  // 2025-02-28T11:16:11.072-0500
  // 2025:02:28 11:16:11.072-0500
  // 2025-02-28 11:16:11
  const match = original.match(/^(\d{4})[-:](\d{2})[-:](\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, subsec = ''] = match;
  return {
    original,
    exifDate: `${year}:${month}:${day} ${hour}:${minute}:${second}`,
    subsec
  };
}

function buildExifDateSyncArgs(projectMetadata, destinationFile) {
  const parsed = parseProjectTimestamp(projectMetadata.Timestamp);
  if (!parsed) return { args: [], parsed: null };

  const args = [
    '-overwrite_original',
    `-EXIF:DateTimeOriginal=${parsed.exifDate}`,
    `-EXIF:CreateDate=${parsed.exifDate}`,
    `-EXIF:ModifyDate=${parsed.exifDate}`
  ];

  if (parsed.subsec) {
    args.push(`-EXIF:SubSecTimeOriginal=${parsed.subsec}`);
    args.push(`-EXIF:SubSecTimeDigitized=${parsed.subsec}`);
  }

  args.push(destinationFile);
  return { args, parsed };
}

function buildEditorRows(metadataRows) {
  return metadataRows.map((row, index) => ({
    Index: index + 1,
    FileName: path.basename(row.SourceFile),
    FilePath: row.SourceFile,
    FileType: normalizeMetadataValue(row.FileType),
    MIMEType: normalizeMetadataValue(row.MIMEType),
    ImageWidth: normalizeMetadataValue(row.ImageWidth),
    ImageHeight: normalizeMetadataValue(row.ImageHeight),
    ImageSize: normalizeMetadataValue(row.ImageSize),
    FileSize: normalizeMetadataValue(row.FileSize),
    EncodingProcess: normalizeMetadataValue(row.EncodingProcess),
    BitsPerSample: normalizeMetadataValue(row.BitsPerSample),
    ColorComponents: normalizeMetadataValue(row.ColorComponents),
    YCbCrSubSampling: normalizeMetadataValue(row.YCbCrSubSampling),
    Timestamp: normalizeMetadataValue(row.Timestamp),
    'Location-index': normalizeMetadataValue(row['Location-index']),
    CameraType: normalizeMetadataValue(row.CameraType),
    ImagingDevice: normalizeMetadataValue(row.ImagingDevice),
    CameraTableLocation: normalizeMetadataValue(row.CameraTableLocation),
    BaselineHeight: normalizeMetadataValue(row.BaselineHeight),
    Ptz: normalizeMetadataValue(row.Ptz),
    PtzParameters: normalizeMetadataValue(row.PtzParameters),
    RoomCoordinates: normalizeMetadataValue(row.RoomCoordinates),
    Location: normalizeMetadataValue(row.Location),
    Make: normalizeMetadataValue(row.Make),
    Model: normalizeMetadataValue(row.Model),
    Software: normalizeMetadataValue(row.Software),
    ExposureTime: normalizeMetadataValue(row.ExposureTime),
    SerialNumber: normalizeMetadataValue(row.SerialNumber),
    ColorSpace: normalizeMetadataValue(row.ColorSpace),
    DateTimeOriginal: normalizeMetadataValue(row.DateTimeOriginal),
    CreateDate: normalizeMetadataValue(row.CreateDate),
    ModifyDate: normalizeMetadataValue(row.ModifyDate),
    XResolution: normalizeMetadataValue(row.XResolution),
    YResolution: normalizeMetadataValue(row.YResolution),
    ResolutionUnit: normalizeMetadataValue(row.ResolutionUnit)
  }));
}

ipcMain.handle('check-dependencies', async () => {
  const magick = resolveTool('magick', ['-version']);
  const exiftool = resolveTool('exiftool', ['-ver']);
  const configPath = await getExifToolConfigPath();

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
    },
    exiftoolConfig: {
      ok: Boolean(configPath),
      path: configPath
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

ipcMain.handle('select-template-jpeg', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select real JPEG metadata template',
    properties: ['openFile'],
    filters: [
      { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) return { canceled: true, file: '' };
  const selected = result.filePaths[0];
  if (!isJpeg(selected)) return { canceled: true, file: '' };
  return { canceled: false, file: selected };
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select output folder',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths.length) return { canceled: true, folder: '' };
  return { canceled: false, folder: result.filePaths[0] };
});

ipcMain.handle('select-image-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select images to view/edit metadata',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) return { canceled: true, files: [] };
  return { canceled: false, files: result.filePaths.filter(isImage), sourceRoot: '' };
});

ipcMain.handle('select-image-folder', async (_, recursive) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a folder containing JPEG/PNG images',
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths.length) return { canceled: true, files: [], sourceRoot: '' };

  const sourceRoot = result.filePaths[0];
  const files = await walkForImages(sourceRoot, recursive);
  return { canceled: false, files, sourceRoot };
});

ipcMain.handle('read-image-metadata', async (_, files) => {
  const depCheck = resolveTool('exiftool', ['-ver']);
  if (!depCheck.ok) throw new Error('ExifTool is missing. Install ExifTool or place exiftool.exe in the app tools folder.');
  resolvedExifTool = depCheck.command;

  const imageFiles = Array.isArray(files) ? files.filter(isImage) : [];
  const rows = [];
  const errors = [];

  for (const file of imageFiles) {
    try {
      const meta = await getMetadataJson(file);
      rows.push({ SourceFile: file, ...meta });
    } catch (error) {
      errors.push({ file, error: error.message });
    }
  }

  return { rows: buildEditorRows(rows), errors };
});


ipcMain.handle('read-full-metadata', async (_, file) => {
  const depCheck = resolveTool('exiftool', ['-ver']);
  if (!depCheck.ok) throw new Error('ExifTool is missing. Install ExifTool or place exiftool.exe in the app tools folder.');
  resolvedExifTool = depCheck.command;

  if (!file || !isImage(file)) throw new Error('Select a PNG/JPEG image file first.');
  const text = await getMetadataText(file);
  return { file, text };
});


ipcMain.handle('get-image-preview', async (_, file) => {
  if (!file || !isImage(file)) throw new Error('Select a PNG/JPEG image file first.');
  const data = await fsp.readFile(file);
  const mime = isPng(file) ? 'image/png' : 'image/jpeg';
  return { file, dataUrl: `data:${mime};base64,${data.toString('base64')}` };
});

ipcMain.handle('apply-metadata-edits', async (_, payload) => {
  const depCheck = resolveTool('exiftool', ['-ver']);
  if (!depCheck.ok) throw new Error('ExifTool is missing. Install ExifTool or place exiftool.exe in the app tools folder.');
  resolvedExifTool = depCheck.command;

  const configPath = await getExifToolConfigPath();
  if (!configPath) throw new Error('Missing exiftool_config. This file is required to write the project XMP tags.');

  const files = Array.isArray(payload.files) ? payload.files.filter(isImage) : [];
  const rawProjectEdits = payload.projectEdits || payload.edits || {};
  const rawAdvancedEdits = payload.advancedEdits || {};
  const projectEdits = {};
  const advancedEdits = {};

  for (const tag of DEFAULT_PROJECT_TAGS) {
    let value = normalizeMetadataValue(rawProjectEdits[tag]);
    if (tag === 'Timestamp') value = normalizeProjectTimestampForJpeg(value);
    if (value) projectEdits[tag] = value;
  }

  for (const tag of DEFAULT_ADVANCED_TAGS) {
    const value = normalizeMetadataValue(rawAdvancedEdits[tag]);
    if (value) advancedEdits[tag] = value;
  }

  if (!files.length) throw new Error('No images selected for metadata editing.');
  if (!Object.keys(projectEdits).length && !Object.keys(advancedEdits).length) {
    throw new Error('No non-empty metadata fields were provided.');
  }

  const rows = [];
  const reportStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(path.dirname(files[0]), `_metadata_edit_report_${reportStamp}`);
  const backupDir = path.join(reportDir, 'backups');
  await fsp.mkdir(reportDir, { recursive: true });
  if (payload.backupBeforeEdit !== false) await fsp.mkdir(backupDir, { recursive: true });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const row = {
      File: file,
      Status: 'Unknown',
      ProjectFieldsUpdated: Object.keys(projectEdits).join('; '),
      AdvancedFieldsUpdated: Object.keys(advancedEdits).join('; '),
      BackupFile: '',
      DateSyncStatus: '',
      Error: ''
    };

    try {
      if (payload.backupBeforeEdit !== false) {
        const safeName = `${String(i + 1).padStart(4, '0')}_${path.basename(file)}`;
        const backupFile = path.join(backupDir, safeName);
        await fsp.copyFile(file, backupFile);
        row.BackupFile = backupFile;
      }

      if (Object.keys(projectEdits).length) {
        const args = buildXmpWriteArgs(projectEdits, configPath, file);
        await runCommand(resolvedExifTool, args);
      }

      if (Object.keys(advancedEdits).length) {
        const args = buildAdvancedExifWriteArgs(advancedEdits, file);
        if (args.length) await runCommand(resolvedExifTool, args);
      }

      if (projectEdits.Timestamp && payload.syncExifDates) {
        const { args: dateArgs, parsed } = buildExifDateSyncArgs(projectEdits, file);
        if (parsed && dateArgs.length) {
          await runCommand(resolvedExifTool, dateArgs);
          row.DateSyncStatus = `EXIF date fields synced from Timestamp: ${parsed.exifDate}`;
        } else {
          row.DateSyncStatus = 'Timestamp was edited but could not be parsed into EXIF format';
        }
      } else if (projectEdits.Timestamp) {
        row.DateSyncStatus = 'Timestamp edited; EXIF date sync skipped by user setting';
      }

      row.Status = 'Updated';
    } catch (error) {
      row.Status = 'Failed';
      row.Error = error.message;
    }

    rows.push(row);
  }

  const reportPath = path.join(reportDir, 'metadata_edit_report.csv');
  await fsp.writeFile(reportPath, toCsv(rows), 'utf8');

  return { reportPath, reportDir, rows };
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
  const configPath = await getExifToolConfigPath();

  if (!configPath) {
    throw new Error('Missing exiftool_config. This file is required in v4 to write the custom Sprout XMP fields individually.');
  }

  const files = Array.isArray(options.files) ? options.files.filter(isPng) : [];
  if (!files.length) throw new Error('No PNG files selected.');
  if (!options.outputDir) throw new Error('No output folder selected.');

  const templateFile = options.templateFile && isJpeg(options.templateFile) ? options.templateFile : '';
  let templateMeta = null;
  if (templateFile) {
    try {
      await fsp.access(templateFile);
      templateMeta = await getMetadataJson(templateFile);
    } catch (error) {
      throw new Error(`Template JPEG could not be read: ${error.message}`);
    }
  }

  const quality = String(Number(options.quality || 95));
  const background = options.background || 'white';
  const samplingFactor = cleanSamplingFactor(options.samplingFactor || '4:2:0');
  const embedJsonBackup = Boolean(options.embedJsonBackup);
  const syncExifDatesFromProjectTimestamp = options.syncExifDatesFromProjectTimestamp !== false;
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
      RequestedJpegQuality: quality,
      RequestedChromaSampling: samplingFactor,
      TemplateMode: templateFile ? 'Yes' : 'No',
      TemplateFile: templateFile,
      TemplateCopied: '',
      DateSyncMode: syncExifDatesFromProjectTimestamp ? 'Sync EXIF date fields from PNG/project Timestamp' : 'Keep template EXIF date fields',
      DateSyncSourceTimestamp: '',
      DateSyncExifDate: '',
      DateSyncStatus: '',
      ActualJpegSubSampling: '',
      RequiredTagsChecked: '',
      MissingFromSourcePNG: '',
      PreservedAsIndividualXmpTags: '',
      MissingIndividualXmpTags: '',
      MismatchedIndividualXmpTags: '',
      PreservedInEmbeddedJsonBackup: '',
      MissingFromJpegOverall: '',
      MismatchedFieldsOverall: '',
      XmpWriteStatus: '',
      EmbeddedBackupLocations: embedJsonBackup ? 'JPEG Comment; EXIF UserComment; EXIF ImageDescription; XMP Description; sidecar JSON' : 'Sidecar JSON only - embedded JPEG backup disabled for strict metadata emulation',
      Error: ''
    };

    try {
      await fsp.mkdir(path.dirname(destinationFile), { recursive: true });

      await runCommand(resolvedMagick, [
        sourceFile,
        '-background', background,
        '-alpha', 'remove',
        '-alpha', 'off',
        '-sampling-factor', samplingFactor,
        '-quality', quality,
        destinationFile
      ]);

      if (templateFile) {
        // v4 template emulation: copy the real JPEG metadata shell first.
        // PNG-specific project fields are written afterward and overwrite matching template XMP fields.
        await runCommand(resolvedExifTool, [
          '-overwrite_original',
          '-TagsFromFile', templateFile,
          '-all:all',
          '-icc_profile',
          destinationFile
        ]);
        row.TemplateCopied = 'Yes - real JPEG template metadata copied before PNG project-field overwrite';
      } else {
        // No-template fallback: preserve whatever standard metadata ExifTool can safely map from the PNG.
        await runCommand(resolvedExifTool, [
          '-overwrite_original',
          '-TagsFromFile', sourceFile,
          '-all:all',
          '-icc_profile',
          destinationFile
        ]);
        row.TemplateCopied = 'No template selected - copied source PNG metadata only';
      }

      const sourceMeta = await getMetadataJson(sourceFile);
      const { projectMetadata, missingFromSource } = extractProjectMetadata(sourceMeta, requestedTags);

      const embeddedPayload = {
        metadataSchema: 'png-to-jpeg-project-metadata-v4.1',
        targetFormat: templateFile ? 'JPEG with template metadata shell and individual XMP-Sprout fields; optional embedded JSON disabled by default' : 'JPEG with individual XMP-Sprout fields; optional embedded JSON disabled by default',
        sourceFileName: path.basename(sourceFile),
        outputFileName: path.basename(destinationFile),
        createdAt: new Date().toISOString(),
        templateFileName: templateFile ? path.basename(templateFile) : '',
        note: templateFile ? 'v4.1: Metadata shell is copied from the real JPEG template, then PNG project fields overwrite matching XMP tags. Sidecar JSON is always created; embedded JPEG JSON backup is optional and disabled by default for stricter real-JPEG emulation.' : 'No template selected. Project fields are written as individual XMP tags. Sidecar JSON is always created; embedded JPEG JSON backup is optional and disabled by default.',
        projectMetadata
      };

      const embeddedJson = JSON.stringify(embeddedPayload);
      await fsp.writeFile(sidecarFile, JSON.stringify(embeddedPayload, null, 2), 'utf8');

      // Important v3 pass: write each project field as its own XMP tag.
      if (Object.keys(projectMetadata).length) {
        await runCommand(resolvedExifTool, buildXmpWriteArgs(projectMetadata, configPath, destinationFile));
        row.XmpWriteStatus = 'XMP individual tags written';
      } else {
        row.XmpWriteStatus = 'No project metadata found in source PNG to write';
      }

      if (syncExifDatesFromProjectTimestamp) {
        const { args: dateArgs, parsed } = buildExifDateSyncArgs(projectMetadata, destinationFile);
        row.DateSyncSourceTimestamp = projectMetadata.Timestamp || '';
        if (parsed && dateArgs.length) {
          await runCommand(resolvedExifTool, dateArgs);
          row.DateSyncExifDate = parsed.exifDate;
          row.DateSyncStatus = 'EXIF DateTimeOriginal/CreateDate/ModifyDate synced from project Timestamp';
        } else if (projectMetadata.Timestamp) {
          row.DateSyncStatus = 'Project Timestamp found but could not be parsed into EXIF date format';
        } else {
          row.DateSyncStatus = 'No project Timestamp found to sync';
        }
      } else {
        row.DateSyncStatus = 'Skipped by user setting';
      }

      // Optional backup pass: disabled by default in v4.1 so output JPEGs more closely emulate real current JPEGs.
      // The sidecar JSON is always created for QA traceability.
      if (embedJsonBackup) {
        await runCommand(resolvedExifTool, [
          '-overwrite_original',
          `-Comment=${embeddedJson}`,
          `-UserComment=${embeddedJson}`,
          `-ImageDescription=${embeddedJson}`,
          `-XMP-dc:Description=${embeddedJson}`,
          destinationFile
        ]);
      }

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
      row.ActualJpegSubSampling = normalizeMetadataValue(jpegMeta.YCbCrSubSampling);
      row.MissingFromSourcePNG = missingFromSource.join('; ');

      const exactXmp = compareExactXmpTags(sourceMeta, jpegMeta, requestedTags);
      row.PreservedAsIndividualXmpTags = exactXmp.exactMatches.join('; ');
      row.MissingIndividualXmpTags = exactXmp.missing.join('; ');
      row.MismatchedIndividualXmpTags = exactXmp.mismatched.join(' | ');

      const embeddedFromJpeg = findEmbeddedMetadata(jpegMeta);
      const overallTagResult = compareProjectTags(sourceMeta, jpegMeta, embeddedFromJpeg, requestedTags);

      row.RequiredTagsChecked = overallTagResult.checked.join('; ');
      row.PreservedInEmbeddedJsonBackup = overallTagResult.preservedInEmbeddedJson.join('; ');
      row.MissingFromJpegOverall = overallTagResult.missing.join('; ');
      row.MismatchedFieldsOverall = overallTagResult.mismatched.join(' | ');

      const safeBase = path.basename(sourceFile, path.extname(sourceFile)).replace(/[^a-z0-9_-]/gi, '_');
      const unique = `${String(i + 1).padStart(4, '0')}_${safeBase}`;
      await fsp.writeFile(path.join(dumpsDir, `${unique}_source_png_metadata.txt`), await getMetadataText(sourceFile), 'utf8');
      if (templateFile) {
        await fsp.writeFile(path.join(dumpsDir, `${unique}_template_jpg_metadata.txt`), await getMetadataText(templateFile), 'utf8');
      }
      await fsp.writeFile(path.join(dumpsDir, `${unique}_output_jpg_metadata.txt`), await getMetadataText(destinationFile), 'utf8');
      await fsp.writeFile(path.join(dumpsDir, `${unique}_output_jpg_metadata_G1.txt`), await getMetadataTextWithFamily1(destinationFile), 'utf8');
      await fsp.writeFile(path.join(dumpsDir, `${unique}_embedded_metadata.json`), JSON.stringify(embeddedPayload, null, 2), 'utf8');

      const hasWarnings = row.DimensionsMatch !== 'Yes' || row.MissingIndividualXmpTags || row.MismatchedIndividualXmpTags || row.MissingFromJpegOverall || row.MismatchedFieldsOverall;
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
    'PNG to JPEG Metadata Converter v4.4 - Summary',
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
    'What v4.4 verifies:',
    '1. JPEG dimensions match the source PNG.',
    '2. Standard metadata copy is attempted using ExifTool.',
    '3. If a template JPEG is selected, its EXIF/JFIF/XMP/ICC metadata shell is copied to the output JPEG first.',
    '4. Required custom PNG fields are extracted and written as individual XMP-Sprout tags, overwriting matching template project fields.',
    '5. By default, EXIF date fields are synced from the PNG/project Timestamp so template dates do not conflict with image-specific XMP Timestamp.',
    '6. A sidecar JSON file is always created. Embedded JPEG JSON backup is optional and disabled by default for stricter real-JPEG emulation.',
    '7. The CSV reports PASS/WARNING details for template mode, date sync, individual XMP tags, and optional JSON backup preservation.',
    '',
    'Target project fields based on the current JPEG metadata sample:',
    DEFAULT_PROJECT_TAGS.map((tag) => `- ${tag}`).join('\n'),
    '',
    'v4.4 metadata editor also includes advanced EXIF/template fields behind an Advanced panel:',
    DEFAULT_ADVANCED_TAGS.map((tag) => `- ${tag}`).join('\n'),
    '',
    'Important limitation:',
    'JPEG cannot store PNG transparency. Transparent pixels are flattened against the selected background color.',
    'If the backend requires an exact XMP namespace URI instead of just matching XMP tag names, ask the dev team for the namespace URI and update exiftool_config.'
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
