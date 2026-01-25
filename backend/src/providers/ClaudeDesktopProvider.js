import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import BaseProvider from './BaseProvider.js';

/**
 * Provider for Claude Desktop App
 *
 * Config locations (platform-specific):
 * - Linux: ~/.config/Claude/claude_desktop_config.json
 * - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
 * - Windows: %APPDATA%\Claude\claude_desktop_config.json
 *
 * Note: Claude Desktop does NOT support project-level configuration
 *
 * Format: { "mcpServers": { "name": { ... } } }
 */
export default class ClaudeDesktopProvider extends BaseProvider {
    constructor() {
        super();
        this.id = 'claude-desktop';
        this.name = 'Claude Desktop';
        this.globalConfigPath = this.getConfigPath();
        this.projectConfigPath = null;  // Claude Desktop doesn't support project configs
    }

    /**
     * Get the platform-specific config path
     */
    getConfigPath() {
        const platform = os.platform();

        switch (platform) {
            case 'darwin':
                // macOS
                return path.join(
                    os.homedir(),
                    'Library',
                    'Application Support',
                    'Claude',
                    'claude_desktop_config.json'
                );
            case 'win32':
                // Windows
                return path.join(
                    process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
                    'Claude',
                    'claude_desktop_config.json'
                );
            default:
                // Linux and others
                return path.join(
                    os.homedir(),
                    '.config',
                    'Claude',
                    'claude_desktop_config.json'
                );
        }
    }

    /**
     * Check if Claude Desktop is installed
     */
    async isInstalled() {
        // Check if config file exists
        if (await fs.pathExists(this.globalConfigPath)) {
            return true;
        }

        // Check if Claude Desktop config directory exists
        const configDir = path.dirname(this.globalConfigPath);
        return await fs.pathExists(configDir);
    }

    /**
     * Get default config structure for Claude Desktop
     */
    getDefaultConfig() {
        return { mcpServers: {} };
    }

    /**
     * Claude Desktop uses standard mcpServers format
     */
    extractServers(config) {
        return config.mcpServers || {};
    }

    /**
     * Claude Desktop uses standard mcpServers format
     */
    injectServers(config, servers) {
        return { ...config, mcpServers: servers };
    }

    /**
     * Override to explicitly state no project support
     */
    supportsProjects() {
        return false;
    }

    /**
     * Override to throw clear error for project operations
     */
    async getProjectConfig() {
        return null;
    }

    async saveProjectConfig() {
        throw new Error('Claude Desktop does not support project-level MCP configuration');
    }

    async addProjectServer() {
        throw new Error('Claude Desktop does not support project-level MCP configuration');
    }

    async removeProjectServer() {
        throw new Error('Claude Desktop does not support project-level MCP configuration');
    }

    async getProjectServers() {
        return [];
    }
}
