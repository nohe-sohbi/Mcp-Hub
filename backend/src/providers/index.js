import os from 'os';
import ClaudeCodeProvider from './ClaudeCodeProvider.js';
import ClaudeDesktopProvider from './ClaudeDesktopProvider.js';
import OpenCodeProvider from './OpenCodeProvider.js';
import { getProjects } from '../services/claudeConfig.js';

/**
 * Humanize a file path for display (replace home directory with ~)
 * @param {string} filePath - The path to humanize
 * @returns {string}
 */
export function humanizePath(filePath) {
    if (!filePath) return filePath;
    const home = os.homedir();
    if (filePath.startsWith(home)) {
        return '~' + filePath.slice(home.length);
    }
    return filePath;
}

/**
 * Provider Registry
 *
 * Central registry for all MCP configuration providers.
 * Each provider handles reading/writing MCP server configurations
 * for a specific tool (Claude Code CLI, Claude Desktop, OpenCode).
 */

// Instantiate all providers
const providers = {
    'claude-code': new ClaudeCodeProvider(),
    'claude-desktop': new ClaudeDesktopProvider(),
    'opencode': new OpenCodeProvider()
};

/**
 * Get a provider by ID
 * @param {string} id - Provider ID ('claude-code', 'claude-desktop', 'opencode')
 * @returns {BaseProvider|null}
 */
export function getProvider(id) {
    return providers[id] || null;
}

/**
 * Get all registered providers
 * @returns {BaseProvider[]}
 */
export function getAllProviders() {
    return Object.values(providers);
}

/**
 * Get all provider IDs
 * @returns {string[]}
 */
export function getProviderIds() {
    return Object.keys(providers);
}

/**
 * Get providers that are installed on the system
 * @returns {Promise<BaseProvider[]>}
 */
export async function getAvailableProviders() {
    const available = [];
    for (const provider of Object.values(providers)) {
        try {
            if (await provider.isInstalled()) {
                available.push(provider);
            }
        } catch (error) {
            console.error(`Error checking if ${provider.id} is installed:`, error);
        }
    }
    return available;
}

/**
 * Get provider info for all providers (for API responses)
 * @param {string[]} activeProviderIds - IDs of currently active providers
 * @param {string} defaultProviderId - ID of the default provider
 * @returns {Promise<Array>}
 */
export async function getProvidersInfo(activeProviderIds = [], defaultProviderId = null) {
    const result = [];

    for (const provider of Object.values(providers)) {
        let installed = false;
        try {
            installed = await provider.isInstalled();
        } catch {
            installed = false;
        }

        result.push({
            id: provider.id,
            name: provider.name,
            installed,
            active: activeProviderIds.includes(provider.id),
            isDefault: provider.id === defaultProviderId,
            supportsProjects: provider.supportsProjects(),
            globalConfigPath: humanizePath(provider.globalConfigPath),
            projectConfigPath: provider.projectConfigPath
        });
    }

    return result;
}

/**
 * Get all servers from multiple providers
 * @param {string[]} providerIds - IDs of providers to query
 * @returns {Promise<Array>}
 */
export async function getServersFromProviders(providerIds) {
    const allServers = [];

    // Global servers
    for (const providerId of providerIds) {
        const provider = getProvider(providerId);
        if (!provider) continue;

        try {
            const servers = await provider.getGlobalServers();
            allServers.push(...servers);
        } catch (error) {
            console.error(`Error getting global servers from ${providerId}:`, error);
        }
    }

    // Project-scoped servers — read from each known Claude project so that
    // servers added to a project (Servers page, Projects "Add Server",
    // marketplace project install) are actually visible in the UI.
    let projects = [];
    try {
        projects = await getProjects();
    } catch (error) {
        console.error('Error listing projects for project servers:', error);
    }

    for (const providerId of providerIds) {
        const provider = getProvider(providerId);
        if (!provider || !provider.supportsProjects()) continue;

        for (const project of projects) {
            try {
                const servers = await provider.getProjectServers(project.path);
                for (const server of servers) {
                    // Attach the human-readable project name for display.
                    allServers.push({ ...server, scopeName: project.name });
                }
            } catch (error) {
                console.error(`Error getting project servers from ${providerId} for ${project.path}:`, error);
            }
        }
    }

    return allServers;
}

/**
 * Add a server to multiple providers
 * @param {string} name - Server name
 * @param {Object} config - Server configuration
 * @param {string} scope - 'global' or 'project'
 * @param {string|null} scopePath - Project path if scope is 'project'
 * @param {string[]} providerIds - IDs of providers to add to
 * @returns {Promise<Array<{providerId: string, success: boolean, error?: string}>>}
 */
export async function addServerToProviders(name, config, scope, scopePath, providerIds) {
    const results = [];

    for (const providerId of providerIds) {
        const provider = getProvider(providerId);
        if (!provider) {
            results.push({ providerId, success: false, error: 'Provider not found' });
            continue;
        }

        // Check if provider supports project-level config
        if (scope === 'project' && !provider.supportsProjects()) {
            results.push({
                providerId,
                success: false,
                error: `${provider.name} does not support project-level configuration`
            });
            continue;
        }

        try {
            if (scope === 'global') {
                await provider.addGlobalServer(name, config);
            } else {
                await provider.addProjectServer(scopePath, name, config);
            }
            results.push({ providerId, success: true });
        } catch (error) {
            results.push({ providerId, success: false, error: error.message });
        }
    }

    return results;
}

/**
 * Remove a server from multiple providers
 * @param {string} name - Server name
 * @param {string} scope - 'global' or 'project'
 * @param {string|null} scopePath - Project path if scope is 'project'
 * @param {string[]} providerIds - IDs of providers to remove from
 * @returns {Promise<Array<{providerId: string, success: boolean, error?: string}>>}
 */
export async function removeServerFromProviders(name, scope, scopePath, providerIds) {
    const results = [];

    for (const providerId of providerIds) {
        const provider = getProvider(providerId);
        if (!provider) {
            results.push({ providerId, success: false, error: 'Provider not found' });
            continue;
        }

        try {
            if (scope === 'global') {
                await provider.removeGlobalServer(name);
            } else if (provider.supportsProjects()) {
                await provider.removeProjectServer(scopePath, name);
            }
            results.push({ providerId, success: true });
        } catch (error) {
            results.push({ providerId, success: false, error: error.message });
        }
    }

    return results;
}

export default providers;
