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
  selectedIndex: -1,
  checkedFiles: new Set(),
  viewMode: 'project',
  fullMetadata: []
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

const ADVANCED_TAGS = [
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

const COLUMN_PRESETS = {
  project: [
    ['FileName', 'File Name'],
    ['Timestamp', 'Timestamp'],
    ['Location', 'Location'],
    ['CameraType', 'CameraType'],
    ['ImagingDevice', 'ImagingDevice'],
    ['Location-index', 'Location-index'],
    ['BaselineHeight', 'BaselineHeight'],
    ['Ptz', 'Ptz']
  ],
  camera: [
    ['FileName', 'File Name'],
    ['Make', 'Make'],
    ['Model', 'Model'],
    ['Software', 'Software'],
    ['ExposureTime', 'ExposureTime'],
    ['SerialNumber', 'SerialNumber'],
    ['DateTimeOriginal', 'DateTimeOriginal'],
    ['CreateDate', 'CreateDate']
  ],
  technical: [
    ['FileName', 'File Name'],
    ['FileType', 'FileType'],
    ['MIMEType', 'MIMEType'],
    ['ImageSize', 'ImageSize'],
    ['FileSize', 'FileSize'],
    ['YCbCrSubSampling', 'YCbCrSubSampling'],
    ['EncodingProcess', 'EncodingProcess']
  ],
  all: [
    ['FileName', 'File Name'],
    ['FileType', 'Type'],
    ['ImageSize', 'Size'],
    ['Timestamp', 'Timestamp'],
    ['Location', 'Location'],
    ['CameraTableLocation', 'CameraTableLocation'],
    ['CameraType', 'CameraType'],
    ['ImagingDevice', 'ImagingDevice'],
    ['Make', 'Make'],
    ['Model', 'Model'],
    ['Software', 'Software'],
    ['YCbCrSubSampling', 'Chroma']
  ]
};

const $ = (id) => document.getElementById(id);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

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
const qualityValue = $('qualityValue');
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
const clearConvertLogBtn = $('clearConvertLogBtn');

// Editor controls
const selectEditorFilesBtn = $('selectEditorFilesBtn');
const selectEditorFolderBtn = $('selectEditorFolderBtn');
const refreshMetadataBtn = $('refreshMetadataBtn');
const clearEditorBtn = $('clearEditorBtn');
const clearSelectionBtn = $('clearSelectionBtn');
const bulkEditSelectedBtn = $('bulkEditSelectedBtn');
const viewAllMetadataBtn = $('viewAllMetadataBtn');
const editorRecursiveInput = $('editorRecursiveInput');
const editorSummary = $('editorSummary');
const selectionSummary = $('selectionSummary');
const metadataTableHead = $('metadataTableHead');
const metadataTableBody = $('metadataTableBody');
const metadataSearchInput = $('metadataSearchInput');
const editorStatus = $('editorStatus');
const editorLogOutput = $('editorLogOutput');
const clearEditorLogBtn = $('clearEditorLogBtn');
const clearEditFormBtn = $('clearEditFormBtn');
const applySelectedBtn = $('applySelectedBtn');
const editorSyncExifDatesInput = $('editorSyncExifDatesInput');
const editorBackupInput = $('editorBackupInput');
const selectedFileLabel = $('selectedFileLabel');
const selectedCountLabel = $('selectedCountLabel');
const selectedTechnicalSummary = $('selectedTechnicalSummary');
const allMetadataView = $('allMetadataView');
const expandSelectedPanelBtn = $('expandSelectedPanelBtn');
const selectedPreviewImage = $('selectedPreviewImage');
const selectedPreviewPlaceholder = $('selectedPreviewPlaceholder');

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

const advancedInputs = {
  Make: $('editMake'),
  Model: $('editModel'),
  Software: $('editSoftware'),
  ExposureTime: $('editExposureTime'),
  SerialNumber: $('editSerialNumber'),
  ColorSpace: $('editColorSpace'),
  DateTimeOriginal: $('editDateTimeOriginal'),
  CreateDate: $('editCreateDate'),
  ModifyDate: $('editModifyDate'),
  XResolution: $('editXResolution'),
  YResolution: $('editYResolution'),
  ResolutionUnit: $('editResolutionUnit')
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

$$('.rail-step').forEach((button) => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-target');
    $$('.rail-step').forEach((btn) => btn.classList.toggle('active', btn === button));
    $$('.workbench-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === targetId);
    });
  });
});

