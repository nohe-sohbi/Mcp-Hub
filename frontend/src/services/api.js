import { v4 as uuidv4 } from 'uuid';

// Mock Data
const MOCK_PROVIDERS = [
    { id: 'claude', name: 'Claude Desktop', active: true, isDefault: true, connected: true },
    { id: 'cursor', name: 'Cursor', active: false, isDefault: false, connected: false }
];

const MOCK_SERVERS = [
    {
        id: 'filesystem',
        name: 'Filesystem',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/home/user/projects'],
        env: {},
        active: true,
        scope: 'global'
    },
    {
        id: 'github',
        name: 'GitHub',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_TOKEN: 'sk-...' },
        active: true,
        scope: 'project'
    },
    {
        id: 'postgres',
        name: 'PostgreSQL',
        type: 'stdio',
        command: 'uvx',
        args: ['mcp-server-postgres', 'postgresql://localhost/db'],
        env: {},
        active: false,
        scope: 'user-local'
    }
];

const MOCK_PROJECTS = [
    {
        id: 'proj_1',
        name: 'E-commerce Platform',
        path: '/home/user/projects/ecommerce',
        configPath: '/home/user/projects/ecommerce/.mcp.json',
        serverCount: 2,
        lastModified: new Date().toISOString()
    },
    {
        id: 'proj_2',
        name: 'Data Analysis Tool',
        path: '/home/user/projects/data-tool',
        configPath: '/home/user/projects/data-tool/.mcp.json',
        serverCount: 1,
        lastModified: new Date(Date.now() - 86400000).toISOString()
    }
];

const MOCK_MARKETPLACE = [
    {
        id: 'github',
        name: 'GitHub',
        description: 'Integration with GitHub API for repository management and PRs.',
        author: 'Model Context Protocol',
        downloads: 12500,
        stars: 4500
    },
    {
        id: 'postgres',
        name: 'PostgreSQL',
        description: 'Read-only access to PostgreSQL databases.',
        author: 'Model Context Protocol',
        downloads: 8900,
        stars: 3200
    },
    {
        id: 'slack',
        name: 'Slack',
        description: 'Send messages and read channels in Slack.',
        author: 'Community',
        downloads: 5400,
        stars: 1800
    },
    {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Secure access to local files and directories.',
        author: 'Model Context Protocol',
        downloads: 25000,
        stars: 5000
    },
    {
        id: 'brave-search',
        name: 'Brave Search',
        description: 'Web search capabilities using Brave Search API.',
        author: 'Community',
        downloads: 4100,
        stars: 1200
    }
];

// Helper to simulate network delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API Implementation
export const healthCheck = async () => {
    await delay(200);
    return { status: 'ok' };
};

// Providers
export const getProviders = async () => {
    await delay();
    return MOCK_PROVIDERS;
};

export const getProvider = async (id) => {
    await delay();
    return MOCK_PROVIDERS.find(p => p.id === id);
};

export const getProviderConfig = async () => {
    await delay();
    return {
        claude: { path: '/home/user/.claude/desktop' },
        cursor: { path: '/home/user/.cursor' }
    };
};

export const updateProviderConfig = async (config) => {
    await delay();
    return { success: true };
};

export const setActiveProviders = async (providerIds) => {
    await delay();
    return { success: true };
};

export const setDefaultProvider = async (providerId) => {
    await delay();
    return { success: true };
};

export const toggleProviderActive = async (id) => {
    await delay();
    const provider = MOCK_PROVIDERS.find(p => p.id === id);
    if (provider) provider.active = !provider.active;
    return { success: true, active: provider?.active };
};

export const setSyncOnInstall = async (enabled) => {
    await delay();
    return { success: true };
};

// Servers
export const getServers = async (provider) => {
    await delay();
    return MOCK_SERVERS;
};

export const addServer = async (data) => {
    await delay(800);
    const newServer = {
        ...data,
        id: uuidv4(),
        active: true
    };
    MOCK_SERVERS.push(newServer);
    return newServer;
};

export const updateServer = async (id, config) => {
    await delay(600);
    const index = MOCK_SERVERS.findIndex(s => s.id === id);
    if (index !== -1) {
        MOCK_SERVERS[index] = { ...MOCK_SERVERS[index], ...config };
    }
    return MOCK_SERVERS[index];
};

export const deleteServer = async (id) => {
    await delay(600);
    const index = MOCK_SERVERS.findIndex(s => s.id === id);
    if (index !== -1) {
        MOCK_SERVERS.splice(index, 1);
    }
    return { success: true };
};

export const toggleServer = async (id) => {
    await delay(300);
    const server = MOCK_SERVERS.find(s => s.id === id);
    if (server) server.active = !server.active;
    return { success: true, active: server?.active };
};

// Projects
export const getProjects = async () => {
    await delay();
    return MOCK_PROJECTS;
};

export const getProject = async (id) => {
    await delay();
    return MOCK_PROJECTS.find(p => p.id === id);
};

// Marketplace
export const getMarketplace = async () => {
    await delay(800);
    return MOCK_MARKETPLACE;
};

export const installTemplate = async (data) => {
    await delay(1500);
    const template = MOCK_MARKETPLACE.find(m => m.id === data.templateId);
    if (template) {
        MOCK_SERVERS.push({
            id: uuidv4(),
            name: template.name,
            type: 'stdio',
            command: 'npx',
            args: ['-y', `@modelcontextprotocol/server-${template.id}`],
            env: {},
            active: true,
            scope: 'global'
        });
    }
    return { success: true };
};

export default {
    healthCheck,
    getProviders,
    getProvider,
    getProviderConfig,
    updateProviderConfig,
    setActiveProviders,
    setDefaultProvider,
    toggleProviderActive,
    setSyncOnInstall,
    getServers,
    addServer,
    updateServer,
    deleteServer,
    toggleServer,
    getProjects,
    getProject,
    getMarketplace,
    installTemplate
};
