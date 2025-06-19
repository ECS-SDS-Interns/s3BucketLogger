const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // S3 Bucket functions
  listS3Bucket: (credentials) => ipcRenderer.invoke('list-s3-bucket', credentials),
  
  // Local Folder functions
  scanLocalFolder: (options) => ipcRenderer.invoke('scan-local-folder', options),
  
  // Directory selection helpers
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getDefaultDirectory: () => ipcRenderer.invoke('get-default-directory'),
  
  // Progress updates
  onProgressUpdate: (callback) => ipcRenderer.on('progress-update', (_, data) => callback(data))
});