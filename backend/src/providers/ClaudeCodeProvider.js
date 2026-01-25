import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import BaseProvider from './BaseProvider.js';

/**
 * Provider for Claude Code CLI
 *
 * Config locations:
 * - Global: ~/.claude.json
 * - Project: .mcp.json in project root
 *
 * Format: { "mcpServers": { "name": { ... } } }
 */
export default class ClaudeCodeProvider extends BaseProvider {
    constructor() {
        super();
        this.id = 'claude-code';
        this.name = 'Claude Code CLI';
        this.globalConfigPath = path.join(os.homedir(), '.claude.json');
        this.projectConfigPath = '.mcp.json';
    }

    /**
     * Check if Claude Code CLI is installed
     */
    async isInstalled() {
        // Check if ~/.claude.json exists OR if claude command is available
        if (await fs.pathExists(this.globalConfigPath)) {
            return true;
        }

        // Also check for ~/.claude directory which indicates Claude Code usage
        const claudeDir = path.join(os.homedir(), '.claude');
        return await fs.pathExists(claudeDir);
    }

    /**
     * Get default config structure for Claude Code
     */
    getDefaultConfig() {
        return { mcpServers: {} };
    }

    /**
     * Claude Code uses standard mcpServers format
     */
    extractServers(config) {
        return config.mcpServers || {};
    }

    /**
     * Claude Code uses standard mcpServers format
     */
    injectServers(config, servers) {
        return { ...config, mcpServers: servers };
    }

    /**
     * Validate server config for Claude Code specifics
     */
    validateServerConfig(serverConfig) {
        const baseResult = super.validateServerConfig(serverConfig);
        const errors = baseResult.errors || [];

        // Claude Code specific: stdio servers need command
        if (serverConfig.command) {
            if (typeof serverConfig.command !== 'string') {
                errors.push('Command must be a string');
            }
            if (serverConfig.args && !Array.isArray(serverConfig.args)) {
                errors.push('Args must be an array');
            }
        }

        // HTTP/SSE servers need url
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
