import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * MCP Manager Configuration Service
 *
 * Manages MCP Manager's own settings (not the provider configs).
 * Stores user preferences like active providers, default provider, etc.
 *
 * Config location: ~/.mcp-manager/config.json
 */

const MCP_MANAGER_DIR = path.join(os.homedir(), '.mcp-manager');
const MCP_MANAGER_CONFIG = path.join(MCP_MANAGER_DIR, 'config.json');

/**
 * Default configuration
 * - activeProviders: Providers to show servers from and install to
 * - defaultProvider: Primary provider for new installations
 * - syncOnInstall: Whether to install to all active providers by default
 */
const DEFAULT_CONFIG = {
    activeProviders: ['claude-code'],  // Default to Claude Code CLI
    defaultProvider: 'claude-code',
    syncOnInstall: false
};

/**
 * Get MCP Manager configuration
 * @returns {Promise<Object>}
 */
export async function getManagerConfig() {
    try {
        if (await fs.pathExists(MCP_MANAGER_CONFIG)) {
            const config = await fs.readJson(MCP_MANAGER_CONFIG);
            // Merge with defaults to ensure all fields exist
            return { ...DEFAULT_CONFIG, ...config };
        }
        return { ...DEFAULT_CONFIG };
    } catch (error) {
        console.error('Error reading MCP Manager config:', error);
        return { ...DEFAULT_CONFIG };
    }
}

/**
 * Save MCP Manager configuration
 * @param {Object} config
 */
export async function saveManagerConfig(config) {
    try {
        await fs.ensureDir(MCP_MANAGER_DIR);
        await fs.writeJson(MCP_MANAGER_CONFIG, config, { spaces: 2 });
    } catch (error) {
        console.error('Error saving MCP Manager config:', error);
        throw error;
    }
}

/**
 * Get active provider IDs
 * @returns {Promise<string[]>}
 */
export async function getActiveProviders() {
    const config = await getManagerConfig();
    return config.activeProviders;
}

/**
 * Set active providers
 * @param {string[]} providerIds
 */
export async function setActiveProviders(providerIds) {
    const config = await getManagerConfig();
    config.activeProviders = providerIds;

    // Ensure default provider is in active list
    if (!providerIds.includes(config.defaultProvider) && providerIds.length > 0) {
        config.defaultProvider = providerIds[0];
    }

    await saveManagerConfig(config);
}

/**
 * Get default provider ID
 * @returns {Promise<string>}
 */
export async function getDefaultProvider() {
    const config = await getManagerConfig();
    return config.defaultProvider;
}

/**
 * Set default provider
 * @param {string} providerId
 */
export async function setDefaultProvider(providerId) {
    const config = await getManagerConfig();
    config.defaultProvider = providerId;

    // Ensure default provider is active
    if (!config.activeProviders.includes(providerId)) {
        config.activeProviders.push(providerId);
    }

    await saveManagerConfig(config);
}

/**
 * Get sync on install setting
 * @returns {Promise<boolean>}
 */
export async function getSyncOnInstall() {
    const config = await getManagerConfig();
    return config.syncOnInstall;
}

/**
 * Set sync on install setting
 * @param {boolean} enabled
 */
export async function setSyncOnInstall(enabled) {
    const config = await getManagerConfig();
    config.syncOnInstall = enabled;
    await saveManagerConfig(config);
}

/**
 * Toggle a provider's active state
 * @param {string} providerId
 * @returns {Promise<boolean>} New active state
 */
export async function toggleProvider(providerId) {
    const config = await getManagerConfig();
    const isActive = config.activeProviders.includes(providerId);

    if (isActive) {
        // Don't allow deactivating the last provider
        if (config.activeProviders.length === 1) {
            throw new Error('Cannot deactivate the last active provider');
        }
        config.activeProviders = config.activeProviders.filter(id => id !== providerId);

        // If deactivating default provider, set new default
        if (config.defaultProvider === providerId) {
            config.defaultProvider = config.activeProviders[0];
        }
    } else {
        config.activeProviders.push(providerId);
    }

    await saveManagerConfig(config);
    return !isActive;
}

/**
 * Update multiple config settings at once
 * @param {Object} updates - Partial config object
 */
export async function updateManagerConfig(updates) {
    const config = await getManagerConfig();
    const updatedConfig = { ...config, ...updates };

    // Validate: default provider must be in active providers
    if (updatedConfig.activeProviders.length > 0 &&
        !updatedConfig.activeProviders.includes(updatedConfig.defaultProvider)) {
        updatedConfig.defaultProvider = updatedConfig.activeProviders[0];
    }

    await saveManagerConfig(updatedConfig);
    return updatedConfig;
}

export default {
    getManagerConfig,
    saveManagerConfig,
    getActiveProviders,
    setActiveProviders,
    getDefaultProvider,
    setDefaultProvider,
    getSyncOnInstall,
    setSyncOnInstall,
    toggleProvider,
    updateManagerConfig
};
