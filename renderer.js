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
  fullMetadata: [],
  mode: 'browse',
  customColumns: null,
  sortKey: null,
  sortDir: 'asc'
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
const selectedPreviewImage = $('selectedPreviewImage');
const selectedPreviewPlaceholder = $('selectedPreviewPlaceholder');
const inspectPreviewImage = $('inspectPreviewImage');
const inspectPreviewPlaceholder = $('inspectPreviewPlaceholder');
const inspectFilename = $('inspectFilename');
const inspectFilename2 = $('inspectFilename2');
const inspectTechnical = $('inspectTechnical');
const inspectSearchInput = $('inspectSearchInput');
const inspectPrevBtn = $('inspectPrevBtn');
const inspectNextBtn = $('inspectNextBtn');
const railProjectFields = $('railProjectFields');
const railInspectBtn = $('railInspectBtn');
const railEditBtn = $('railEditBtn');
const railCollapseBtn = $('railCollapseBtn');
const railShowBtn = $('railShowBtn');
const browseGrid = $('browseGrid');
const editModeCount = $('editModeCount');
const editBannerCount = $('editBannerCount');
const applyCount = $('applyCount');
const bulkEditCount = $('bulkEditCount');
const browseRowCount = $('browseRowCount');
const backToBrowseBtn = $('backToBrowseBtn');
const colsDropdownBtn = $('colsDropdownBtn');
const colsMenu = $('colsMenu');
const colsListProject = $('colsListProject');
const colsListAdvanced = $('colsListAdvanced');
const colsCheckAllProject = $('colsCheckAllProject');
const colsCheckAllAdvanced = $('colsCheckAllAdvanced');
const colsShowAll = $('colsShowAll');
const colsHideAll = $('colsHideAll');
const colsReset = $('colsReset');
const expandSelectedPanelBtn = null;

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

function setStatus(element, ok, text, helpUrl) {
  element.className = `status-box ${ok ? 'ok' : 'bad'}`;
  element.textContent = text;
  if (!ok && helpUrl) {
    element.appendChild(document.createTextNode(' — '));
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'status-link';
    a.textContent = 'Get it';
    a.title = helpUrl;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.converterApi.openExternal(helpUrl);
    });
    element.appendChild(a);
    element.appendChild(document.createTextNode(' · '));
    const setupLink = document.createElement('a');
    setupLink.href = '#';
    setupLink.className = 'status-link';
    setupLink.textContent = 'Setup help';
    setupLink.addEventListener('click', (e) => {
      e.preventDefault();
      openSetup();
    });
    element.appendChild(setupLink);
  }
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
  const n = editorState.files.length;
  editorSummary.textContent = n ? `${n} image(s) loaded${editorState.sourceRoot ? ` from ${editorState.sourceRoot}` : ''}` : 'No images loaded';
  editorSummary.className = n ? '' : 'muted';
  const c = editorState.checkedFiles.size;
  selectionSummary.textContent = `${c} selected`;
  if (editModeCount) editModeCount.textContent = c;
  if (bulkEditCount) bulkEditCount.textContent = c;
  if (editBannerCount) editBannerCount.textContent = `Editing ${c} image${c === 1 ? '' : 's'}`;
  updateApplyCount();
}

function updateApplyCount() {
  if (!applyCount) return;
  const n = editorState.checkedFiles.size || (editorState.selectedIndex >= 0 ? 1 : 0);
  applyCount.textContent = n;
}

function getVisibleRows() {
  const query = metadataSearchInput.value.trim().toLowerCase();
  const cols = getActiveColumns();
  const colKeys = cols.map(([k]) => k);

  let rows = editorState.rows;
  if (query) {
    rows = rows.filter((row) => {
      // FileName is always shown implicitly via filename column or rail; include it always.
      if (String(row.FileName || '').toLowerCase().includes(query)) return true;
      return colKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(query));
    });
  }

  if (editorState.sortKey && colKeys.includes(editorState.sortKey)) {
    const key = editorState.sortKey;
    const dir = editorState.sortDir === 'desc' ? -1 : 1;
    rows = rows.slice().sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const aEmpty = av == null || av === '';
      const bEmpty = bv == null || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;  // empties sink to bottom regardless of direction
      if (bEmpty) return -1;
      const aNum = Number(av);
      const bNum = Number(bv);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && av !== '' && bv !== '') {
        return (aNum - bNum) * dir;
      }
      return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }
  return rows;
}

