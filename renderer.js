const state = {
  files: [],
  sourceRoot: '',
  outputDir: '',
  templateFile: ''
};

const editorState = {
  files: [],
  sourceRoot: '',
  rows: [],
  selectedIndex: -1
};

const PROJECT_TAGS = [
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

const $ = (id) => document.getElementById(id);

// Tabs
const convertTabBtn = $('convertTabBtn');
const editorTabBtn = $('editorTabBtn');
const convertTab = $('convertTab');
const editorTab = $('editorTab');

// Converter controls
const checkToolsBtn = $('checkToolsBtn');
const selectFilesBtn = $('selectFilesBtn');
const selectFolderBtn = $('selectFolderBtn');
const selectOutputBtn = $('selectOutputBtn');
const selectTemplateBtn = $('selectTemplateBtn');
const clearTemplateBtn = $('clearTemplateBtn');
const convertBtn = $('convertBtn');
const recursiveInput = $('recursiveInput');
const preserveFoldersInput = $('preserveFoldersInput');
const qualityInput = $('qualityInput');
const samplingInput = $('samplingInput');
const backgroundInput = $('backgroundInput');
const verifyTagsInput = $('verifyTagsInput');
const embedJsonBackupInput = $('embedJsonBackupInput');
const syncExifDatesInput = $('syncExifDatesInput');
const magickStatus = $('magickStatus');
const exiftoolStatus = $('exiftoolStatus');
const configStatus = $('configStatus');
const inputSummary = $('inputSummary');
const outputSummary = $('outputSummary');
const templateSummary = $('templateSummary');
const progressText = $('progressText');
const progressFill = $('progressFill');
const logOutput = $('logOutput');

// Editor controls
const selectEditorFilesBtn = $('selectEditorFilesBtn');
const selectEditorFolderBtn = $('selectEditorFolderBtn');
const refreshMetadataBtn = $('refreshMetadataBtn');
const editorRecursiveInput = $('editorRecursiveInput');
const editorSummary = $('editorSummary');
const metadataTableBody = $('metadataTableBody');
const editorStatus = $('editorStatus');
const editorLogOutput = $('editorLogOutput');
const clearEditFormBtn = $('clearEditFormBtn');
const applySelectedBtn = $('applySelectedBtn');
const applyAllBtn = $('applyAllBtn');
const editorSyncExifDatesInput = $('editorSyncExifDatesInput');

const editInputs = {
  Timestamp: $('editTimestamp'),
  'Location-index': $('editLocationIndex'),
  CameraType: $('editCameraType'),
  ImagingDevice: $('editImagingDevice'),
  CameraTableLocation: $('editCameraTableLocation'),
  BaselineHeight: $('editBaselineHeight'),
  Ptz: $('editPtz'),
  PtzParameters: $('editPtzParameters'),
  RoomCoordinates: $('editRoomCoordinates'),
  Location: $('editLocation')
};

function setActiveTab(tabName) {
  const isEditor = tabName === 'editor';
  convertTabBtn.classList.toggle('active', !isEditor);
  editorTabBtn.classList.toggle('active', isEditor);
  convertTab.classList.toggle('active', !isEditor);
  editorTab.classList.toggle('active', isEditor);
}

convertTabBtn.addEventListener('click', () => setActiveTab('convert'));
editorTabBtn.addEventListener('click', () => setActiveTab('editor'));

function setStatus(element, ok, text) {
  element.className = `status-box ${ok ? 'ok' : 'bad'}`;
  element.textContent = text;
}

function log(message) {
  const time = new Date().toLocaleTimeString();
  logOutput.textContent += `[${time}] ${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function editorLog(message) {
  const time = new Date().toLocaleTimeString();
  editorLogOutput.textContent += `[${time}] ${message}\n`;
  editorLogOutput.scrollTop = editorLogOutput.scrollHeight;
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

function updateTemplateSummary() {
  if (!state.templateFile) {
    templateSummary.textContent = 'No template JPEG selected. Converter will use PNG metadata only.';
    templateSummary.className = 'summary muted';
    return;
  }

  templateSummary.textContent = state.templateFile;
  templateSummary.className = 'summary';
}

function updateEditorSummary() {
  if (!editorState.files.length) {
    editorSummary.textContent = 'No images loaded.';
    editorSummary.className = 'summary muted';
    return;
  }
  editorSummary.textContent = `${editorState.files.length} image(s) loaded${editorState.sourceRoot ? ` from ${editorState.sourceRoot}` : ''}.`;
  editorSummary.className = 'summary';
}

function truncate(value, length = 90) {
  const text = String(value || '');
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function renderMetadataTable() {
  if (!editorState.rows.length) {
    metadataTableBody.innerHTML = '<tr><td colspan="9" class="muted">No metadata loaded.</td></tr>';
    return;
  }

  metadataTableBody.innerHTML = editorState.rows.map((row, index) => `
    <tr data-index="${index}" class="${index === editorState.selectedIndex ? 'selected' : ''}">
      <td>${row.Index}</td>
      <td title="${row.FilePath}">${row.FileName}</td>
      <td>${row.FileType}</td>
      <td>${row.ImageSize}</td>
      <td>${truncate(row.Timestamp, 42)}</td>
      <td>${truncate(row.Location, 52)}</td>
      <td>${truncate(row.CameraTableLocation, 52)}</td>
      <td>${truncate(row.ImagingDevice, 42)}</td>
      <td>${row.BaselineHeight}</td>
    </tr>
  `).join('');

  for (const tr of metadataTableBody.querySelectorAll('tr[data-index]')) {
    tr.addEventListener('click', () => {
      const index = Number(tr.getAttribute('data-index'));
      selectEditorRow(index);
    });
  }
}

function selectEditorRow(index) {
  editorState.selectedIndex = index;
  const row = editorState.rows[index];
  if (!row) return;

  for (const tag of PROJECT_TAGS) {
    editInputs[tag].value = row[tag] || '';
  }

  editorStatus.textContent = `Selected: ${row.FileName}`;
  editorStatus.className = 'summary';
  renderMetadataTable();
}

function clearEditForm() {
  for (const input of Object.values(editInputs)) input.value = '';
  editorStatus.textContent = editorState.selectedIndex >= 0 ? `Selected image remains selected. Form cleared for bulk editing.` : 'No selected image.';
}

function getFilledEdits() {
  const edits = {};
  for (const tag of PROJECT_TAGS) {
    const value = editInputs[tag].value.trim();
    if (value) edits[tag] = value;
  }
  return edits;
}

async function loadEditorMetadata() {
  if (!editorState.files.length) {
    editorLog('Select images or an image folder first.');
    return;
  }

  refreshMetadataBtn.disabled = true;
  try {
    const result = await window.converterApi.readImageMetadata(editorState.files);
    editorState.rows = result.rows || [];
    editorState.selectedIndex = -1;
    renderMetadataTable();
    updateEditorSummary();
    editorStatus.textContent = 'Metadata loaded. Click a row to edit one image, or fill fields manually for bulk editing.';
    editorStatus.className = 'summary';
    editorLog(`Loaded metadata for ${editorState.rows.length} image(s).`);
    if (result.errors?.length) editorLog(`${result.errors.length} file(s) had metadata read errors.`);
  } catch (error) {
    editorLog(`Metadata load failed: ${error.message}`);
  } finally {
    refreshMetadataBtn.disabled = false;
  }
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

    if (result.magick.ok) log(`ImageMagick OK: ${result.magick.version}`);
    if (result.exiftool.ok) log(`ExifTool OK: ${result.exiftool.version}`);
    if (result.exiftoolConfig.ok) log(`Custom XMP config OK: ${result.exiftoolConfig.path}`);
    if (!result.magick.ok || !result.exiftool.ok || !result.exiftoolConfig.ok) {
      log('Missing requirement. Install ImageMagick/ExifTool or confirm exiftool_config is present in the app folder.');
    }
  } catch (error) {
    log(`Tool check failed: ${error.message}`);
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

selectTemplateBtn.addEventListener('click', async () => {
  const result = await window.converterApi.selectTemplateJpeg();
  if (!result.canceled) {
    state.templateFile = result.file;
    updateTemplateSummary();
    log(`Template JPEG selected: ${state.templateFile}`);
  }
});

clearTemplateBtn.addEventListener('click', () => {
  state.templateFile = '';
  updateTemplateSummary();
  log('Template JPEG cleared. Converter will use PNG metadata only.');
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
  log(payload.message);
});

convertBtn.addEventListener('click', async () => {
  if (!state.files.length) {
    log('Select PNG files or a PNG folder first.');
    return;
  }

  if (!state.outputDir) {
    log('Select an output folder first.');
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
      templateFile: state.templateFile,
      preserveFolders: preserveFoldersInput.checked,
      quality: Number(qualityInput.value || 95),
      samplingFactor: samplingInput.value || '4:2:0',
      background: backgroundInput.value || 'white',
      verifyTags: verifyTagsInput.value || '',
      embedJsonBackup: embedJsonBackupInput.checked,
      syncExifDatesFromProjectTimestamp: syncExifDatesInput.checked
    });

    progressText.textContent = `Done: ${result.successCount} clean, ${result.warningCount} warnings, ${result.failCount} failed`;
    progressFill.style.width = '100%';
    log(`Finished. Report folder: ${result.reportDir}`);
    log(`CSV report: ${result.reportPath}`);
  } catch (error) {
    progressText.textContent = 'Failed';
    log(`Conversion failed: ${error.message}`);
  } finally {
    convertBtn.disabled = false;
  }
});

selectEditorFilesBtn.addEventListener('click', async () => {
  const result = await window.converterApi.selectImageFiles();
  if (!result.canceled) {
    editorState.files = result.files;
    editorState.sourceRoot = '';
    editorState.rows = [];
    editorState.selectedIndex = -1;
    updateEditorSummary();
    renderMetadataTable();
    editorLog(`Selected ${editorState.files.length} image(s). Loading metadata...`);
    await loadEditorMetadata();
  }
});

selectEditorFolderBtn.addEventListener('click', async () => {
  const result = await window.converterApi.selectImageFolder(editorRecursiveInput.checked);
  if (!result.canceled) {
    editorState.files = result.files;
    editorState.sourceRoot = result.sourceRoot;
    editorState.rows = [];
    editorState.selectedIndex = -1;
    updateEditorSummary();
    renderMetadataTable();
    editorLog(`Selected folder. Found ${editorState.files.length} image(s). Loading metadata...`);
    await loadEditorMetadata();
  }
});

refreshMetadataBtn.addEventListener('click', loadEditorMetadata);
clearEditFormBtn.addEventListener('click', clearEditForm);

applySelectedBtn.addEventListener('click', async () => {
  const selected = editorState.rows[editorState.selectedIndex];
  if (!selected) {
    editorLog('Select a row first.');
    return;
  }

  const edits = getFilledEdits();
  if (!Object.keys(edits).length) {
    editorLog('No filled fields to apply.');
    return;
  }

  applySelectedBtn.disabled = true;
  try {
    const result = await window.converterApi.applyMetadataEdits({
      files: [selected.FilePath],
      edits,
      syncExifDates: editorSyncExifDatesInput.checked
    });
    editorLog(`Updated selected image. Report: ${result.reportPath}`);
    await loadEditorMetadata();
  } catch (error) {
    editorLog(`Update failed: ${error.message}`);
  } finally {
    applySelectedBtn.disabled = false;
  }
});

applyAllBtn.addEventListener('click', async () => {
  if (!editorState.files.length) {
    editorLog('No images loaded.');
    return;
  }

  const edits = getFilledEdits();
  if (!Object.keys(edits).length) {
    editorLog('No filled fields to apply.');
    return;
  }

  const fieldList = Object.keys(edits).join(', ');
  const confirmed = confirm(`Apply these filled field(s) to all ${editorState.files.length} loaded image(s)?\n\n${fieldList}`);
  if (!confirmed) return;

  applyAllBtn.disabled = true;
  try {
    const result = await window.converterApi.applyMetadataEdits({
      files: editorState.files,
      edits,
      syncExifDates: editorSyncExifDatesInput.checked
    });
    editorLog(`Bulk update complete. Report: ${result.reportPath}`);
    await loadEditorMetadata();
  } catch (error) {
    editorLog(`Bulk update failed: ${error.message}`);
  } finally {
    applyAllBtn.disabled = false;
  }
});

renderMetadataTable();
