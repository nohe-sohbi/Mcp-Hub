import fs from 'fs-extra';
import path from 'path';

/**
 * Abstract base class for MCP configuration providers.
 * Each provider (Claude Desktop, Claude Code CLI, OpenCode) extends this class.
 */
export default class BaseProvider {
    constructor() {
        this.id = '';
        this.name = '';
        this.globalConfigPath = '';
        this.projectConfigPath = null;  // null if provider doesn't support project-level config
    }

    /**
     * Read the global configuration file
     * @returns {Promise<Object>} The parsed config object
     */
    async getGlobalConfig() {
        try {
            if (await fs.pathExists(this.globalConfigPath)) {
                return await fs.readJson(this.globalConfigPath);
            }
            return this.getDefaultConfig();
        } catch (error) {
            console.error(`Error reading ${this.id} global config:`, error);
            return this.getDefaultConfig();
        }
    }

    /**
     * Save the global configuration file
     * @param {Object} config - The config object to save
     */
    async saveGlobalConfig(config) {
        await fs.ensureDir(path.dirname(this.globalConfigPath));
        await fs.writeJson(this.globalConfigPath, config, { spaces: 2 });
    }

    /**
     * Read project-level configuration
     * @param {string} projectPath - The project directory path
     * @returns {Promise<Object|null>} The parsed config or null if not supported/found
     */
    async getProjectConfig(projectPath) {
        if (!this.projectConfigPath) return null;

        // SECURITY: Prevent path traversal
        if (!path.isAbsolute(projectPath) || projectPath.includes('..')) {
            throw new Error('Invalid project path: Must be absolute and cannot contain traversal sequences');
        }

        const configPath = path.join(projectPath, this.projectConfigPath);
        try {
            if (await fs.pathExists(configPath)) {
                return await fs.readJson(configPath);
            }
            return null;
        } catch (error) {
            console.error(`Error reading ${this.id} project config at ${configPath}:`, error);
            return null;
        }
    }

    /**
     * Save project-level configuration
     * @param {string} projectPath - The project directory path
     * @param {Object} config - The config object to save
     */
    async saveProjectConfig(projectPath, config) {
        if (!this.projectConfigPath) {
            throw new Error(`${this.name} does not support project-level configuration`);
        }

        // SECURITY: Prevent path traversal
        if (!path.isAbsolute(projectPath) || projectPath.includes('..')) {
            throw new Error('Invalid project path: Must be absolute and cannot contain traversal sequences');
        }

        const configPath = path.join(projectPath, this.projectConfigPath);
        await fs.writeJson(configPath, config, { spaces: 2 });
    }

    /**
     * Extract MCP servers from a config object.
     * Override this method if the provider uses a different format.
     * @param {Object} config - The full config object
     * @returns {Object} The mcpServers object
     */
    extractServers(config) {
        return config.mcpServers || {};
    }

    /**
     * Inject MCP servers into a config object.
     * Override this method if the provider uses a different format.
     * @param {Object} config - The full config object
     * @param {Object} servers - The mcpServers object to inject
     * @returns {Object} The updated config object
     */
    injectServers(config, servers) {
        return { ...config, mcpServers: servers };
    }

    /**
     * Get the default empty config for this provider
     * @returns {Object} Default config structure
     */
    getDefaultConfig() {
        return { mcpServers: {} };
    }

    /**
     * Check if this provider is installed/available on the system
     * @returns {Promise<boolean>}
     */
    async isInstalled() {
        // Default: check if the config directory exists or can be created
        try {
            const configDir = path.dirname(this.globalConfigPath);
            // Check if config file exists OR if parent directory exists
            if (await fs.pathExists(this.globalConfigPath)) {
                return true;
            }
            // Check if we can reasonably expect this provider to be available
            return await fs.pathExists(configDir);
        } catch {
            return false;
        }
    }

    /**
     * Check if this provider supports project-level configuration
     * @returns {boolean}
     */
    supportsProjects() {
        return this.projectConfigPath !== null;
    }

