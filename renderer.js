const state = {
  files: [],
  sourceRoot: '',
  outputDir: ''
};

const $ = (id) => document.getElementById(id);

const checkToolsBtn = $('checkToolsBtn');
const selectFilesBtn = $('selectFilesBtn');
const selectFolderBtn = $('selectFolderBtn');
const selectOutputBtn = $('selectOutputBtn');
const convertBtn = $('convertBtn');
const recursiveInput = $('recursiveInput');
const preserveFoldersInput = $('preserveFoldersInput');
const qualityInput = $('qualityInput');
const samplingInput = $('samplingInput');
const backgroundInput = $('backgroundInput');
const verifyTagsInput = $('verifyTagsInput');
const magickStatus = $('magickStatus');
const exiftoolStatus = $('exiftoolStatus');
const configStatus = $('configStatus');
const inputSummary = $('inputSummary');
const outputSummary = $('outputSummary');
const progressText = $('progressText');
const progressFill = $('progressFill');
const logOutput = $('logOutput');

function setStatus(element, ok, text) {
  element.className = `status-box ${ok ? 'ok' : 'bad'}`;
  element.textContent = text;
}

function log(message, level = 'info') {
  const time = new Date().toLocaleTimeString();
  logOutput.textContent += `[${time}] ${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function updateInputSummary() {
  if (!state.files.length) {
    inputSummary.textContent = 'No PNG files selected.';
    inputSummary.className = 'summary muted';
    return;
  }

  inputSummary.textContent = `${state.files.length} PNG file(s) selected${state.sourceRoot ? ` from ${state.sourceRoot}` : ''}.`;
  inputSummary.className = 'summary';
}

function updateOutputSummary() {
  if (!state.outputDir) {
    outputSummary.textContent = 'No output folder selected.';
    outputSummary.className = 'summary muted';
    return;
  }

  outputSummary.textContent = state.outputDir;
  outputSummary.className = 'summary';
}

checkToolsBtn.addEventListener('click', async () => {
  checkToolsBtn.disabled = true;
  try {
    const result = await window.converterApi.checkDependencies();

    setStatus(
      magickStatus,
      result.magick.ok,
      result.magick.ok ? `ImageMagick: Found (${result.magick.command})` : 'ImageMagick: Missing'
    );

    setStatus(
      exiftoolStatus,
      result.exiftool.ok,
      result.exiftool.ok ? `ExifTool: Found (${result.exiftool.command})` : 'ExifTool: Missing'
    );

    setStatus(
      configStatus,
      result.exiftoolConfig.ok,
      result.exiftoolConfig.ok ? `ExifTool Config: Found (${result.exiftoolConfig.path})` : 'ExifTool Config: Missing'
    );

    if (result.magick.ok) log(`ImageMagick OK: ${result.magick.version}`, 'success');
    if (result.exiftool.ok) log(`ExifTool OK: ${result.exiftool.version}`, 'success');
    if (result.exiftoolConfig.ok) log(`Custom XMP config OK: ${result.exiftoolConfig.path}`, 'success');
    if (!result.magick.ok || !result.exiftool.ok || !result.exiftoolConfig.ok) {
      log('Missing requirement. Install ImageMagick/ExifTool or confirm exiftool_config is present in the app folder.', 'error');
    }
  } catch (error) {
    log(`Tool check failed: ${error.message}`, 'error');
  } finally {
    checkToolsBtn.disabled = false;
  }
});

selectFilesBtn.addEventListener('click', async () => {
  const result = await window.converterApi.selectPngFiles();
  if (!result.canceled) {
    state.files = result.files;
    state.sourceRoot = '';
    updateInputSummary();
    log(`Selected ${state.files.length} PNG file(s).`);
  }
});

selectFolderBtn.addEventListener('click', async () => {
  const result = await window.converterApi.selectPngFolder(recursiveInput.checked);
  if (!result.canceled) {
    state.files = result.files;
    state.sourceRoot = result.sourceRoot;
    updateInputSummary();
    log(`Selected folder. Found ${state.files.length} PNG file(s).`);
  }
});

selectOutputBtn.addEventListener('click', async () => {
  const result = await window.converterApi.selectOutputFolder();
  if (!result.canceled) {
    state.outputDir = result.folder;
    updateOutputSummary();
    log(`Output folder: ${state.outputDir}`);
  }
});

window.converterApi.onProgress((payload) => {
  const percent = payload.total ? Math.round((payload.index / payload.total) * 100) : 0;
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${payload.index}/${payload.total} (${percent}%)`;
  log(payload.message, payload.level);
});

convertBtn.addEventListener('click', async () => {
  if (!state.files.length) {
    log('Select PNG files or a PNG folder first.', 'error');
    return;
  }

  if (!state.outputDir) {
    log('Select an output folder first.', 'error');
    return;
  }

  convertBtn.disabled = true;
  progressFill.style.width = '0%';
  progressText.textContent = 'Starting...';

  try {
    const result = await window.converterApi.startConversion({
      files: state.files,
      sourceRoot: state.sourceRoot,
      outputDir: state.outputDir,
      preserveFolders: preserveFoldersInput.checked,
      quality: Number(qualityInput.value || 92),
      samplingFactor: samplingInput.value || '4:2:0',
      background: backgroundInput.value || 'white',
      verifyTags: verifyTagsInput.value || ''
    });

    progressText.textContent = `Done: ${result.successCount} clean, ${result.warningCount} warnings, ${result.failCount} failed`;
    progressFill.style.width = '100%';
    log(`Finished. Report folder: ${result.reportDir}`, 'success');
    log(`CSV report: ${result.reportPath}`, 'success');
  } catch (error) {
    progressText.textContent = 'Failed';
    log(`Conversion failed: ${error.message}`, 'error');
  } finally {
    convertBtn.disabled = false;
  }
});
