const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('converterApi', {
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  selectPngFiles: () => ipcRenderer.invoke('select-png-files'),
  selectPngFolder: (recursive) => ipcRenderer.invoke('select-png-folder', recursive),
  selectTemplateJpeg: () => ipcRenderer.invoke('select-template-jpeg'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  startConversion: (options) => ipcRenderer.invoke('start-conversion', options),

  selectImageFiles: () => ipcRenderer.invoke('select-image-files'),
  selectImageFolder: (recursive) => ipcRenderer.invoke('select-image-folder', recursive),
  readImageMetadata: (files) => ipcRenderer.invoke('read-image-metadata', files),
  readFullMetadata: (file) => ipcRenderer.invoke('read-full-metadata', file),
  applyMetadataEdits: (payload) => ipcRenderer.invoke('apply-metadata-edits', payload),

  onProgress: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on('convert-progress', listener);
    return () => ipcRenderer.removeListener('convert-progress', listener);
  }
});
