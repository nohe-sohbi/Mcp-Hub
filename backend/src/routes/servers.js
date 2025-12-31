import { Router } from 'express';
import {
    getAllServers,
    addServer,
    updateServer,
    deleteServer,
    toggleServer
} from '../services/claudeConfig.js';

const router = Router();

// GET /api/servers - List all MCP servers
router.get('/', async (req, res, next) => {
    try {
        const servers = await getAllServers();
        res.json(servers);
    } catch (error) {
        next(error);
    }
});

// POST /api/servers - Add new MCP server
router.post('/', async (req, res, next) => {
    try {
        const { name, config, scope, scopePath } = req.body;

        if (!name || !config) {
            return res.status(400).json({ error: 'Name and config are required' });
        }

        await addServer(name, config, scope || 'global', scopePath);
        res.status(201).json({ success: true, message: `Server '${name}' added` });
    } catch (error) {
        next(error);
    }
});

// PUT /api/servers/:id - Update MCP server
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { config } = req.body;

        if (!config) {
            return res.status(400).json({ error: 'Config is required' });
        }

        await updateServer(decodeURIComponent(id), config);
        res.json({ success: true, message: 'Server updated' });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/servers/:id - Delete MCP server
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteServer(decodeURIComponent(id));
        res.json({ success: true, message: 'Server deleted' });
    } catch (error) {
        next(error);
    }
});

// POST /api/servers/:id/toggle - Toggle server enabled state
router.post('/:id/toggle', async (req, res, next) => {
    try {
        const { id } = req.params;
        const newState = await toggleServer(decodeURIComponent(id));
        res.json({ success: true, enabled: newState });
    } catch (error) {
        next(error);
    }
});

export default router;
