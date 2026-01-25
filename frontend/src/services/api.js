import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Health check
export const healthCheck = () => api.get('/health');

// Providers
export const getProviders = () => api.get('/providers').then(res => res.data);
export const getProvider = (id) => api.get(`/providers/${id}`).then(res => res.data);
export const getProviderConfig = () => api.get('/providers/config').then(res => res.data);
export const updateProviderConfig = (config) => api.put('/providers/config', config).then(res => res.data);
export const setActiveProviders = (providerIds) => api.put('/providers/active', { providerIds }).then(res => res.data);
export const setDefaultProvider = (providerId) => api.put('/providers/default', { providerId }).then(res => res.data);
export const toggleProviderActive = (id) => api.post(`/providers/${id}/toggle`).then(res => res.data);
export const setSyncOnInstall = (enabled) => api.put('/providers/sync', { enabled }).then(res => res.data);

// Servers
export const getServers = (provider) => {
    const params = provider ? { provider } : {};
    return api.get('/servers', { params }).then(res => res.data);
};
export const addServer = (data) => api.post('/servers', data).then(res => res.data);
export const updateServer = (id, config) => api.put(`/servers/${encodeURIComponent(id)}`, { config }).then(res => res.data);
export const deleteServer = (id) => api.delete(`/servers/${encodeURIComponent(id)}`).then(res => res.data);
export const toggleServer = (id) => api.post(`/servers/${encodeURIComponent(id)}/toggle`).then(res => res.data);

// Projects
export const getProjects = () => api.get('/projects').then(res => res.data);
export const getProject = (id) => api.get(`/projects/${id}`).then(res => res.data);

// Marketplace
export const getMarketplace = () => api.get('/marketplace').then(res => res.data);
export const installTemplate = (data) => api.post('/marketplace/install', data).then(res => res.data);

export default api;