function renderMetadataTable() {
  const columns = getActiveColumns();
  const sortKey = editorState.sortKey;
  const sortDir = editorState.sortDir;
  const headerCells = columns.map(([key, label]) => {
    const isSorted = sortKey === key;
    const arrow = isSorted ? (sortDir === 'desc' ? '▼' : '▲') : '↕';
    const cls = `sortable${isSorted ? ' sorted' : ''}`;
    return `<th class="${cls}" data-sort-key="${escapeAttr(key)}"><span class="sort-label">${label}</span> <span class="sort-arrow">${arrow}</span></th>`;
  }).join('');
  metadataTableHead.innerHTML = `<tr><th><input id="selectAllVisible" type="checkbox" /></th>${headerCells}</tr>`;

  $$('th.sortable', metadataTableHead).forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort-key');
      if (editorState.sortKey === key) {
        editorState.sortDir = editorState.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        editorState.sortKey = key;
        editorState.sortDir = 'asc';
      }
      renderMetadataTable();
    });
  });

  const rows = getVisibleRows();
  if (browseRowCount) browseRowCount.textContent = `${rows.length} row${rows.length === 1 ? '' : 's'}`;
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
      ${columns.map(([key]) => `<td title="${escapeAttr(row[key])}">${escapeAttr(row[key] ?? '')}</td>`).join('')}
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
    tr.addEventListener('dblclick', () => {
      const idx = Number(tr.getAttribute('data-index'));
      const row = editorState.rows[idx];
      if (!row) return;
      editorState.checkedFiles.clear();
      editorState.checkedFiles.add(row.FilePath);
      selectEditorRow(idx);
      setEditorMode('edit');
    });
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
  if (selectedPreviewPlaceholder) { selectedPreviewPlaceholder.hidden = false; selectedPreviewPlaceholder.textContent = 'Click a row to preview'; }
  if (inspectPreviewImage) { inspectPreviewImage.hidden = true; inspectPreviewImage.removeAttribute('src'); }
  if (inspectPreviewPlaceholder) { inspectPreviewPlaceholder.hidden = false; inspectPreviewPlaceholder.textContent = 'Select an image first'; }
}

