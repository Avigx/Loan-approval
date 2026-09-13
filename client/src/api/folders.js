import api from './client';

export const listFolders = () => api.get('/folders');
export const createFolder = (data) => api.post('/folders', data);
export const updateFolder = (id, data) => api.put(`/folders/${id}`, data);
export const deleteFolder = (id) => api.delete(`/folders/${id}`);
