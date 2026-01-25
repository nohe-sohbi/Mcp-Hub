import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import BaseProvider from './BaseProvider.js';

/**
 * Provider for OpenCode
 *
 * Config locations:
 * - Global: ~/.config/opencode/opencode.json
 * - Project: opencode.json in project root
 *
 * IMPORTANT: OpenCode uses a different format!
 * Format: { "mcp": { "name": { "type": "local", "command": [...], ... } } }
 * NOT { "mcpServers": { ... } }
 */
export default class OpenCodeProvider extends BaseProvider {
    constructor() {
        super();
        this.id = 'opencode';
        this.name = 'OpenCode';
        this.globalConfigPath = path.join(os.homedir(), '.config', 'opencode', 'opencode.json');
        this.projectConfigPath = 'opencode.json';
    }

    /**
     * Check if OpenCode is installed
     */
    async isInstalled() {
        // Check if config file or directory exists
        if (await fs.pathExists(this.globalConfigPath)) {
            return true;
        }

        const configDir = path.dirname(this.globalConfigPath);
        return await fs.pathExists(configDir);
    }

    /**
     * Get default config structure for OpenCode
     * Note: OpenCode uses "mcp" not "mcpServers"
     */
    getDefaultConfig() {
        return { mcp: {} };
    }

    /**
     * OpenCode uses "mcp" key instead of "mcpServers"
     */
    extractServers(config) {
        return config.mcp || {};
    }

    /**
     * OpenCode uses "mcp" key instead of "mcpServers"
     */
    injectServers(config, servers) {
        return { ...config, mcp: servers };
    }

    /**
     * Convert from standard MCP format to OpenCode format
     * OpenCode expects: { "type": "local", "command": ["npx", ...], "enabled": true }
     */
    toOpenCodeFormat(serverConfig) {
        const result = { ...serverConfig };

        // OpenCode uses "type": "local" for stdio servers
        if (serverConfig.command && !serverConfig.type) {
            result.type = 'local';
        }

        // OpenCode expects command as array
        if (typeof serverConfig.command === 'string') {
            result.command = [serverConfig.command, ...(serverConfig.args || [])];
            delete result.args;
        } else if (serverConfig.command && serverConfig.args) {
            result.command = [serverConfig.command, ...serverConfig.args];
            delete result.args;
        }

        // Ensure enabled is set
        if (result.enabled === undefined) {
            result.enabled = true;
        }

        return result;
    }

    /**
     * Convert from OpenCode format to standard MCP format
     */
    fromOpenCodeFormat(serverConfig) {
        const result = { ...serverConfig };

        // Convert command array back to command + args
        if (Array.isArray(serverConfig.command) && serverConfig.command.length > 0) {
            result.command = serverConfig.command[0];
            if (serverConfig.command.length > 1) {
                result.args = serverConfig.command.slice(1);
            }
        }

        // Convert type: local back to implicit stdio
        if (result.type === 'local') {
            delete result.type;
        }

        return result;
    }

    /**
     * Override to convert format when adding servers
     */
    async addGlobalServer(name, serverConfig) {
        const openCodeConfig = this.toOpenCodeFormat(serverConfig);
        await super.addGlobalServer(name, openCodeConfig);
    }

    /**
     * Override to convert format when adding project servers
     */
    async addProjectServer(projectPath, name, serverConfig) {
        const openCodeConfig = this.toOpenCodeFormat(serverConfig);
        await super.addProjectServer(projectPath, name, openCodeConfig);
    }

    /**
     * Override to convert format when reading servers
     */
    async getGlobalServers() {
        const config = await this.getGlobalConfig();
        const servers = this.extractServers(config);

        return Object.entries(servers).map(([name, serverConfig]) => {
            const standardConfig = this.fromOpenCodeFormat(serverConfig);
            return {
                id: `${this.id}:global:${name}`,
                name,
                scope: 'global',
                scopePath: null,
                provider: this.id,
                providerName: this.name,
                config: standardConfig,
                enabled: serverConfig.enabled !== false,
                type: this.getServerType(standardConfig)
            };
        });
    }

    /**
     * Override to convert format when reading project servers
     */
    async getProjectServers(projectPath) {
        if (!this.supportsProjects()) return [];

        const config = await this.getProjectConfig(projectPath);
        if (!config) return [];

        const servers = this.extractServers(config);

        return Object.entries(servers).map(([name, serverConfig]) => {
            const standardConfig = this.fromOpenCodeFormat(serverConfig);
            return {
                id: `${this.id}:project:${projectPath}:${name}`,
                name,
                scope: 'project',
                scopePath: projectPath,
                provider: this.id,
                providerName: this.name,
                config: standardConfig,
                enabled: serverConfig.enabled !== false,
                type: this.getServerType(standardConfig)
            };
        });
    }

    /**
     * Validate server config for OpenCode specifics
     */
    validateServerConfig(serverConfig) {
        const errors = [];

        // OpenCode requires either command (local) or url (remote)
        if (!serverConfig.command && !serverConfig.url) {
            errors.push('Server must have either "command" (for local) or "url" (for remote)');
        }

        // Command can be string or array for OpenCode
        if (serverConfig.command) {
            if (typeof serverConfig.command !== 'string' && !Array.isArray(serverConfig.command)) {
                errors.push('Command must be a string or array');
            }
        }

        if (serverConfig.url) {
            try {
                new URL(serverConfig.url);
            } catch {
                errors.push('Invalid URL format');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
}
