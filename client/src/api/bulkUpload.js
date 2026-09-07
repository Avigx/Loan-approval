import api from './client';

export const uploadBatch = (formData) =>
  api.post('/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getBatchStatus = (id) => api.get(`/bulk-upload/${id}/status`);
export const listBatches = () => api.get('/bulk-upload/batches');
export const downloadTemplate = () =>
  api.get('/bulk-upload/template', { responseType: 'blob' });