    /**
     * Validate a server configuration for this provider
     * @param {Object} serverConfig - The server config to validate
     * @returns {{ valid: boolean, errors?: string[] }}
     */
    validateServerConfig(serverConfig) {
        const errors = [];

        // Basic validation - must have either command (stdio) or url (http/sse)
        if (!serverConfig.command && !serverConfig.url) {
            errors.push('Server must have either "command" (for stdio) or "url" (for http/sse)');
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }

    /**
     * Get all servers from global config
     * @returns {Promise<Array>} Array of server objects with metadata
     */
    async getGlobalServers() {
        const config = await this.getGlobalConfig();
        const servers = this.extractServers(config);

        return Object.entries(servers).map(([name, serverConfig]) => ({
            id: `${this.id}:global:${name}`,
            name,
            scope: 'global',
            scopePath: null,
            provider: this.id,
            providerName: this.name,
            config: serverConfig,
            enabled: serverConfig.enabled !== false,
            type: this.getServerType(serverConfig)
        }));
    }

    /**
     * Get all servers from a project config
     * @param {string} projectPath - The project directory path
     * @returns {Promise<Array>} Array of server objects with metadata
     */
    async getProjectServers(projectPath) {
        if (!this.supportsProjects()) return [];

        const config = await this.getProjectConfig(projectPath);
        if (!config) return [];

        const servers = this.extractServers(config);

        return Object.entries(servers).map(([name, serverConfig]) => ({
            id: `${this.id}:project:${projectPath}:${name}`,
            name,
            scope: 'project',
            scopePath: projectPath,
            provider: this.id,
            providerName: this.name,
            config: serverConfig,
            enabled: serverConfig.enabled !== false,
            type: this.getServerType(serverConfig)
        }));
    }

    /**
     * Add a server to global config
     * @param {string} name - Server name
     * @param {Object} serverConfig - Server configuration
     */
    async addGlobalServer(name, serverConfig) {
        const config = await this.getGlobalConfig();
        const servers = this.extractServers(config);
        servers[name] = serverConfig;
        const updatedConfig = this.injectServers(config, servers);
        await this.saveGlobalConfig(updatedConfig);
    }

    /**
     * Add a server to project config
     * @param {string} projectPath - Project directory path
     * @param {string} name - Server name
     * @param {Object} serverConfig - Server configuration
     */
    async addProjectServer(projectPath, name, serverConfig) {
        if (!this.supportsProjects()) {
            throw new Error(`${this.name} does not support project-level configuration`);
        }

        let config = await this.getProjectConfig(projectPath) || this.getDefaultConfig();
        const servers = this.extractServers(config);
        servers[name] = serverConfig;
        const updatedConfig = this.injectServers(config, servers);
        await this.saveProjectConfig(projectPath, updatedConfig);
    }

    /**
     * Remove a server from global config
     * @param {string} name - Server name
     */
    async removeGlobalServer(name) {
        const config = await this.getGlobalConfig();
        const servers = this.extractServers(config);
        delete servers[name];
        const updatedConfig = this.injectServers(config, servers);
        await this.saveGlobalConfig(updatedConfig);
    }

    /**
     * Remove a server from project config
     * @param {string} projectPath - Project directory path
     * @param {string} name - Server name
     */
    async removeProjectServer(projectPath, name) {
        if (!this.supportsProjects()) {
            throw new Error(`${this.name} does not support project-level configuration`);
        }

        const config = await this.getProjectConfig(projectPath);
        if (!config) return;

        const servers = this.extractServers(config);
        delete servers[name];
        const updatedConfig = this.injectServers(config, servers);
        await this.saveProjectConfig(projectPath, updatedConfig);
    }

    /**
     * Determine server type from config
     * @param {Object} serverConfig
     * @returns {string} 'stdio' | 'http' | 'sse'
     */
    getServerType(serverConfig) {
        if (serverConfig.command) return 'stdio';
        if (serverConfig.type === 'sse') return 'sse';
        return 'http';
    }
}
