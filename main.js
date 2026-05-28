const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { spawn, spawnSync } = require('child_process');

const APP_ID = 'com.valcruz.pngjpegmetadata';
app.setAppUserModelId(APP_ID);

let mainWindow;
let resolvedMagick = null;
let resolvedExifTool = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
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

  // Packaged app: tools folder copied as extraResources.
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'tools', exeName));
  }

  // Development/source folder.
  candidates.push(path.join(__dirname, 'tools', exeName));

  // PATH fallback.
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

function compareRequestedTags(sourceMeta, destMeta, requestedTags) {
  const problems = [];
  const checked = [];

  for (const rawTag of requestedTags) {
    const tag = rawTag.trim();
    if (!tag) continue;

    const sourceValue = normalizeMetadataValue(sourceMeta[tag]);
    const destValue = normalizeMetadataValue(destMeta[tag]);

    // If source does not have this tag, skip it instead of failing the file.
    if (!sourceValue) continue;

    checked.push(tag);
    if (!destValue) {
      problems.push(`${tag}: source has value but JPEG is missing it`);
    } else if (sourceValue !== destValue) {
      problems.push(`${tag}: source='${sourceValue}' JPEG='${destValue}'`);
    }
  }

  return { checked, problems };
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
  const requestedTags = String(options.verifyTags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
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
      Status: 'Unknown',
      SourceWidth: '',
      SourceHeight: '',
      JpegWidth: '',
      JpegHeight: '',
      DimensionsMatch: '',
      MetadataTagsChecked: '',
      MetadataWarnings: '',
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

      await runCommand(resolvedExifTool, [
        '-overwrite_original',
        '-TagsFromFile', sourceFile,
        '-all:all',
        '-icc_profile',
        destinationFile
      ]);

      const [sourceDims, jpegDims, sourceMeta, jpegMeta] = await Promise.all([
        getDimensions(sourceFile),
        getDimensions(destinationFile),
        getMetadataJson(sourceFile),
        getMetadataJson(destinationFile)
      ]);

      row.SourceWidth = sourceDims.width;
      row.SourceHeight = sourceDims.height;
      row.JpegWidth = jpegDims.width;
      row.JpegHeight = jpegDims.height;
      row.DimensionsMatch = sourceDims.width === jpegDims.width && sourceDims.height === jpegDims.height ? 'Yes' : 'No';

      const tagResult = compareRequestedTags(sourceMeta, jpegMeta, requestedTags);
      row.MetadataTagsChecked = tagResult.checked.join('; ');
      row.MetadataWarnings = tagResult.problems.join(' | ');

      const safeBase = path.basename(sourceFile, path.extname(sourceFile)).replace(/[^a-z0-9_-]/gi, '_');
      const unique = `${String(i + 1).padStart(4, '0')}_${safeBase}`;
      await fsp.writeFile(path.join(dumpsDir, `${unique}_source_png_metadata.txt`), await getMetadataText(sourceFile), 'utf8');
      await fsp.writeFile(path.join(dumpsDir, `${unique}_output_jpg_metadata.txt`), await getMetadataText(destinationFile), 'utf8');

      if (row.DimensionsMatch !== 'Yes' || row.MetadataWarnings) {
        row.Status = 'Converted with warnings';
        warningCount++;
      } else {
        row.Status = 'Converted';
        successCount++;
      }

      event.sender.send('convert-progress', {
        index: i + 1,
        total: files.length,
        file: sourceFile,
        message: `${row.Status}: ${fileLabel}`,
        level: row.Status === 'Converted' ? 'success' : 'warn'
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
    'PNG to JPEG Metadata Converter - Summary',
    `Started: ${startedAt.toString()}`,
    `Finished: ${new Date().toString()}`,
    `Total PNG files: ${files.length}`,
    `Converted cleanly: ${successCount}`,
    `Converted with warnings: ${warningCount}`,
    `Failed: ${failCount}`,
    '',
    `Output folder: ${options.outputDir}`,
    `Report CSV: ${reportPath}`,
    `Metadata dumps: ${dumpsDir}`,
    '',
    'Important:',
    'JPEG cannot store transparency. Transparent PNG pixels were flattened against the selected background color.',
    'The CSV verifies dimensions and the requested metadata tags. Full source/output metadata dumps are included for deeper comparison.'
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
