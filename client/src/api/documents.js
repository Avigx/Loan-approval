import api from './client';

export const searchDocuments = (params) => api.get('/documents/search', { params });
export const viewDocument = (id) => api.get(`/documents/${id}/view`);
export const downloadDocument = (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' });
export const deleteDocument = (id) => api.delete(`/documents/${id}`);
export const getDocumentStats = () => api.get('/documents/stats');
