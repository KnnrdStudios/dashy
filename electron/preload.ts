import { contextBridge, ipcRenderer } from 'electron';

const api = {
  tasks: {
    list: (filters?: { date?: string; assigneeId?: number; businessId?: number }) =>
      ipcRenderer.invoke('tasks:list', filters ?? {}),
    listRange: (startDate: string, endDate: string) =>
      ipcRenderer.invoke('tasks:listRange', { startDate, endDate }),
    create: (task: unknown) => ipcRenderer.invoke('tasks:create', task),
    update: (id: number, patch: unknown) => ipcRenderer.invoke('tasks:update', { id, patch }),
    setStatus: (id: number, status: 'pending' | 'done') =>
      ipcRenderer.invoke('tasks:setStatus', { id, status }),
    remove: (id: number) => ipcRenderer.invoke('tasks:remove', id),
    move: (id: number, newDate: string) =>
      ipcRenderer.invoke('tasks:move', { id, newDate }),
  },
  meta: {
    businesses: () => ipcRenderer.invoke('meta:businesses'),
    people: () => ipcRenderer.invoke('meta:people'),
    focusForDate: (isoDate: string) => ipcRenderer.invoke('meta:focusForDate', isoDate),
  },
  quickAdd: {
    onOpen: (cb: () => void) => {
      const listener = () => cb();
      ipcRenderer.on('quick-add:open', listener);
      return () => ipcRenderer.removeListener('quick-add:open', listener);
    },
  },
  export: {
    weekMarkdown: (startDate: string) =>
      ipcRenderer.invoke('export:weekMarkdown', startDate),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
