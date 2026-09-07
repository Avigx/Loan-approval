import api from './client';

export const listUsers = () => api.get('/users');
export const listClients = () => api.get('/users/clients');
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);
