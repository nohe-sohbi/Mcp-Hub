import axios from 'axios';
import demo from './demoData';

const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ---------------------------------------------------------------------------
// Demo mode
//
// The public preview has no reliable backend, so the app would otherwise look
// "broken" (empty states everywhere). To keep every feature clickable we fall
// back to a fully client-side demo store whenever a real request fails.
//
//   VITE_DEMO_MODE === 'true'   -> always use the demo store (never hit /api)
//   VITE_DEMO_MODE === 'false'  -> never use the demo store (real backend only)
//   unset / 'auto' (default)    -> try the real backend, fall back to demo on
//                                  the first failure and stay in demo for the
//                                  rest of the session.
// ---------------------------------------------------------------------------

const DEMO_FLAG = import.meta.env.VITE_DEMO_MODE;
const FORCE_DEMO = DEMO_FLAG === 'true';
const FORCE_REAL = DEMO_FLAG === 'false';

let demoActive = FORCE_DEMO;

export const isDemoMode = () => demoActive;

function activateDemo() {
    if (!demoActive) {
        demoActive = true;
        // Surface it for debugging / quick checks in the console.
        if (typeof window !== 'undefined') window.__MCP_DEMO__ = true;
        console.info('[MCP Manager] Backend unreachable — switched to demo mode.');
    }
}

/**
 * Run a real API call, transparently falling back to the demo handler.
 * @param {() => Promise<any>} realFn   call against the live backend
 * @param {() => Promise<any>} demoFn   equivalent demo-store handler
 */
async function withDemo(realFn, demoFn) {
    if (demoActive) return demoFn();
    if (FORCE_REAL) return realFn();
    try {
        return await realFn();
    } catch {
        activateDemo();
        return demoFn();
    }
}

// Health check
export const healthCheck = () => withDemo(
    () => api.get('/health'),
    () => demo.healthCheck()
);

// Providers
export const getProviders = () => withDemo(
    () => api.get('/providers').then(res => res.data),
    () => demo.getProviders()
);
export const getProvider = (id) => withDemo(
    () => api.get(`/providers/${id}`).then(res => res.data),
    () => demo.getProviders().then(list => list.find(p => p.id === id) || null)
);
export const getProviderConfig = () => withDemo(
    () => api.get('/providers/config').then(res => res.data),
    () => demo.getProviderConfig()
);
export const updateProviderConfig = (config) => withDemo(
    () => api.put('/providers/config', config).then(res => res.data),
    () => demo.updateProviderConfig(config)
);
export const setActiveProviders = (providerIds) => withDemo(
    () => api.put('/providers/active', { providerIds }).then(res => res.data),
    () => demo.updateProviderConfig({ activeProviders: providerIds })
);
export const setDefaultProvider = (providerId) => withDemo(
    () => api.put('/providers/default', { providerId }).then(res => res.data),
    () => demo.updateProviderConfig({ defaultProvider: providerId })
);
export const toggleProviderActive = (id) => withDemo(
    () => api.post(`/providers/${id}/toggle`).then(res => res.data),
    () => demo.getProviderConfig().then(cfg => {
        const active = cfg.activeProviders.includes(id)
            ? cfg.activeProviders.filter(p => p !== id)
            : [...cfg.activeProviders, id];
        return demo.updateProviderConfig({ activeProviders: active });
    })
);
export const setSyncOnInstall = (enabled) => withDemo(
    () => api.put('/providers/sync', { enabled }).then(res => res.data),
    () => demo.updateProviderConfig({ syncOnInstall: enabled })
);

// Servers
export const getServers = (provider) => withDemo(
    () => {
        const params = provider ? { provider } : {};
        return api.get('/servers', { params }).then(res => res.data);
    },
    () => demo.getServers(provider)
);
export const addServer = (data) => withDemo(
    () => api.post('/servers', data).then(res => res.data),
    () => demo.addServer(data)
);
export const updateServer = (id, config) => withDemo(
    () => api.put(`/servers/${encodeURIComponent(id)}`, { config }).then(res => res.data),
    () => demo.updateServer(id, config)
);
export const deleteServer = (id) => withDemo(
    () => api.delete(`/servers/${encodeURIComponent(id)}`).then(res => res.data),
    () => demo.deleteServer(id)
);
export const toggleServer = (id) => withDemo(
    () => api.post(`/servers/${encodeURIComponent(id)}/toggle`).then(res => res.data),
    () => demo.toggleServer(id)
);

// Projects
export const getProjects = () => withDemo(
    () => api.get('/projects').then(res => res.data),
    () => demo.getProjects()
);
export const getProject = (id) => withDemo(
    () => api.get(`/projects/${id}`).then(res => res.data),
    () => demo.getProject(id)
);

// Marketplace
export const getMarketplace = () => withDemo(
    () => api.get('/marketplace').then(res => res.data),
    () => demo.getMarketplace()
);
export const installTemplate = (data) => withDemo(
    () => api.post('/marketplace/install', data).then(res => res.data),
    () => demo.installTemplate(data)
);

export default api;
