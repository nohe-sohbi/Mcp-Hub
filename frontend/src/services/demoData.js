/**
 * Demo data layer.
 *
 * Provides a fully client-side, in-memory + localStorage backed store so the
 * app stays interactive ("clickable everywhere") even when no backend is
 * reachable — which is exactly the case for the public preview/demo.
 *
 * The API layer (services/api.js) falls back to these handlers automatically
 * whenever a real request fails, or immediately when demo mode is forced via
 * the VITE_DEMO_MODE env var.
 */

const STORAGE_KEY = 'mcp-demo-state-v2';

// ---------------------------------------------------------------------------
// Seed data — realistic defaults so the demo looks alive on first load.
// ---------------------------------------------------------------------------

const PROVIDER_DEFS = [
    {
        id: 'claude-code',
        name: 'Claude Code',
        installed: true,
        supportsProjects: true,
        globalConfigPath: '~/.claude.json'
    },
    {
        id: 'claude-desktop',
        name: 'Claude Desktop',
        installed: true,
        supportsProjects: false,
        globalConfigPath: '~/Library/Application Support/Claude/claude_desktop_config.json'
    },
    {
        id: 'opencode',
        name: 'OpenCode',
        installed: false,
        supportsProjects: true,
        globalConfigPath: '~/.config/opencode/config.json'
    }
];

const MARKETPLACE_TEMPLATES = [
    {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Access local files and directories',
        category: 'utility',
        config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/home'] }
    },
    {
        id: 'sequential-thinking',
        name: 'Sequential Thinking',
        description: 'Step-by-step reasoning and problem solving',
        category: 'utility',
        config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'] }
    },
    {
        id: 'puppeteer',
        name: 'Puppeteer',
        description: 'Browser automation and web scraping',
        category: 'utility',
        config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'] }
    },
    {
        id: 'postgres',
        name: 'PostgreSQL',
        description: 'Query PostgreSQL databases',
        category: 'database',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-postgres'],
            env: { POSTGRES_CONNECTION_STRING: 'postgresql://user:pass@localhost:5432/db' }
        }
    },
    {
        id: 'sqlite',
        name: 'SQLite',
        description: 'Query SQLite databases',
        category: 'database',
        config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', './database.db'] }
    },
    {
        id: 'github-http',
        name: 'GitHub',
        description: 'Interact with GitHub repositories',
        category: 'integration',
        config: {
            type: 'http',
            url: 'https://api.githubcopilot.com/mcp/',
            headers: { Authorization: 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}' }
        }
    },
    {
        id: 'slack-sse',
        name: 'Slack',
        description: 'Send and receive Slack messages',
        category: 'integration',
        config: { type: 'sse', url: 'https://mcp.slack.com/sse' }
    }
];

function seedState() {
    return {
        servers: [
            {
                id: 'srv_filesystem',
                name: 'filesystem',
                type: 'stdio',
                enabled: true,
                scope: 'global',
                scopeName: null,
                scopePath: null,
                provider: 'claude-code',
                providerName: 'Claude Code',
                config: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-filesystem', '/home/user'],
                    enabled: true
                }
            },
            {
                id: 'srv_github',
                name: 'github',
                type: 'http',
                enabled: true,
                scope: 'global',
                scopeName: null,
                scopePath: null,
                provider: 'claude-code',
                providerName: 'Claude Code',
                config: {
                    type: 'http',
                    url: 'https://api.githubcopilot.com/mcp/',
                    headers: { Authorization: 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}' },
                    enabled: true
                }
            },
            {
                id: 'srv_sequential',
                name: 'sequential-thinking',
                type: 'stdio',
                enabled: true,
                scope: 'global',
                scopeName: null,
                scopePath: null,
                provider: 'claude-desktop',
                providerName: 'Claude Desktop',
                config: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
                    enabled: true
                }
            },
            {
                id: 'srv_postgres',
                name: 'postgres',
                type: 'stdio',
                enabled: false,
                scope: 'user-local',
                scopeName: 'my-api',
                scopePath: '/home/user/projects/my-api',
                provider: 'claude-code',
                providerName: 'Claude Code',
                config: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-postgres'],
                    env: { POSTGRES_CONNECTION_STRING: 'postgresql://user:pass@localhost:5432/app' },
                    enabled: false
                }
            }
        ],
        projects: [
            {
                id: 'proj_my_api',
                name: 'my-api',
                path: '/home/user/projects/my-api',
                hasMcpConfig: true,
                mcpLocations: { project: '/home/user/projects/my-api/.mcp.json', claude: null }
            },
            {
                id: 'proj_web_dashboard',
                name: 'web-dashboard',
                path: '/home/user/projects/web-dashboard',
                hasMcpConfig: false,
                mcpLocations: { project: null, claude: null }
            },
            {
                id: 'proj_data_science',
                name: 'data-science',
                path: '/home/user/projects/data-science',
                hasMcpConfig: true,
                mcpLocations: { project: null, claude: '/home/user/.claude.json' }
            }
        ],
        config: {
            activeProviders: ['claude-code', 'claude-desktop'],
            defaultProvider: 'claude-code',
            syncOnInstall: false
        }
    };
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

