import { Router } from 'express';
import path from 'path';
import {
    getProvider,
    getServersFromProviders,
    addServerToProviders,
    removeServerFromProviders
} from '../providers/index.js';
import {
    getManagerConfig,
    getActiveProviders,
    getDefaultProvider
} from '../services/providerConfig.js';

const router = Router();

/**
 * Parse server ID into components
 * Format: providerId:scope:serverName OR providerId:scope:projectPath:serverName
 * @param {string} id
 * @returns {{ providerId: string, scope: string, scopePath: string|null, serverName: string }}
 */
function parseServerId(id) {
    const parts = id.split(':');
    if (parts.length < 3) {
        throw new Error(`Invalid server ID format: ${id}`);
    }

    const providerId = parts[0];
    const scope = parts[1];

    if (scope === 'global') {
        const serverName = parts.slice(2).join(':');  // Handle server names with colons

        // SECURITY: Prevent prototype pollution
        if (serverName === '__proto__' || serverName === 'constructor' || serverName === 'prototype') {
            throw new Error('Invalid server name: Reserved keyword');
        }

        return {
            providerId,
            scope,
            scopePath: null,
            serverName
        };
    } else {
        // Project scope: providerId:project:projectPath:serverName
        if (parts.length < 4) {
            throw new Error(`Invalid project server ID format: ${id}`);
        }

        const scopePath = decodeURIComponent(parts[2]);

        // SECURITY: Prevent path traversal
        if (!path.isAbsolute(scopePath) || scopePath.includes('..')) {
            throw new Error('Invalid project path: Must be absolute and cannot contain traversal sequences');
        }

        const serverName = decodeURIComponent(parts.slice(3).join(':'));

        // SECURITY: Prevent prototype pollution
        if (serverName === '__proto__' || serverName === 'constructor' || serverName === 'prototype') {
            throw new Error('Invalid server name: Reserved keyword');
        }

        return {
            providerId,
            scope,
            scopePath,
            serverName
        };
    }
}

/**
 * GET /api/servers
 * List all MCP servers from active providers
 * Query params:
 * - provider: Filter by specific provider ID
 */
