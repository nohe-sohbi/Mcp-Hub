import { Router } from 'express';
import { getMarketplaceTemplates, addServer } from '../services/claudeConfig.js';

const router = Router();

// Curated popular templates (in addition to discovered ones)
const CURATED_TEMPLATES = [
    {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Access local files and directories',
        category: 'utility',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/home']
        }
    },
    {
        id: 'sequential-thinking',
        name: 'Sequential Thinking',
        description: 'Step-by-step reasoning and problem solving',
        category: 'utility',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-sequential-thinking']
        }
    },
    {
        id: 'puppeteer',
        name: 'Puppeteer',
        description: 'Browser automation and web scraping',
        category: 'utility',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-puppeteer']
        }
    },
    {
        id: 'postgres',
        name: 'PostgreSQL',
        description: 'Query PostgreSQL databases',
        category: 'database',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-postgres'],
            env: {
                POSTGRES_CONNECTION_STRING: 'postgresql://user:pass@localhost:5432/db'
            }
        }
    },
    {
        id: 'sqlite',
        name: 'SQLite',
        description: 'Query SQLite databases',
        category: 'database',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', './database.db']
        }
    },
    {
        id: 'github-http',
        name: 'GitHub',
        description: 'Interact with GitHub repositories',
        category: 'integration',
        config: {
            type: 'http',
            url: 'https://api.githubcopilot.com/mcp/',
            headers: {
                'Authorization': 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}'
            }
        }
    },
    {
        id: 'slack-sse',
        name: 'Slack',
        description: 'Send and receive Slack messages',
        category: 'integration',
        config: {
            type: 'sse',
            url: 'https://mcp.slack.com/sse'
        }
    }
];

// GET /api/marketplace - List all available templates
router.get('/', async (req, res, next) => {
    try {
        const discoveredTemplates = await getMarketplaceTemplates();

        // Merge curated with discovered, avoiding duplicates
        const allTemplates = [...CURATED_TEMPLATES];

        for (const template of discoveredTemplates) {
            const exists = allTemplates.some(t => t.id === template.id);
            if (!exists) {
                allTemplates.push(template);
            }
        }

        res.json(allTemplates);
    } catch (error) {
        next(error);
    }
});

// POST /api/marketplace/install - Install a template
router.post('/install', async (req, res, next) => {
    try {
        const { templateId, scope, scopePath, customConfig } = req.body;

        // Find template
        const discoveredTemplates = await getMarketplaceTemplates();
        let template = [...CURATED_TEMPLATES, ...discoveredTemplates]
            .find(t => t.id === templateId);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Get the server config (handle both formats)
        let serverName = templateId;
        let serverConfig = template.config;

        // If config has server name as key
        if (template.config && !template.config.command && !template.config.type && !template.config.url) {
            const keys = Object.keys(template.config).filter(k => k !== 'mcpServers');
            if (keys.length > 0) {
                serverName = keys[0];
                serverConfig = template.config[keys[0]];
            }
        }

        // Merge with custom config
        const finalConfig = { ...serverConfig, ...customConfig };

        await addServer(serverName, finalConfig, scope || 'global', scopePath);

        res.status(201).json({
            success: true,
            message: `Installed '${serverName}' from marketplace`,
            serverName
        });
    } catch (error) {
        next(error);
    }
});

export default router;