async function loadImagePreview(filePath) {
  clearImagePreview();
  if (!filePath) return;

  try {
    const result = await window.converterApi.getImagePreview(filePath);
    if (selectedPreviewImage) { selectedPreviewImage.src = result.dataUrl; selectedPreviewImage.hidden = false; }
    if (selectedPreviewPlaceholder) selectedPreviewPlaceholder.hidden = true;
    if (inspectPreviewImage) { inspectPreviewImage.src = result.dataUrl; inspectPreviewImage.hidden = false; }
    if (inspectPreviewPlaceholder) inspectPreviewPlaceholder.hidden = true;
  } catch (error) {
    if (selectedPreviewPlaceholder) {
      selectedPreviewPlaceholder.hidden = false;
      selectedPreviewPlaceholder.textContent = 'Preview unavailable';
    }
    if (inspectPreviewPlaceholder) {
      inspectPreviewPlaceholder.hidden = false;
      inspectPreviewPlaceholder.textContent = 'Preview unavailable';
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
  const tech = `${row.FileType || 'Image'} \u00b7 ${row.ImageSize || `${row.ImageWidth}x${row.ImageHeight}`} \u00b7 ${row.FileSize || ''}`;
  selectedTechnicalSummary.textContent = tech;
  if (inspectFilename) inspectFilename.textContent = row.FileName;
  if (inspectFilename2) inspectFilename2.textContent = row.FileName;
  if (inspectTechnical) inspectTechnical.textContent = tech;
  editorStatus.textContent = `Selected: ${row.FileName}. Check only the fields you want to apply.`;
  editorStatus.className = 'summary';
  renderRailFields(row);
  renderMetadataTable();
  if (editorState.mode === 'inspect') loadFullMetadataForSelected(false);
  updateApplyCount();
}

function renderRailFields(row) {
  if (!railProjectFields) return;
  const keys = ['Timestamp', 'Location', 'CameraTableLocation', 'ImagingDevice', 'CameraType', 'Location-index'];
  railProjectFields.innerHTML = keys.map((k) => `<span class="k">${k}</span><span class="v">${escapeAttr(truncate(row[k], 40)) || '<em>—</em>'}</span>`).join('');
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
  const query = (inspectSearchInput ? inspectSearchInput.value : '').trim().toLowerCase();
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
    if (switchPanel) setEditorMode('inspect');
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
    setStatus(magickStatus, result.magick.ok, result.magick.ok ? `ImageMagick: Found` : 'ImageMagick: Missing', 'https://imagemagick.org/script/download.php#windows');
    setStatus(exiftoolStatus, result.exiftool.ok, result.exiftool.ok ? `ExifTool: Found` : 'ExifTool: Missing', 'https://exiftool.org/');
    setStatus(configStatus, result.exiftoolConfig.ok, result.exiftoolConfig.ok ? `Config: Found` : 'Config: Missing', 'https://github.com/ValentinnoCruz/PNG-to-JPEG/blob/main/exiftool_config');
    if (result.magick.ok) log(`ImageMagick OK: ${result.magick.version}`);
    if (result.exiftool.ok) log(`ExifTool OK: ${result.exiftool.version}`);
    if (result.exiftoolConfig.ok) log(`Custom XMP config OK: ${result.exiftoolConfig.path}`);
    if (!result.magick.ok || !result.exiftool.ok || !result.exiftoolConfig.ok) {
      log('One or more dependencies are missing. Click "Setup help" on the red box, or use the 🛠 Setup button up top.');
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
    if (Array.isArray(result.skipped) && result.skipped.length) {
      log(`Warning: skipped ${result.skipped.length} inaccessible folder(s)/entrie(s). First few:`);
      result.skipped.slice(0, 5).forEach(s => log(`  - [${s.error}] ${s.path}`));
    }
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
    progressText.textContent = `Done: ${result.successCount} clean, ${result.cosmeticCount || 0} cosmetic, ${result.warningCount} warnings, ${result.failCount} failed`;
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
    if (Array.isArray(result.skipped) && result.skipped.length) {
      editorLog(`Warning: skipped ${result.skipped.length} inaccessible folder(s)/entrie(s). First few:`);
      result.skipped.slice(0, 5).forEach(s => editorLog(`  - [${s.error}] ${s.path}`));
    }
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
  if (!editorState.checkedFiles.size && editorState.selectedIndex >= 0) {
    const row = editorState.rows[editorState.selectedIndex];
    if (row) editorState.checkedFiles.add(row.FilePath);
  }
  setEditorMode('edit');
  editorStatus.textContent = `${editorState.checkedFiles.size} image(s) targeted. Check the fields you want to edit.`;
});
if (expandSelectedPanelBtn) {
  expandSelectedPanelBtn.addEventListener('click', () => {
    editorTab.classList.toggle('details-expanded');
    const expanded = editorTab.classList.contains('details-expanded');
    expandSelectedPanelBtn.textContent = expanded ? '⇔ Standard Details Panel' : '⇔ Expand Details Panel';
  });
}

metadataSearchInput.addEventListener('input', () => { renderMetadataTable(); });
if (inspectSearchInput) inspectSearchInput.addEventListener('input', renderAllMetadata);
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

// === v4.8: column registry, mode switcher, columns dropdown, navigation ===
const ALL_COLUMNS = [
  ['FileName', 'File Name', 'project'],
  ['Timestamp', 'Timestamp', 'project'],
  ['Location', 'Location', 'project'],
  ['CameraTableLocation', 'CameraTableLocation', 'project'],
  ['CameraType', 'CameraType', 'project'],
  ['ImagingDevice', 'ImagingDevice', 'project'],
  ['Location-index', 'Location-index', 'project'],
  ['BaselineHeight', 'BaselineHeight', 'project'],
  ['Ptz', 'Ptz', 'project'],
  ['PtzParameters', 'PtzParameters', 'project'],
  ['RoomCoordinates', 'RoomCoordinates', 'project'],
  ['Make', 'Make', 'advanced'],
  ['Model', 'Model', 'advanced'],
  ['Software', 'Software', 'advanced'],
  ['ExposureTime', 'ExposureTime', 'advanced'],
  ['SerialNumber', 'SerialNumber', 'advanced'],
  ['ColorSpace', 'ColorSpace', 'advanced'],
  ['DateTimeOriginal', 'DateTimeOriginal', 'advanced'],
  ['CreateDate', 'CreateDate', 'advanced'],
  ['ModifyDate', 'ModifyDate', 'advanced'],
  ['XResolution', 'XResolution', 'advanced'],
  ['YResolution', 'YResolution', 'advanced'],
  ['ResolutionUnit', 'ResolutionUnit', 'advanced'],
  ['FileType', 'FileType', 'advanced'],
  ['FileSize', 'FileSize', 'advanced'],
  ['ImageSize', 'ImageSize', 'advanced']
];

function getActiveColumns() {
  if (editorState.viewMode === 'custom' && editorState.customColumns?.length) {
    return editorState.customColumns.map((key) => {
      const col = ALL_COLUMNS.find((c) => c[0] === key);
      return col ? [col[0], col[1]] : [key, key];
    });
  }
  return COLUMN_PRESETS[editorState.viewMode] || COLUMN_PRESETS.project;
}

function buildColumnsDropdown() {
  if (!colsListProject || !colsListAdvanced) return;
  const activeKeys = new Set(getActiveColumns().map(([k]) => k));
  const renderGroup = (kind) => ALL_COLUMNS.filter((c) => c[2] === kind).map(([key, label]) => `
    <label><input type="checkbox" data-col="${key}" ${activeKeys.has(key) ? 'checked' : ''} /> ${label}</label>
  `).join('');
  colsListProject.innerHTML = renderGroup('project');
  colsListAdvanced.innerHTML = renderGroup('advanced');

  const syncGroupHeads = () => {
    const projBoxes = $$('input[data-col]', colsListProject);
    const advBoxes = $$('input[data-col]', colsListAdvanced);
    if (colsCheckAllProject) colsCheckAllProject.checked = projBoxes.length > 0 && projBoxes.every((b) => b.checked);
    if (colsCheckAllAdvanced) colsCheckAllAdvanced.checked = advBoxes.length > 0 && advBoxes.every((b) => b.checked);
  };
  syncGroupHeads();

  $$('input[data-col]', colsMenu).forEach((cb) => {
    cb.addEventListener('change', () => {
      const checked = $$('input[data-col]', colsMenu).filter((b) => b.checked).map((b) => b.getAttribute('data-col'));
      editorState.customColumns = checked;
      editorState.viewMode = 'custom';
      $$('.view-mode').forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-view') === 'custom'));
      const customBtn = document.querySelector('.preset-custom');
      if (customBtn) customBtn.hidden = false;
      renderMetadataTable();
      syncGroupHeads();
    });
  });
}

function toggleGroup(headEl, listEl) {
  if (!headEl || !listEl) return;
  headEl.addEventListener('change', () => {
    $$('input[data-col]', listEl).forEach((cb) => { cb.checked = headEl.checked; });
    const evt = new Event('change');
    const first = listEl.querySelector('input[data-col]');
    if (first) first.dispatchEvent(evt);
  });
}
toggleGroup(colsCheckAllProject, colsListProject);
toggleGroup(colsCheckAllAdvanced, colsListAdvanced);

if (colsDropdownBtn && colsMenu) {
  colsDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = colsMenu.hasAttribute('hidden');
    if (isHidden) { buildColumnsDropdown(); colsMenu.removeAttribute('hidden'); }
    else colsMenu.setAttribute('hidden', '');
  });
  document.addEventListener('click', (e) => {
    if (!colsMenu.hasAttribute('hidden') && !colsMenu.contains(e.target) && e.target !== colsDropdownBtn) {
      colsMenu.setAttribute('hidden', '');
    }
  });
}
if (colsShowAll) colsShowAll.addEventListener('click', () => {
  editorState.customColumns = ALL_COLUMNS.map((c) => c[0]);
  editorState.viewMode = 'custom';
  const customBtn = document.querySelector('.preset-custom');
  if (customBtn) customBtn.hidden = false;
  $$('.view-mode').forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-view') === 'custom'));
  renderMetadataTable();
  buildColumnsDropdown();
});
if (colsHideAll) colsHideAll.addEventListener('click', () => {
  editorState.customColumns = ['FileName'];
  editorState.viewMode = 'custom';
  const customBtn = document.querySelector('.preset-custom');
  if (customBtn) customBtn.hidden = false;
  $$('.view-mode').forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-view') === 'custom'));
  renderMetadataTable();
  buildColumnsDropdown();
});
if (colsReset) colsReset.addEventListener('click', () => {
  editorState.customColumns = null;
  editorState.viewMode = 'project';
  const customBtn = document.querySelector('.preset-custom');
  if (customBtn) customBtn.hidden = true;
  $$('.view-mode').forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-view') === 'project'));
  renderMetadataTable();
  buildColumnsDropdown();
});

