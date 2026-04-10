const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  pickFile: () => ipcRenderer.invoke('pick-file'),
  compressMedia: (payload) => ipcRenderer.invoke('compress-media', payload)
});
