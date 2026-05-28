import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const GLOBAL_SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.local.json');
const USER_CONFIG_FILE = path.join(os.homedir(), '.claude.json');
const PLUGINS_DIR = path.join(CLAUDE_DIR, 'plugins', 'marketplaces');
const BACKUPS_DIR = path.join(CLAUDE_DIR, 'mcp-manager-backups');
const MAX_BACKUPS_PER_FILE = 5;

/**
 * Create a timestamped backup of a file before modifying it
 * Maintains a rotation of MAX_BACKUPS_PER_FILE backups
 */
export async function createBackup(filePath) {
    if (!await fs.pathExists(filePath)) {
        return null;
    }

    await fs.ensureDir(BACKUPS_DIR);

    // Generate timestamped backup filename
    // SECURITY: Prevent path collision and corruption via safe URL encoding
    const encodedPath = encodeURIComponent(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${encodedPath}_${timestamp}.bak`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);

    // Create the backup
    await fs.copy(filePath, backupPath);

    // Rotate old backups (keep only MAX_BACKUPS_PER_FILE)
    await rotateBackups(encodedPath);

    return backupPath;
}

/**
 * Keep only the most recent backups for a file
 */
async function rotateBackups(encodedPath) {
    const pattern = `${encodedPath}_`;
    const allFiles = await fs.readdir(BACKUPS_DIR);
    const matchingBackups = allFiles
        .filter(f => f.startsWith(pattern) && f.endsWith('.bak'))
        .sort()
        .reverse(); // Most recent first

    // Delete old backups beyond the limit
    for (let i = MAX_BACKUPS_PER_FILE; i < matchingBackups.length; i++) {
        await fs.remove(path.join(BACKUPS_DIR, matchingBackups[i]));
    }
}

/**
 * List all backups
 */
export async function listBackups() {
    if (!await fs.pathExists(BACKUPS_DIR)) {
        return [];
    }

    const files = await fs.readdir(BACKUPS_DIR);
    const backups = [];

    for (const file of files) {
        if (!file.endsWith('.bak')) continue;

        const filePath = path.join(BACKUPS_DIR, file);
        const stats = await fs.stat(filePath);

        // Parse backup filename
        const parts = file.replace('.bak', '').split('_');
        const timestamp = parts.pop();

        let originalPath, fileName;
        if (file.includes('%')) {
            // New format: encodedPath_timestamp.bak
            try {
                originalPath = decodeURIComponent(parts.join('_'));
            } catch (e) {
                // Fallback if % was in legacy filename but not valid URI encoded
                originalPath = path.join(parts.join('/').replace(/^/, '/'), parts.pop());
            }
            fileName = path.basename(originalPath);
        } else {
            // Legacy format: dirPath_fileName_timestamp.bak
            fileName = parts.pop();
            const dirPath = parts.join('/').replace(/^/, '/');
            originalPath = path.join(dirPath, fileName);
        }

        backups.push({
            id: file,
            fileName,
            originalPath,
            backupPath: filePath,
            timestamp: timestamp.replace(/-/g, ':').replace('T', ' ').slice(0, 19),
            size: stats.size,
            createdAt: stats.mtime
        });
    }

    return backups.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Restore a backup
 */
export async function restoreBackup(backupId) {
    // SECURITY: Prevent path traversal
    if (typeof backupId !== 'string' || backupId.includes('/') || backupId.includes('\\') || backupId.includes('..')) {
        throw new Error('Invalid backup ID');
    }

    const backupPath = path.join(BACKUPS_DIR, backupId);

    if (!await fs.pathExists(backupPath)) {
        throw new Error('Backup not found');
    }

    // Parse original path from backup filename
    const parts = backupId.replace('.bak', '').split('_');
    parts.pop(); // Remove timestamp

    let originalPath;
    if (backupId.includes('%')) {
        try {
            originalPath = decodeURIComponent(parts.join('_'));
        } catch (e) {
            // Fallback
            const fileName = parts.pop();
            const dirPath = parts.join('/').replace(/^/, '/');
            originalPath = path.join(dirPath, fileName);
        }
    } else {
        const fileName = parts.pop();
        const dirPath = parts.join('/').replace(/^/, '/');
        originalPath = path.join(dirPath, fileName);
    }

    // Create a backup of current state before restoring
    if (await fs.pathExists(originalPath)) {
        await createBackup(originalPath);
    }

    // Restore the backup
    await fs.copy(backupPath, originalPath);

    return originalPath;
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId) {
    // SECURITY: Prevent path traversal
    if (typeof backupId !== 'string' || backupId.includes('/') || backupId.includes('\\') || backupId.includes('..')) {
        throw new Error('Invalid backup ID');
    }

    const backupPath = path.join(BACKUPS_DIR, backupId);

    if (!await fs.pathExists(backupPath)) {
        throw new Error('Backup not found');
    }

    await fs.remove(backupPath);
    return true;
}

/**
 * Get global MCP settings
 */
export async function getGlobalSettings() {
    try {
        if (await fs.pathExists(GLOBAL_SETTINGS_FILE)) {
            return await fs.readJson(GLOBAL_SETTINGS_FILE);
        }
        return { mcpServers: {} };
    } catch (error) {
        console.error('Error reading global settings:', error);
        return { mcpServers: {} };
    }
}

/**
 * Save global MCP settings
 */
export async function saveGlobalSettings(settings) {
    await createBackup(GLOBAL_SETTINGS_FILE);
    await fs.ensureDir(path.dirname(GLOBAL_SETTINGS_FILE));
    await fs.writeJson(GLOBAL_SETTINGS_FILE, settings, { spaces: 2 });
}

/**
 * Decode project directory name to actual path
 * Uses ~/.claude.json as source of truth since it contains real paths (with accents)
 */
async function decodeProjectPath(encodedName) {
    // Try to get real path from ~/.claude.json
    try {
        if (await fs.pathExists(USER_CONFIG_FILE)) {
            const userConfig = await fs.readJson(USER_CONFIG_FILE);
            if (userConfig.projects) {
                // Search through all project paths in ~/.claude.json
                // Compare the encoded directory name with each project
                const cleanEncoded = encodedName.replace(/^-/, '').toLowerCase();

                for (const realPath of Object.keys(userConfig.projects)) {
                    // Claude removes accented characters entirely (not normalizes them)
                    // é, è, ê, à, ç etc. are just removed
                    const simplifiedReal = realPath
                        .toLowerCase()
                        .replace(/[éèêëàâäôöîïûüùç]/g, '')  // Remove accented chars
                        .replace(/[^a-z0-9\/]/g, '');  // Remove non-alphanumeric except /

                    const simplifiedEncoded = cleanEncoded.replace(/[^a-z0-9]/g, '');

                    // If the simplified versions match, this is our path
                    if (simplifiedReal.replace(/\//g, '') === simplifiedEncoded) {
                        return realPath;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error decoding path from user config:', e);
    }

    // Fallback: filesystem-based reconstruction
    const cleanName = encodedName.replace(/^-/, '');
    const parts = cleanName.split('-');

    let currentPath = '/';
    let i = 0;

    while (i < parts.length) {
        let segment = parts[i];
        let candidate = path.join(currentPath, segment);

        if (fs.existsSync(candidate)) {
            currentPath = candidate;
            i++;
            continue;
        }

        // Try combining with next parts (handling dashes in folder names)
        let found = false;
        let combinedSegment = segment;

        for (let j = i + 1; j < parts.length; j++) {
            combinedSegment += '-' + parts[j];
            const combinedCandidate = path.join(currentPath, combinedSegment);

            if (fs.existsSync(combinedCandidate)) {
                currentPath = combinedCandidate;
                i = j + 1;
                found = true;
                break;
            }
        }

        if (!found) {
            currentPath = candidate;
            i++;
        }
    }

    return currentPath;
}

/**
 * Encode path to project directory name
 */
function encodeProjectPath(projectPath) {
    // Convert /home/nohe/UPPLER/app to -home-nohe-UPPLER-app
    return projectPath.replace(/\//g, '-').replace(/^-/, '');
}

/**
 * Get list of all Claude projects
 */
export async function getProjects() {
    const projects = [];

    try {
        if (await fs.pathExists(PROJECTS_DIR)) {
            const dirs = await fs.readdir(PROJECTS_DIR);

            for (const dir of dirs) {
                const encodedPath = dir;
                const actualPath = await decodeProjectPath(dir);
                const projectDir = path.join(PROJECTS_DIR, dir);

                // Check for .mcp.json in Claude's project dir
                const claudeMcpPath = path.join(projectDir, '.mcp.json');

                // Check for .mcp.json in actual project directory
                const projectMcpPath = path.join(actualPath, '.mcp.json');

                const hasMcpInClaude = await fs.pathExists(claudeMcpPath);
                const hasMcpInProject = await fs.pathExists(projectMcpPath);

                projects.push({
                    id: encodedPath,
                    name: path.basename(actualPath),
                    path: actualPath,
                    encodedPath,
                    claudeProjectDir: projectDir,
                    hasMcpConfig: hasMcpInClaude || hasMcpInProject,
                    mcpLocations: {
                        claude: hasMcpInClaude ? claudeMcpPath : null,
                        project: hasMcpInProject ? projectMcpPath : null
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error reading projects:', error);
    }

    return projects;
}

/**
 * Get MCP config for a specific project
 */
export async function getProjectMcpConfig(projectPath) {
    const configs = [];

    // 1. Check in ~/.claude.json (user local config per project)
    try {
        if (await fs.pathExists(USER_CONFIG_FILE)) {
            const userConfig = await fs.readJson(USER_CONFIG_FILE);
            if (userConfig.projects && userConfig.projects[projectPath]) {
                const projectData = userConfig.projects[projectPath];
                if (projectData.mcpServers && Object.keys(projectData.mcpServers).length > 0) {
                    configs.push({
                        location: 'user-local',
                        path: USER_CONFIG_FILE,
                        projectPath: projectPath,
                        config: { mcpServers: projectData.mcpServers },
                        enabledMcpjsonServers: projectData.enabledMcpjsonServers || [],
                        disabledMcpjsonServers: projectData.disabledMcpjsonServers || []
                    });
                }
            }
        }
    } catch (e) {
        console.error('Error reading user config:', e);
    }

    // 2. Check in Claude's project directory (.mcp.json)
    const encodedPath = encodeProjectPath(projectPath);
    const claudeMcpPath = path.join(PROJECTS_DIR, encodedPath, '.mcp.json');

    if (await fs.pathExists(claudeMcpPath)) {
        try {
            const config = await fs.readJson(claudeMcpPath);
            configs.push({
                location: 'claude',
                path: claudeMcpPath,
                config
            });
        } catch (e) {
            console.error('Error reading Claude MCP config:', e);
        }
    }

    // 3. Check in actual project directory (.mcp.json)
    const projectMcpPath = path.join(projectPath, '.mcp.json');

    if (await fs.pathExists(projectMcpPath)) {
        try {
            const config = await fs.readJson(projectMcpPath);
            configs.push({
                location: 'project',
                path: projectMcpPath,
                config
            });
        } catch (e) {
            console.error('Error reading project MCP config:', e);
        }
    }

    return configs;
}

/**
 * Save MCP config for a project
 */
export async function saveProjectMcpConfig(projectPath, config, location = 'project') {
    let targetPath;

    if (location === 'claude') {
        const encodedPath = encodeProjectPath(projectPath);
        targetPath = path.join(PROJECTS_DIR, encodedPath, '.mcp.json');
    } else {
        targetPath = path.join(projectPath, '.mcp.json');
    }

    await createBackup(targetPath);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeJson(targetPath, config, { spaces: 2 });

    return targetPath;
}

/**
 * Save MCP config for a project in user's local config (~/.claude.json)
 */
export async function saveUserLocalMcpConfig(projectPath, servers) {
    await createBackup(USER_CONFIG_FILE);

    let userConfig = {};
    if (await fs.pathExists(USER_CONFIG_FILE)) {
        userConfig = await fs.readJson(USER_CONFIG_FILE);
    }

    if (!userConfig.projects) {
        userConfig.projects = {};
    }

    if (!userConfig.projects[projectPath]) {
        userConfig.projects[projectPath] = {};
    }

    userConfig.projects[projectPath].mcpServers = servers;

    await fs.writeJson(USER_CONFIG_FILE, userConfig, { spaces: 2 });
    return USER_CONFIG_FILE;
}

/**
 * Get all MCP servers from all sources
 */
export async function getAllServers() {
    const servers = [];

    // Get global servers
    const globalSettings = await getGlobalSettings();
    const globalServers = globalSettings.mcpServers || {};

    for (const [name, config] of Object.entries(globalServers)) {
        servers.push({
            id: `global:${name}`,
            name,
            scope: 'global',
            scopePath: null,
            config,
            enabled: config.enabled !== false,
            type: getServerType(config)
        });
    }

    // Get project servers
    const projects = await getProjects();

    for (const project of projects) {
        const projectConfigs = await getProjectMcpConfig(project.path);

        for (const { location, path: configPath, config } of projectConfigs) {
            // Handle both { mcpServers: {...} } and { serverName: {...} } formats
            const mcpServers = config.mcpServers || config;

            for (const [name, serverConfig] of Object.entries(mcpServers)) {
                if (name === 'mcpServers') continue; // Skip if it was the wrapper

                servers.push({
                    id: `${location}:${project.path}:${name}`,
                    name,
                    scope: location,
                    scopePath: project.path,
                    scopeName: project.name,
                    configPath,
                    config: serverConfig,
                    enabled: serverConfig.enabled !== false,
                    type: getServerType(serverConfig)
                });
            }
        }
    }

    return servers;
}

/**
 * Determine server type from config
 */
function getServerType(config) {
    if (config.type === 'http' || config.type === 'sse') {
        return config.type;
    }
    if (config.command) {
        return 'stdio';
    }
    if (config.url) {
        return config.url.includes('/sse') ? 'sse' : 'http';
    }
    return 'unknown';
}

/**
 * Add a new MCP server
 */
export async function addServer(name, config, scope, scopePath = null) {
    if (scope === 'global') {
        const settings = await getGlobalSettings();
        if (!settings.mcpServers) {
            settings.mcpServers = {};
        }
        settings.mcpServers[name] = config;
        await saveGlobalSettings(settings);
    } else if (scope === 'user-local') {
        // Write to ~/.claude.json projects structure
        let userConfig = {};
        if (await fs.pathExists(USER_CONFIG_FILE)) {
            userConfig = await fs.readJson(USER_CONFIG_FILE);
        }

        if (!userConfig.projects) {
            userConfig.projects = {};
        }

        if (!userConfig.projects[scopePath]) {
            userConfig.projects[scopePath] = {
                mcpServers: {},
                enabledMcpjsonServers: [],
                disabledMcpjsonServers: []
            };
        }

        if (!userConfig.projects[scopePath].mcpServers) {
            userConfig.projects[scopePath].mcpServers = {};
        }

        // Add type: stdio if not present (Claude format)
        const serverConfig = { ...config };
        if (config.command && !config.type) {
            serverConfig.type = 'stdio';
        }

        userConfig.projects[scopePath].mcpServers[name] = serverConfig;

        await createBackup(USER_CONFIG_FILE);
        await fs.writeJson(USER_CONFIG_FILE, userConfig, { spaces: 2 });
    } else {
        const location = scope; // 'project' or 'claude'
        const projectConfigs = await getProjectMcpConfig(scopePath);

        let existingConfig = {};
        let configPath = null;

        // Find existing config for this location
        for (const pc of projectConfigs) {
            if (pc.location === location) {
                existingConfig = pc.config;
                configPath = pc.path;
                break;
            }
        }

        // Handle mcpServers wrapper format
        if (existingConfig.mcpServers) {
            existingConfig.mcpServers[name] = config;
        } else {
            existingConfig[name] = config;
        }

        await saveProjectMcpConfig(scopePath, existingConfig, location);
    }
}

/**
 * Update an existing MCP server
 */
export async function updateServer(id, newConfig) {
    const [scope, ...rest] = id.split(':');

    if (scope === 'global') {
        const name = rest[0];
        const settings = await getGlobalSettings();
        if (settings.mcpServers && settings.mcpServers[name]) {
            settings.mcpServers[name] = { ...settings.mcpServers[name], ...newConfig };
            await saveGlobalSettings(settings);
        }
    } else {
        const name = rest.pop();
        const scopePath = rest.join(':');
        const projectConfigs = await getProjectMcpConfig(scopePath);

        for (const { location, path: configPath, config } of projectConfigs) {
            if (location === scope) {
                const mcpServers = config.mcpServers || config;
                if (mcpServers[name]) {
                    mcpServers[name] = { ...mcpServers[name], ...newConfig };
                    await saveProjectMcpConfig(scopePath, config, location);
                    break;
                }
            }
        }
    }
}

/**
 * Delete an MCP server
 */
export async function deleteServer(id) {
    const [scope, ...rest] = id.split(':');

    if (scope === 'global') {
        const name = rest[0];
        const settings = await getGlobalSettings();
        if (settings.mcpServers) {
            delete settings.mcpServers[name];
            await saveGlobalSettings(settings);
        }
    } else {
        const name = rest.pop();
        const scopePath = rest.join(':');
        const projectConfigs = await getProjectMcpConfig(scopePath);

        for (const { location, config } of projectConfigs) {
            if (location === scope) {
                if (config.mcpServers) {
                    delete config.mcpServers[name];
                } else {
                    delete config[name];
                }
                await saveProjectMcpConfig(scopePath, config, location);
                break;
            }
        }
    }
}

/**
 * Toggle server enabled state
 */
export async function toggleServer(id) {
    const servers = await getAllServers();
    const server = servers.find(s => s.id === id);

    if (server) {
        await updateServer(id, { enabled: !server.enabled });
        return !server.enabled;
    }

    return null;
}

/**
 * Get marketplace templates from Claude plugins
 */
export async function getMarketplaceTemplates() {
    const templates = [];

    try {
        if (await fs.pathExists(PLUGINS_DIR)) {
            const marketplaces = await fs.readdir(PLUGINS_DIR);

            for (const marketplace of marketplaces) {
                const marketplacePath = path.join(PLUGINS_DIR, marketplace);

                // Check external_plugins directory
                const externalPluginsPath = path.join(marketplacePath, 'external_plugins');
                if (await fs.pathExists(externalPluginsPath)) {
                    const plugins = await fs.readdir(externalPluginsPath);

                    for (const plugin of plugins) {
                        const mcpPath = path.join(externalPluginsPath, plugin, '.mcp.json');
                        if (await fs.pathExists(mcpPath)) {
                            try {
                                const config = await fs.readJson(mcpPath);
                                templates.push({
                                    id: plugin,
                                    name: plugin.charAt(0).toUpperCase() + plugin.slice(1),
                                    marketplace,
                                    config,
                                    category: 'external'
                                });
                            } catch (e) {
                                console.error(`Error reading ${mcpPath}:`, e);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error reading marketplace templates:', error);
    }

    return templates;
}

export default {
    getGlobalSettings,
    saveGlobalSettings,
    getProjects,
    getProjectMcpConfig,
    saveProjectMcpConfig,
    getAllServers,
    addServer,
    updateServer,
    deleteServer,
    toggleServer,
    getMarketplaceTemplates,
    createBackup,
    listBackups,
    restoreBackup,
    deleteBackup
};
