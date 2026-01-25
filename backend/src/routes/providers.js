import { Router } from 'express';
import { getProvidersInfo, getProvider, humanizePath } from '../providers/index.js';
import {
    getManagerConfig,
    saveManagerConfig,
    setActiveProviders,
    setDefaultProvider,
    setSyncOnInstall,
    toggleProvider
} from '../services/providerConfig.js';

const router = Router();

/**
 * GET /api/providers
 * List all providers with their status and configuration
 */
router.get('/', async (req, res, next) => {
    try {
        const config = await getManagerConfig();
        const providers = await getProvidersInfo(
            config.activeProviders,
            config.defaultProvider
        );
        res.json(providers);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/providers/config
 * Get MCP Manager configuration (active providers, default, sync settings)
 */
router.get('/config', async (req, res, next) => {
    try {
        const config = await getManagerConfig();
        res.json(config);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/providers/config
 * Update MCP Manager configuration
 * Body: { activeProviders?: string[], defaultProvider?: string, syncOnInstall?: boolean }
 */
router.put('/config', async (req, res, next) => {
    try {
        const currentConfig = await getManagerConfig();
        const updates = req.body;

        // Validate activeProviders if provided
        if (updates.activeProviders) {
            if (!Array.isArray(updates.activeProviders)) {
                return res.status(400).json({ error: 'activeProviders must be an array' });
            }
            if (updates.activeProviders.length === 0) {
                return res.status(400).json({ error: 'At least one provider must be active' });
            }
            // Validate each provider ID
            for (const id of updates.activeProviders) {
                if (!getProvider(id)) {
                    return res.status(400).json({ error: `Unknown provider: ${id}` });
                }
            }
        }

        // Validate defaultProvider if provided
        if (updates.defaultProvider) {
            if (!getProvider(updates.defaultProvider)) {
                return res.status(400).json({ error: `Unknown provider: ${updates.defaultProvider}` });
            }
        }

        const newConfig = { ...currentConfig, ...updates };

        // Ensure default is in active list
        if (!newConfig.activeProviders.includes(newConfig.defaultProvider)) {
            newConfig.defaultProvider = newConfig.activeProviders[0];
        }

        await saveManagerConfig(newConfig);
        res.json(newConfig);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/providers/active
 * Set active providers
 * Body: { providerIds: string[] }
 */
router.put('/active', async (req, res, next) => {
    try {
        const { providerIds } = req.body;

        if (!Array.isArray(providerIds)) {
            return res.status(400).json({ error: 'providerIds must be an array' });
        }

        if (providerIds.length === 0) {
            return res.status(400).json({ error: 'At least one provider must be active' });
        }

        // Validate each provider ID
        for (const id of providerIds) {
            if (!getProvider(id)) {
                return res.status(400).json({ error: `Unknown provider: ${id}` });
            }
        }

        await setActiveProviders(providerIds);
        const config = await getManagerConfig();
        res.json({ success: true, activeProviders: config.activeProviders });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/providers/default
 * Set default provider
 * Body: { providerId: string }
 */
router.put('/default', async (req, res, next) => {
    try {
        const { providerId } = req.body;

        if (!providerId) {
            return res.status(400).json({ error: 'providerId is required' });
        }

        if (!getProvider(providerId)) {
            return res.status(400).json({ error: `Unknown provider: ${providerId}` });
        }

        await setDefaultProvider(providerId);
        res.json({ success: true, defaultProvider: providerId });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/providers/:id/toggle
 * Toggle a provider's active state
 */
router.post('/:id/toggle', async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!getProvider(id)) {
            return res.status(404).json({ error: `Unknown provider: ${id}` });
        }

        const newState = await toggleProvider(id);
        res.json({ success: true, active: newState });
    } catch (error) {
        if (error.message.includes('last active provider')) {
            return res.status(400).json({ error: error.message });
        }
        next(error);
    }
});

/**
 * PUT /api/providers/sync
 * Set sync on install setting
 * Body: { enabled: boolean }
 */
router.put('/sync', async (req, res, next) => {
    try {
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled must be a boolean' });
        }

        await setSyncOnInstall(enabled);
        res.json({ success: true, syncOnInstall: enabled });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/providers/:id
 * Get details for a specific provider
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const provider = getProvider(id);

        if (!provider) {
            return res.status(404).json({ error: `Unknown provider: ${id}` });
        }

        const config = await getManagerConfig();
        const installed = await provider.isInstalled();

        res.json({
            id: provider.id,
            name: provider.name,
            installed,
            active: config.activeProviders.includes(provider.id),
            isDefault: config.defaultProvider === provider.id,
            supportsProjects: provider.supportsProjects(),
            globalConfigPath: humanizePath(provider.globalConfigPath),
            projectConfigPath: provider.projectConfigPath
        });
    } catch (error) {
        next(error);
    }
});

export default router;
