import { Router } from 'express';
import { getProvider, addServerToProviders } from '../providers/index.js';
import { getManagerConfig } from '../services/providerConfig.js';

const router = Router();

// Note: getMarketplaceTemplates is kept for discovering templates from plugins
// For now we just use curated templates

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
        // Return curated templates
        // TODO: Add discovered templates from plugins later
        res.json(CURATED_TEMPLATES);
    } catch (error) {
        next(error);
    }
});

// POST /api/marketplace/install - Install a template
router.post('/install', async (req, res, next) => {
    try {
        const { templateId, scope, scopePath, customConfig, providers } = req.body;

        // Find template
        let template = CURATED_TEMPLATES.find(t => t.id === templateId);

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

        if (typeof serverName !== 'string') {
            return res.status(400).json({ error: 'Server name must be a string' });
        }

        // SECURITY: Prevent prototype pollution
        if (serverName === '__proto__' || serverName === 'constructor' || serverName === 'prototype') {
            return res.status(400).json({ error: 'Invalid server name: Reserved keyword' });
        }

        // Merge with custom config
        const finalConfig = { ...serverConfig, ...customConfig };

        // Determine target providers
        let targetProviders;
        if (providers && providers.length > 0) {
            // Validate provider IDs
            for (const id of providers) {
                if (!getProvider(id)) {
                    return res.status(400).json({ error: `Unknown provider: ${id}` });
                }
            }
            targetProviders = providers;
        } else {
            // Use default provider or all active if syncOnInstall is enabled
            const managerConfig = await getManagerConfig();
            if (managerConfig.syncOnInstall) {
                targetProviders = managerConfig.activeProviders;
            } else {
                targetProviders = [managerConfig.defaultProvider];
            }
        }

        const results = await addServerToProviders(
            serverName,
            finalConfig,
            scope || 'global',
            scopePath,
            targetProviders
        );

        // Check if any succeeded
        const successes = results.filter(r => r.success);
        const failures = results.filter(r => !r.success);

        if (successes.length === 0) {
            return res.status(500).json({
                error: 'Failed to install template to any provider',
                details: failures
            });
        }

        res.status(201).json({
            success: true,
            message: `Installed '${serverName}' to ${successes.length} provider(s)`,
            serverName,
            results
        });
    } catch (error) {
        next(error);
    }
});

export default router;