function updateJobSummary() {
  const summaryInputEl = $('summaryInput');
  const summaryTemplateEl = $('summaryTemplate');
  const summaryOutputEl = $('summaryOutput');
  const summaryQualityEl = $('summaryQuality');
  const summaryChromaEl = $('summaryChroma');
  const summaryExifEl = $('summaryExif');
  if (!summaryInputEl) return;

  const fileCount = state.files.length;
  summaryInputEl.textContent = fileCount ? `${fileCount} PNG${fileCount === 1 ? '' : 's'}` : '0 PNGs';
  summaryInputEl.parentElement.classList.toggle('fulfilled', fileCount > 0);

  const tmpl = state.templateFile ? state.templateFile.split(/[\\/]/).pop() : '';
  summaryTemplateEl.textContent = tmpl || 'Not set';
  summaryTemplateEl.parentElement.classList.toggle('fulfilled', !!tmpl);

  const out = state.outputDir ? state.outputDir.split(/[\\/]/).pop() : '';
  summaryOutputEl.textContent = out || 'Not set';
  summaryOutputEl.parentElement.classList.toggle('fulfilled', !!out);

  if (qualityInput) summaryQualityEl.textContent = qualityInput.value;
  if (samplingInput) summaryChromaEl.textContent = samplingInput.value;
  if (syncExifDatesInput) summaryExifEl.textContent = syncExifDatesInput.checked ? 'On' : 'Off';

  // Rail step completion markers
  const railInput = $('railStateInput');
  const railTemplate = $('railStateTemplate');
  const railSettings = $('railStateSettings');
  if (railInput) {
    railInput.textContent = fileCount > 0 ? '✓' : '○';
    railInput.parentElement.classList.toggle('complete', fileCount > 0);
  }
  if (railTemplate) {
    railTemplate.textContent = tmpl ? '✓' : '○';
    railTemplate.parentElement.classList.toggle('complete', !!tmpl);
  }
  if (railSettings) {
    const settingsReady = !!state.outputDir;
    railSettings.textContent = settingsReady ? '✓' : '○';
    railSettings.parentElement.classList.toggle('complete', settingsReady);
  }
}

function setStatus(element, ok, text) {
  element.className = `status-box ${ok ? 'ok' : 'bad'}`;
  element.textContent = text;
}

function log(message) {
  const time = new Date().toLocaleTimeString();
  if (logOutput.textContent.startsWith('Ready.')) logOutput.textContent = '';
  logOutput.textContent += `[${time}] ${message}\n`;
  logOutput.scrollTop = logOutput.scrollHeight;
}

function editorLog(message) {
  const time = new Date().toLocaleTimeString();
  if (editorLogOutput.textContent.startsWith('Load images')) editorLogOutput.textContent = '';
  editorLogOutput.textContent += `[${time}] ${message}\n`;
  editorLogOutput.scrollTop = editorLogOutput.scrollHeight;
}