// Mode switcher
function setEditorMode(mode) {
  editorState.mode = mode;
  $$('.editor-mode-pill').forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-mode') === mode));
  $$('.editor-screen').forEach((screen) => screen.classList.toggle('active', screen.getAttribute('data-screen') === mode));
  if (mode === 'inspect' && editorState.selectedIndex >= 0) loadFullMetadataForSelected(false);
  updateApplyCount();
}
$$('.editor-mode-pill').forEach((btn) => btn.addEventListener('click', () => setEditorMode(btn.getAttribute('data-mode'))));
if (backToBrowseBtn) backToBrowseBtn.addEventListener('click', () => setEditorMode('browse'));

// Preview rail buttons
if (railInspectBtn) railInspectBtn.addEventListener('click', () => setEditorMode('inspect'));
if (railEditBtn) railEditBtn.addEventListener('click', () => {
  const row = editorState.rows[editorState.selectedIndex];
  if (!row) { editorLog('Select an image first.'); return; }
  editorState.checkedFiles.clear();
  editorState.checkedFiles.add(row.FilePath);
  updateEditorSummary();
  setEditorMode('edit');
});
if (railCollapseBtn) railCollapseBtn.addEventListener('click', () => {
  if (browseGrid) browseGrid.classList.add('collapsed');
  if (railShowBtn) railShowBtn.hidden = false;
});
if (railShowBtn) railShowBtn.addEventListener('click', () => {
  if (browseGrid) browseGrid.classList.remove('collapsed');
  railShowBtn.hidden = true;
});

