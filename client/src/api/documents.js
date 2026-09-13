import api from './client';

export const searchDocuments = (params) => api.get('/documents/search', { params });
export const viewDocument = (id) => api.get(`/documents/${id}/view`);
export const downloadDocument = (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' });
export const deleteDocument = (id) => api.delete(`/documents/${id}`);
export const getDocumentStats = () => api.get('/documents/stats');

export const downloadBulkDocuments = async (documentIds) => {
  const { data } = await api.post('/documents/download-bulk', { documentIds }, { responseType: 'blob' });
  const blob = new Blob([data], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'search_results.zip';
  a.click();
  URL.revokeObjectURL(url);
};