function truncate(value, length = 70) {
  const text = String(value || '');
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function updateInputSummary() {
  inputSummary.textContent = state.files.length
    ? `${state.files.length} PNG file(s) selected${state.sourceRoot ? ` from ${state.sourceRoot}` : ''}.`
    : 'No PNG files selected.';
  inputSummary.className = state.files.length ? 'summary' : 'summary muted';
  updateJobSummary();
}

function updateOutputSummary() {
  outputSummary.value = state.outputDir || 'No output folder selected.';
  updateJobSummary();
}

function updateTemplateSummary() {
  templateSummary.textContent = state.templateFile || 'No template JPEG selected.';
  templateSummary.className = state.templateFile ? 'summary' : 'summary muted';
  updateJobSummary();
}

function updateEditorSummary() {
  editorSummary.textContent = editorState.files.length
    ? `${editorState.files.length} image(s) loaded${editorState.sourceRoot ? ` from ${editorState.sourceRoot}` : ''}.`
    : 'No images loaded.';
  editorSummary.className = editorState.files.length ? 'summary' : 'summary muted';
  selectionSummary.textContent = `${editorState.checkedFiles.size} selected`;
}

function getVisibleRows() {
  const query = metadataSearchInput.value.trim().toLowerCase();
  if (!query) return editorState.rows;
  return editorState.rows.filter((row) => {
    const values = [row.FileName, row.Timestamp, row.Location, row.CameraTableLocation, row.ImagingDevice, row.CameraType, row.Make, row.Model, row.Software];
    return values.some((value) => String(value || '').toLowerCase().includes(query));
  });
}

function renderMetadataTable() {
  const columns = COLUMN_PRESETS[editorState.viewMode] || COLUMN_PRESETS.project;
  metadataTableHead.innerHTML = `<tr><th><input id="selectAllVisible" type="checkbox" /></th>${columns.map(([, label]) => `<th>${label}</th>`).join('')}</tr>`;

  const rows = getVisibleRows();
  if (!rows.length) {
    metadataTableBody.innerHTML = `<tr><td colspan="${columns.length + 1}" class="muted">No metadata loaded.</td></tr>`;
    const selectAll = $('selectAllVisible');
    if (selectAll) selectAll.disabled = true;
    updateEditorSummary();
    return;
  }

  metadataTableBody.innerHTML = rows.map((row) => {
    const originalIndex = editorState.rows.indexOf(row);
    const checked = editorState.checkedFiles.has(row.FilePath) ? 'checked' : '';
    const selected = originalIndex === editorState.selectedIndex ? 'selected-row' : '';
    return `<tr data-index="${originalIndex}" class="${selected}">
      <td><input class="row-check" type="checkbox" data-path="${escapeAttr(row.FilePath)}" ${checked} /></td>
      ${columns.map(([key]) => `<td title="${escapeAttr(row[key])}">${truncate(row[key], 56)}</td>`).join('')}
    </tr>`;
  }).join('');

  $$('.row-check', metadataTableBody).forEach((checkbox) => {
    checkbox.addEventListener('click', (event) => {
      event.stopPropagation();
      const filePath = checkbox.getAttribute('data-path');
      if (checkbox.checked) editorState.checkedFiles.add(filePath);
      else editorState.checkedFiles.delete(filePath);
      updateEditorSummary();
    });
  });

  $$('tr[data-index]', metadataTableBody).forEach((tr) => {
    tr.addEventListener('click', () => selectEditorRow(Number(tr.getAttribute('data-index'))));
  });

  const selectAll = $('selectAllVisible');
  if (selectAll) {
    selectAll.checked = rows.every((row) => editorState.checkedFiles.has(row.FilePath));
    selectAll.addEventListener('change', () => {
      for (const row of rows) {
        if (selectAll.checked) editorState.checkedFiles.add(row.FilePath);
        else editorState.checkedFiles.delete(row.FilePath);
      }
      renderMetadataTable();
      updateEditorSummary();
    });
  }

  updateEditorSummary();
}

function escapeAttr(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


function clearImagePreview() {
  if (selectedPreviewImage) {
    selectedPreviewImage.hidden = true;
    selectedPreviewImage.removeAttribute('src');
  }
  if (selectedPreviewPlaceholder) { selectedPreviewPlaceholder.hidden = false; selectedPreviewPlaceholder.textContent = 'Preview'; }
}

async function loadImagePreview(filePath) {
  clearImagePreview();
  if (!filePath || !selectedPreviewImage) return;

  try {
    const result = await window.converterApi.getImagePreview(filePath);
    selectedPreviewImage.src = result.dataUrl;
    selectedPreviewImage.hidden = false;
    if (selectedPreviewPlaceholder) selectedPreviewPlaceholder.hidden = true;
  } catch (error) {
    if (selectedPreviewPlaceholder) {
      selectedPreviewPlaceholder.hidden = false;
      selectedPreviewPlaceholder.textContent = 'Preview unavailable';
    }
  }
}

function selectEditorRow(index) {
  editorState.selectedIndex = index;
  const row = editorState.rows[index];
  if (!row) return;
  loadImagePreview(row.FilePath);

  for (const tag of PROJECT_TAGS) editInputs[tag].value = row[tag] || '';
  for (const tag of ADVANCED_TAGS) advancedInputs[tag].value = row[tag] || '';
  uncheckAllEditFields();

  selectedFileLabel.textContent = row.FileName;
  selectedCountLabel.textContent = `${index + 1} of ${editorState.rows.length}`;
  selectedTechnicalSummary.textContent = `${row.FileType || 'Image'} · ${row.ImageSize || `${row.ImageWidth}x${row.ImageHeight}`} · ${row.FileSize || ''}`;
  editorStatus.textContent = `Selected: ${row.FileName}. Check only the fields you want to apply.`;
  editorStatus.className = 'summary';
  renderMetadataTable();
  loadFullMetadataForSelected(false);
}

function uncheckAllEditFields() {
  $$('.edit-check').forEach((check) => { check.checked = false; });
}

function clearEditForm() {
  for (const input of Object.values(editInputs)) input.value = '';
  for (const input of Object.values(advancedInputs)) input.value = '';
  uncheckAllEditFields();
  editorStatus.textContent = 'Edit fields cleared. No metadata will change until you check fields and apply.';
}

function getCheckedEdits() {
  const projectEdits = {};
  const advancedEdits = {};

  $$('.edit-check').forEach((check) => {
    if (!check.checked) return;
    const kind = check.getAttribute('data-kind');
    const tag = check.getAttribute('data-tag');
    const input = kind === 'project' ? editInputs[tag] : advancedInputs[tag];
    const value = input?.value?.trim() || '';
    if (!value) return;
    if (kind === 'project') projectEdits[tag] = value;
    else advancedEdits[tag] = value;
  });

  return { projectEdits, advancedEdits };
}

function countEdits(payload) {
  return Object.keys(payload.projectEdits).length + Object.keys(payload.advancedEdits).length;
}

function selectedFilesForApply() {
  if (editorState.checkedFiles.size) return Array.from(editorState.checkedFiles);
  const row = editorState.rows[editorState.selectedIndex];
  return row ? [row.FilePath] : [];
}

function parseMetadataText(text) {
  return String(text || '').split(/\r?\n/).map((line) => {
    const match = line.match(/^\[([^\]]+)\]\s+(.+?)\s+:\s?(.*)$/);
    if (!match) return null;
    return { group: match[1], field: match[2].trim(), value: match[3] || '' };
  }).filter(Boolean);
}

function updateMetadataGroupCounts(entries) {
  const counts = entries.reduce((acc, item) => {
    acc[item.group] = (acc[item.group] || 0) + 1;
    return acc;
  }, {});
  for (const id of ['XMP', 'EXIF', 'JFIF', 'File', 'Composite', 'ICC_Profile', 'PNG']) {
    const el = $(`count${id}`);
    if (el) el.textContent = counts[id] || 0;
  }
}

function selectedGroups() {
  return new Set($$('.group-filter').filter((input) => input.checked).map((input) => input.value));
}

function renderAllMetadata() {
  const groups = selectedGroups();
  const query = metadataSearchInput.value.trim().toLowerCase();
  const entries = editorState.fullMetadata.filter((item) => {
    const groupMatch = groups.has(item.group);
    const queryMatch = !query || item.group.toLowerCase().includes(query) || item.field.toLowerCase().includes(query) || item.value.toLowerCase().includes(query);
    return groupMatch && queryMatch;
  });

  if (!entries.length) {
    allMetadataView.innerHTML = '<span class="muted">No metadata matches the current group/search filters.</span>';
    return;
  }

  const grouped = entries.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  allMetadataView.innerHTML = Object.entries(grouped).map(([group, items]) => `
    <details class="meta-group" open>
      <summary>${group} (${items.length})</summary>
      ${items.map((item) => `<div class="meta-row"><b>${escapeAttr(item.field)}</b><span>${escapeAttr(item.value)}</span></div>`).join('')}
    </details>
  `).join('');
}

async function loadFullMetadataForSelected(switchPanel = true) {
  const row = editorState.rows[editorState.selectedIndex];
  if (!row) {
    allMetadataView.innerHTML = '<span class="muted">Select an image first.</span>';
    return;
  }

  try {
    const result = await window.converterApi.readFullMetadata(row.FilePath);
    editorState.fullMetadata = parseMetadataText(result.text);
    updateMetadataGroupCounts(editorState.fullMetadata);
    renderAllMetadata();
    if (switchPanel) setSubPanel('fullMetaPanel');
  } catch (error) {
    allMetadataView.innerHTML = `<span class="muted">Could not read metadata: ${escapeAttr(error.message)}</span>`;
  }
}

function setSubPanel(id) {
  $$('.sub-tab').forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-subtab') === id));
  $$('.sub-panel').forEach((panel) => panel.classList.toggle('active', panel.id === id));
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
    editorState.checkedFiles.clear();
    editorState.fullMetadata = [];
    selectedFileLabel.textContent = 'No image selected.';
    selectedCountLabel.textContent = `0 of ${editorState.rows.length}`;
    selectedTechnicalSummary.textContent = 'Select an image to view details.';
    clearImagePreview();
    allMetadataView.innerHTML = '<span class="muted">Select an image, then click “Open All Metadata Panel.” Use the left group filters to show/hide groups.</span>';
    clearEditForm();
    renderMetadataTable();
    updateEditorSummary();
    editorStatus.textContent = 'Metadata loaded. Select images with checkboxes, then check the fields you want to edit.';
    editorStatus.className = 'summary';
    editorLog(`Loaded metadata for ${editorState.rows.length} image(s).`);
    if (result.errors?.length) editorLog(`${result.errors.length} file(s) had metadata read errors.`);
  } catch (error) {
    editorLog(`Metadata load failed: ${error.message}`);
  } finally {
    refreshMetadataBtn.disabled = false;
  }
}