// Inspect prev/next
if (inspectPrevBtn) inspectPrevBtn.addEventListener('click', () => {
  if (!editorState.rows.length) return;
  const next = Math.max(0, editorState.selectedIndex - 1);
  selectEditorRow(next);
});
if (inspectNextBtn) inspectNextBtn.addEventListener('click', () => {
  if (!editorState.rows.length) return;
  const next = Math.min(editorState.rows.length - 1, editorState.selectedIndex + 1);
  if (editorState.selectedIndex < 0) selectEditorRow(0);
  else selectEditorRow(next);
});

// Keyboard shortcuts: B / E / I
document.addEventListener('keydown', (e) => {
  const tag = (e.target?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!editorTab.classList.contains('active')) return;
  const k = e.key.toLowerCase();
  if (k === 'b') setEditorMode('browse');
  else if (k === 'e') setEditorMode('edit');
  else if (k === 'i') setEditorMode('inspect');
});

// === v4.9.0: Export CSV ===
const exportCsvBtn = $('exportCsvBtn');

function csvEscapeCell(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

if (exportCsvBtn) exportCsvBtn.addEventListener('click', async () => {
  const cols = getActiveColumns();
  const rows = getVisibleRows();
  if (!rows.length) return editorLog('Nothing to export — no rows visible.');

  const header = ['FilePath', ...cols.map(([, label]) => label)];
  const lines = [header.map(csvEscapeCell).join(',')];
  for (const row of rows) {
    const cells = [row.FilePath, ...cols.map(([key]) => row[key] ?? '')];
    lines.push(cells.map(csvEscapeCell).join(','));
  }
  const content = lines.join('\r\n') + '\r\n';

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  try {
    const result = await window.converterApi.saveTextFile({
      title: 'Export Browse table to CSV',
      defaultPath: `browse_export_${stamp}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      content
    });
    if (result.canceled) return editorLog('CSV export canceled.');
    editorLog(`Exported ${rows.length} row(s) to ${result.filePath}`);
  } catch (err) {
    editorLog(`CSV export failed: ${err.message}`);
  }
});

// === v4.9.0: Find & Replace ===
const frFieldSelect = $('frFieldSelect');
const frFindInput = $('frFindInput');
const frReplaceInput = $('frReplaceInput');
const frModeSelect = $('frModeSelect');
const frCaseInput = $('frCaseInput');
const frPreviewBtn = $('frPreviewBtn');
const frApplyBtn = $('frApplyBtn');
const frPreviewOut = $('frPreviewOut');

function populateFindReplaceFields() {
  if (!frFieldSelect) return;
  const groups = [
    ['Project fields', PROJECT_TAGS],
    ['Advanced / EXIF', ADVANCED_TAGS]
  ];
  frFieldSelect.innerHTML = groups.map(([label, tags]) =>
    `<optgroup label="${label}">${tags.map((t) => `<option value="${t}">${t}</option>`).join('')}</optgroup>`
  ).join('');
}
populateFindReplaceFields();

function computeFindReplaceMatches() {
  const field = frFieldSelect?.value || '';
  const findStr = frFindInput?.value ?? '';
  const replaceStr = frReplaceInput?.value ?? '';
  const mode = frModeSelect?.value || 'substring';
  const caseSensitive = !!frCaseInput?.checked;
  if (!field) return { error: 'Pick a field first.' };
  if (!findStr) return { error: 'Provide a value in Find.' };

  const targetSet = editorState.checkedFiles.size ? new Set(editorState.checkedFiles) : null;
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const matches = [];
  for (const row of editorState.rows) {
    if (targetSet && !targetSet.has(row.FilePath)) continue;
    const oldVal = String(row[field] ?? '');
    const hay = caseSensitive ? oldVal : oldVal.toLowerCase();
    const needle = caseSensitive ? findStr : findStr.toLowerCase();
    let newVal;
    if (mode === 'exact') {
      if (hay !== needle) continue;
      newVal = replaceStr;
    } else {
      if (!hay.includes(needle)) continue;
      const re = new RegExp(escapeRe(findStr), caseSensitive ? 'g' : 'gi');
      newVal = oldVal.replace(re, replaceStr);
    }
    if (newVal === oldVal) continue;
    matches.push({ file: row.FilePath, fileName: row.FileName, oldVal, newVal });
  }
  return { field, matches };
}

if (frPreviewBtn) frPreviewBtn.addEventListener('click', () => {
  const result = computeFindReplaceMatches();
  if (result.error) { frPreviewOut.textContent = result.error; return; }
  if (!result.matches.length) { frPreviewOut.textContent = 'No matches.'; return; }
  const sample = result.matches.slice(0, 25).map((m) => `${m.fileName}: "${m.oldVal}" \u2192 "${m.newVal}"`).join('\n');
  const more = result.matches.length > 25 ? `\n\u2026 and ${result.matches.length - 25} more` : '';
  frPreviewOut.textContent = `${result.matches.length} row(s) will change (field: ${result.field}):\n${sample}${more}`;
});

if (frApplyBtn) frApplyBtn.addEventListener('click', async () => {
  const result = computeFindReplaceMatches();
  if (result.error) return editorLog(result.error);
  if (!result.matches.length) return editorLog('No matches for find & replace.');

  const field = result.field;
  const isProject = PROJECT_TAGS.includes(field);
  const confirmed = confirm(`Replace in ${result.matches.length} file(s) — field "${field}".\n\nProceed?`);
  if (!confirmed) return;

  const fileEdits = result.matches.map((m) => ({
    file: m.file,
    projectEdits: isProject ? { [field]: m.newVal } : {},
    advancedEdits: isProject ? {} : { [field]: m.newVal }
  }));

  frApplyBtn.disabled = true;
  try {
    const apiResult = await window.converterApi.applyMetadataEdits({
      fileEdits,
      syncExifDates: editorSyncExifDatesInput.checked,
      backupBeforeEdit: editorBackupInput.checked
    });
    editorLog(`Find & Replace applied to ${result.matches.length} file(s). Report: ${apiResult.reportPath}`);
    frPreviewOut.textContent = `Applied to ${result.matches.length} file(s). Report: ${apiResult.reportPath}`;
    await loadEditorMetadata();
  } catch (err) {
    editorLog(`Find & Replace failed: ${err.message}`);
  } finally {
    frApplyBtn.disabled = false;
  }
});

renderMetadataTable();
updateInputSummary();
updateOutputSummary();
updateTemplateSummary();
updateEditorSummary();

// Top-bar utility actions: version badge, Open Output, About modal
(async () => {
  const versionBadge = document.getElementById('appVersionBadge');
  const aboutVersion = document.getElementById('aboutVersion');
  try {
    const v = await window.converterApi.getAppVersion();
    if (versionBadge) versionBadge.textContent = `v${v}`;
    if (aboutVersion) aboutVersion.textContent = v;
  } catch (_) { /* ignore */ }
})();

const topOpenOutputBtn = document.getElementById('topOpenOutputBtn');
function refreshTopOpenOutput() {
  if (!topOpenOutputBtn) return;
  const hasDir = !!state.outputDir;
  topOpenOutputBtn.disabled = !hasDir;
  topOpenOutputBtn.title = hasDir ? `Open ${state.outputDir}` : 'Pick an output folder first';
}
if (topOpenOutputBtn) {
  topOpenOutputBtn.addEventListener('click', async () => {
    if (!state.outputDir) return;
    const res = await window.converterApi.openPath(state.outputDir);
    if (res && !res.ok) log(`Could not open output folder: ${res.error || 'unknown error'}`);
  });
}
const _origUpdateOutputSummary = updateOutputSummary;
updateOutputSummary = function () { _origUpdateOutputSummary(); refreshTopOpenOutput(); };
refreshTopOpenOutput();

const aboutModal = document.getElementById('aboutModal');
const topAboutBtn = document.getElementById('topAboutBtn');
function openAbout() { if (aboutModal) aboutModal.hidden = false; }
function closeAbout() { if (aboutModal) aboutModal.hidden = true; }
if (topAboutBtn) topAboutBtn.addEventListener('click', openAbout);
document.getElementById('aboutCloseBtn')?.addEventListener('click', closeAbout);
document.getElementById('aboutCloseBtn2')?.addEventListener('click', closeAbout);
document.getElementById('aboutOpenRepoBtn')?.addEventListener('click', () => {
  window.converterApi.openExternal('https://github.com/ValentinnoCruz/PNG-to-JPEG');
});
document.getElementById('aboutOpenSetupBtn')?.addEventListener('click', () => {
  closeAbout();
  openSetup();
});
if (aboutModal) aboutModal.addEventListener('click', (e) => { if (e.target === aboutModal) closeAbout(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && aboutModal && !aboutModal.hidden) closeAbout(); });

// Setup Help modal
const setupModal = document.getElementById('setupModal');
const topSetupBtn = document.getElementById('topSetupBtn');
function openSetup() { if (setupModal) setupModal.hidden = false; }
function closeSetup() { if (setupModal) setupModal.hidden = true; }
if (topSetupBtn) topSetupBtn.addEventListener('click', openSetup);
document.getElementById('setupCloseBtn')?.addEventListener('click', closeSetup);
document.getElementById('setupCloseBtn2')?.addEventListener('click', closeSetup);
if (setupModal) {
  setupModal.addEventListener('click', (e) => { if (e.target === setupModal) closeSetup(); });
  // Intercept any external links in the setup body so they open in the user's browser, not Electron
  setupModal.querySelectorAll('a[data-external]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.converterApi.openExternal(a.getAttribute('href'));
    });
  });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && setupModal && !setupModal.hidden) closeSetup(); });