router.get('/', async (req, res, next) => {
    try {
        const { provider: filterProvider } = req.query;
        const config = await getManagerConfig();

        // Determine which providers to query
        let providerIds = config.activeProviders;
        if (filterProvider) {
            if (!getProvider(filterProvider)) {
                return res.status(400).json({ error: `Unknown provider: ${filterProvider}` });
            }
            providerIds = [filterProvider];
        }

        const servers = await getServersFromProviders(providerIds);
        res.json(servers);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/servers
 * Add new MCP server
 * Body: {
 *   name: string,
 *   config: object,
 *   scope?: 'global' | 'project',
 *   scopePath?: string (required if scope is 'project'),
 *   providers?: string[] (provider IDs to install to)
 * }
 */
router.post('/', async (req, res, next) => {
    try {
        const { name, config, scope = 'global', scopePath, providers } = req.body;

        if (!name || !config) {
            return res.status(400).json({ error: 'Name and config are required' });
        }

        if (typeof name !== 'string') {
            return res.status(400).json({ error: 'Server name must be a string' });
        }

        // SECURITY: Prevent prototype pollution
        if (name === '__proto__' || name === 'constructor' || name === 'prototype') {
            return res.status(400).json({ error: 'Invalid server name: Reserved keyword' });
        }

        if (scope === 'project' && !scopePath) {
            return res.status(400).json({ error: 'scopePath is required for project scope' });
        }

        // SECURITY: Prevent path traversal
        if (scope === 'project' && (!path.isAbsolute(scopePath) || scopePath.includes('..'))) {
            return res.status(400).json({ error: 'Invalid project path: Must be absolute and cannot contain traversal sequences' });
        }

        // Determine target providers
        let targetProviders;
        if (providers && providers.length > 0) {
            // Validate provider IDs
            for (const id of providers) {
                if (!getProvider(id)) {
                    return res.status(400).json({ error: `Unknown provider: ${id}` });
                }
            }
            targetProviders = providers;
        } else {
            // Use default provider or all active if syncOnInstall is enabled
            const managerConfig = await getManagerConfig();
            if (managerConfig.syncOnInstall) {
                targetProviders = managerConfig.activeProviders;
            } else {
                targetProviders = [managerConfig.defaultProvider];
            }
        }

        const results = await addServerToProviders(name, config, scope, scopePath, targetProviders);

        // Check if any succeeded
        const successes = results.filter(r => r.success);
        const failures = results.filter(r => !r.success);

        if (successes.length === 0) {
            return res.status(500).json({
                error: 'Failed to add server to any provider',
                details: failures
            });
        }

        res.status(201).json({
            success: true,
            message: `Server '${name}' added to ${successes.length} provider(s)`,
            serverName: name,
            results
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/servers/:id
 * Update MCP server configuration
 * Body: { config: object }
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { config } = req.body;

        if (!config) {
            return res.status(400).json({ error: 'Config is required' });
        }

        const { providerId, scope, scopePath, serverName } = parseServerId(decodeURIComponent(id));
        const provider = getProvider(providerId);

        if (!provider) {
            return res.status(404).json({ error: `Unknown provider: ${providerId}` });
        }

        // Get current config, update, and save
        if (scope === 'global') {
            const globalConfig = await provider.getGlobalConfig();
            const servers = provider.extractServers(globalConfig);

            if (!servers[serverName]) {
                return res.status(404).json({ error: `Server '${serverName}' not found` });
            }

            servers[serverName] = { ...servers[serverName], ...config };
            const updatedConfig = provider.injectServers(globalConfig, servers);
            await provider.saveGlobalConfig(updatedConfig);
        } else {
            if (!provider.supportsProjects()) {
                return res.status(400).json({ error: `${provider.name} does not support project-level configuration` });
            }

            const projectConfig = await provider.getProjectConfig(scopePath);
            if (!projectConfig) {
                return res.status(404).json({ error: `Project config not found at ${scopePath}` });
            }

            const servers = provider.extractServers(projectConfig);
            if (!servers[serverName]) {
                return res.status(404).json({ error: `Server '${serverName}' not found` });
            }

            servers[serverName] = { ...servers[serverName], ...config };
            const updatedConfig = provider.injectServers(projectConfig, servers);
            await provider.saveProjectConfig(scopePath, updatedConfig);
        }

        res.json({ success: true, message: 'Server updated' });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/servers/:id
 * Delete MCP server
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { providerId, scope, scopePath, serverName } = parseServerId(decodeURIComponent(id));

        const provider = getProvider(providerId);
        if (!provider) {
            return res.status(404).json({ error: `Unknown provider: ${providerId}` });
        }

        if (scope === 'global') {
            await provider.removeGlobalServer(serverName);
        } else {
            if (!provider.supportsProjects()) {
                return res.status(400).json({ error: `${provider.name} does not support project-level configuration` });
            }
            await provider.removeProjectServer(scopePath, serverName);
        }

        res.json({ success: true, message: 'Server deleted' });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/servers/:id/toggle
 * Toggle server enabled state
 */
router.post('/:id/toggle', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { providerId, scope, scopePath, serverName } = parseServerId(decodeURIComponent(id));

        const provider = getProvider(providerId);
        if (!provider) {
            return res.status(404).json({ error: `Unknown provider: ${providerId}` });
        }

        let newState;

        if (scope === 'global') {
            const globalConfig = await provider.getGlobalConfig();
            const servers = provider.extractServers(globalConfig);

            if (!servers[serverName]) {
                return res.status(404).json({ error: `Server '${serverName}' not found` });
            }

            newState = servers[serverName].enabled === false;
            servers[serverName].enabled = newState;

            const updatedConfig = provider.injectServers(globalConfig, servers);
            await provider.saveGlobalConfig(updatedConfig);
        } else {
            if (!provider.supportsProjects()) {
                return res.status(400).json({ error: `${provider.name} does not support project-level configuration` });
            }

            const projectConfig = await provider.getProjectConfig(scopePath);
            if (!projectConfig) {
                return res.status(404).json({ error: `Project config not found at ${scopePath}` });
            }

            const servers = provider.extractServers(projectConfig);
            if (!servers[serverName]) {
                return res.status(404).json({ error: `Server '${serverName}' not found` });
            }

            newState = servers[serverName].enabled === false;
            servers[serverName].enabled = newState;

            const updatedConfig = provider.injectServers(projectConfig, servers);
            await provider.saveProjectConfig(scopePath, updatedConfig);
        }

        res.json({ success: true, enabled: newState });
    } catch (error) {
        next(error);
    }
});

export default router;