// Converter events
qualityInput.addEventListener('input', () => {
  qualityValue.textContent = qualityInput.value;
  const heroQuality = $('heroQualityValue');
  if (heroQuality) heroQuality.textContent = qualityInput.value;
  updateJobSummary();
});
samplingInput.addEventListener('change', updateJobSummary);
syncExifDatesInput.addEventListener('change', updateJobSummary);
clearConvertLogBtn.addEventListener('click', () => { logOutput.textContent = ''; });

checkToolsBtn.addEventListener('click', async () => {
  checkToolsBtn.disabled = true;
  try {
    const result = await window.converterApi.checkDependencies();
    setStatus(magickStatus, result.magick.ok, result.magick.ok ? `ImageMagick: Found` : 'ImageMagick: Missing');
    setStatus(exiftoolStatus, result.exiftool.ok, result.exiftool.ok ? `ExifTool: Found` : 'ExifTool: Missing');
    setStatus(configStatus, result.exiftoolConfig.ok, result.exiftoolConfig.ok ? `Config: Found` : 'Config: Missing');
    if (result.magick.ok) log(`ImageMagick OK: ${result.magick.version}`);
    if (result.exiftool.ok) log(`ExifTool OK: ${result.exiftool.version}`);
    if (result.exiftoolConfig.ok) log(`Custom XMP config OK: ${result.exiftoolConfig.path}`);
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
  log('Template JPEG cleared.');
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
  if (!state.files.length) return log('Select PNG files or a PNG folder first.');
  if (!state.outputDir) return log('Select an output folder first.');

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

// Editor events
selectEditorFilesBtn.addEventListener('click', async () => {
  const result = await window.converterApi.selectImageFiles();
  if (!result.canceled) {
    editorState.files = result.files;
    editorState.sourceRoot = '';
    updateEditorSummary();
    editorLog(`Selected ${editorState.files.length} image(s). Loading metadata...`);
    await loadEditorMetadata();
  }
});

selectEditorFolderBtn.addEventListener('click', async () => {
  const result = await window.converterApi.selectImageFolder(editorRecursiveInput.checked);
  if (!result.canceled) {
    editorState.files = result.files;
    editorState.sourceRoot = result.sourceRoot;
    updateEditorSummary();
    editorLog(`Selected folder. Found ${editorState.files.length} image(s). Loading metadata...`);
    await loadEditorMetadata();
  }
});

refreshMetadataBtn.addEventListener('click', loadEditorMetadata);
clearEditFormBtn.addEventListener('click', clearEditForm);
clearEditorLogBtn.addEventListener('click', () => { editorLogOutput.textContent = ''; });
clearEditorBtn.addEventListener('click', () => {
  editorState.files = [];
  editorState.rows = [];
  editorState.checkedFiles.clear();
  editorState.selectedIndex = -1;
  editorState.fullMetadata = [];
  renderMetadataTable();
  updateEditorSummary();
  clearEditForm();
  selectedFileLabel.textContent = 'No image selected.';
  selectedTechnicalSummary.textContent = 'Select an image to view details.';
  clearImagePreview();
  allMetadataView.innerHTML = '<span class="muted">Select an image, then click “Open All Metadata Panel.” Use the left group filters to show/hide groups.</span>';
});
clearSelectionBtn.addEventListener('click', () => {
  editorState.checkedFiles.clear();
  renderMetadataTable();
  updateEditorSummary();
});
bulkEditSelectedBtn.addEventListener('click', () => {
  setSubPanel('projectEditPanel');
  editorStatus.textContent = `${editorState.checkedFiles.size || (editorState.selectedIndex >= 0 ? 1 : 0)} image(s) targeted. Check the fields you want to edit.`;
});
viewAllMetadataBtn.addEventListener('click', () => loadFullMetadataForSelected(true));
if (expandSelectedPanelBtn) {
  expandSelectedPanelBtn.addEventListener('click', () => {
    editorTab.classList.toggle('details-expanded');
    const expanded = editorTab.classList.contains('details-expanded');
    expandSelectedPanelBtn.textContent = expanded ? '⇔ Standard Details Panel' : '⇔ Expand Details Panel';
  });
}

metadataSearchInput.addEventListener('input', () => { renderMetadataTable(); renderAllMetadata(); });
$$('.group-filter').forEach((input) => input.addEventListener('change', renderAllMetadata));
$$('.view-mode').forEach((button) => {
  button.addEventListener('click', () => {
    editorState.viewMode = button.getAttribute('data-view');
    $$('.view-mode').forEach((btn) => btn.classList.toggle('active', btn === button));
    renderMetadataTable();
  });
});
$$('.sub-tab').forEach((button) => button.addEventListener('click', () => setSubPanel(button.getAttribute('data-subtab'))));

// Auto-check field when user types so selective bulk editing is easy.
[...Object.values(editInputs), ...Object.values(advancedInputs)].forEach((input) => {
  input.addEventListener('input', () => {
    const field = $$('.edit-check').find((check) => {
      const tag = check.getAttribute('data-tag');
      return editInputs[tag] === input || advancedInputs[tag] === input;
    });
    if (field) field.checked = true;
  });
});

applySelectedBtn.addEventListener('click', async () => {
  const files = selectedFilesForApply();
  if (!files.length) return editorLog('Select one or more images first.');

  const edits = getCheckedEdits();
  if (!countEdits(edits)) return editorLog('No checked fields with values to apply.');

  const fields = [...Object.keys(edits.projectEdits), ...Object.keys(edits.advancedEdits).map((f) => `Advanced:${f}`)];
  const confirmed = confirm(`Apply ONLY these checked fields to ${files.length} image(s)?\n\n${fields.join(', ')}\n\nAll other metadata fields will remain untouched.`);
  if (!confirmed) return;

  applySelectedBtn.disabled = true;
  try {
    const result = await window.converterApi.applyMetadataEdits({
      files,
      projectEdits: edits.projectEdits,
      advancedEdits: edits.advancedEdits,
      syncExifDates: editorSyncExifDatesInput.checked,
      backupBeforeEdit: editorBackupInput.checked
    });
    editorLog(`Metadata update complete for ${files.length} image(s). Report: ${result.reportPath}`);
    await loadEditorMetadata();
  } catch (error) {
    editorLog(`Update failed: ${error.message}`);
  } finally {
    applySelectedBtn.disabled = false;
  }
});

renderMetadataTable();
updateInputSummary();
updateOutputSummary();
updateTemplateSummary();
updateEditorSummary();