let memoryState = null;

function loadState() {
    if (memoryState) return memoryState;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
            memoryState = JSON.parse(raw);
            return memoryState;
        }
    } catch {
        // localStorage unavailable (private mode, etc.) — fall back to memory.
    }
    memoryState = seedState();
    saveState();
    return memoryState;
}

function saveState() {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
    } catch {
        // Ignore persistence errors; state still lives in memory for the session.
    }
}

/** Wipe demo state back to the seed (used by the onboarding "reset" action). */
export function resetDemoState() {
    memoryState = seedState();
    saveState();
    return memoryState;
}

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

const clone = (value) => JSON.parse(JSON.stringify(value));
const delay = (value, ms = 120) => new Promise((resolve) => setTimeout(() => resolve(clone(value)), ms));

function deriveType(config = {}) {
    if (config.command) return 'stdio';
    if (config.type === 'sse') return 'sse';
    return 'http';
}

function scopeInfoFor(state, scope, scopePath) {
    if (scope === 'global' || !scopePath) return { scopeName: null, scopePath: null };
    const project = state.projects.find((p) => p.path === scopePath);
    return { scopeName: project ? project.name : 'Project', scopePath };
}

function normalize(name) {
    return (name || '').toLowerCase().replace(/[-\s_]/g, '');
}

// ---------------------------------------------------------------------------
// Public handlers — mirror the signatures used by services/api.js
// ---------------------------------------------------------------------------

export const demo = {
    healthCheck: () => delay({ status: 'ok', demo: true }, 50),

    // Providers ------------------------------------------------------------
    getProviders: () => {
        const state = loadState();
        return delay(
            PROVIDER_DEFS.map((p) => ({ ...p, active: state.config.activeProviders.includes(p.id) }))
        );
    },
    getProviderConfig: () => delay(loadState().config),
    updateProviderConfig: (updates) => {
        const state = loadState();
        state.config = { ...state.config, ...updates };
        saveState();
        return delay(state.config);
    },

    // Servers --------------------------------------------------------------
    getServers: (provider) => {
        const state = loadState();
        const servers = provider ? state.servers.filter((s) => s.provider === provider) : state.servers;
        return delay(servers);
    },
    addServer: (data) => {
        const state = loadState();
        const config = { ...data.config };
        const { scopeName, scopePath } = scopeInfoFor(state, data.scope, data.scopePath);
        const provider = state.config.defaultProvider;
        const providerDef = PROVIDER_DEFS.find((p) => p.id === provider);
        const server = {
            id: `srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            name: data.name,
            type: deriveType(config),
            enabled: config.enabled !== false,
            scope: data.scope || 'global',
            scopeName,
            scopePath,
            provider,
            providerName: providerDef ? providerDef.name : provider,
            config
        };
        state.servers = [server, ...state.servers];
        saveState();
        return delay({ success: true, server });
    },
    updateServer: (id, config) => {
        const state = loadState();
        const server = state.servers.find((s) => s.id === id);
        if (server) {
            server.config = { ...config };
            server.type = deriveType(config);
            server.enabled = config.enabled !== false;
            saveState();
        }
        return delay({ success: true, server });
    },
    deleteServer: (id) => {
        const state = loadState();
        state.servers = state.servers.filter((s) => s.id !== id);
        saveState();
        return delay({ success: true });
    },
    toggleServer: (id) => {
        const state = loadState();
        const server = state.servers.find((s) => s.id === id);
        if (server) {
            server.enabled = !server.enabled;
            server.config = { ...server.config, enabled: server.enabled };
            saveState();
        }
        return delay({ success: true, server });
    },

    // Projects -------------------------------------------------------------
    getProjects: () => delay(loadState().projects),
    getProject: (id) => delay(loadState().projects.find((p) => p.id === id) || null),

    // Marketplace ----------------------------------------------------------
    getMarketplace: () => delay(MARKETPLACE_TEMPLATES),
    installTemplate: (data) => {
        const state = loadState();
        const template = MARKETPLACE_TEMPLATES.find((t) => t.id === data.templateId);
        if (!template) return delay({ error: 'Template not found' });

        // Avoid duplicates — marketplace matches installed servers by name.
        const alreadyInstalled = state.servers.some((s) => normalize(s.name) === normalize(template.id));
        if (!alreadyInstalled) {
            const config = { ...template.config, enabled: true };
            const { scopeName, scopePath } = scopeInfoFor(state, data.scope, data.scopePath);
            const provider = state.config.defaultProvider;
            const providerDef = PROVIDER_DEFS.find((p) => p.id === provider);
            state.servers = [
                {
                    id: `srv_${normalize(template.id)}_${Date.now().toString(36)}`,
                    name: template.id,
                    type: deriveType(config),
                    enabled: true,
                    scope: data.scope || 'global',
                    scopeName,
                    scopePath,
                    provider,
                    providerName: providerDef ? providerDef.name : provider,
                    config
                },
                ...state.servers
            ];
            saveState();
        }
        return delay({ success: true, serverName: template.id });
    }
};

export default demo;
