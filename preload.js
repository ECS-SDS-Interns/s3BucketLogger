const { contextBridge, ipcRenderer } = require('electron');

// Log when preload script runs
console.log('Preload script executing...');

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    listS3Bucket: (credentials) => {
      console.log('Renderer requesting S3 bucket listing');
      return ipcRenderer.invoke('list-s3-bucket', credentials);
    },
    onProgressUpdate: (callback) => {
      return ipcRenderer.on('progress-update', (_, data) => {
        console.log('Progress update in preload:', data);
        callback(data);
      });
    },
    toggleDevTools: () => ipcRenderer.send('toggle-dev-tools')
  });
  console.log('Electron API exposed successfully');
} catch (error) {
  console.error('Error in preload script:', error);
}