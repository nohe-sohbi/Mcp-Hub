import { Router } from 'express';
import { getProjects, getProjectMcpConfig } from '../services/claudeConfig.js';

const router = Router();

// GET /api/projects - List all Claude projects
router.get('/', async (req, res, next) => {
    try {
        const projects = await getProjects();
        res.json(projects);
    } catch (error) {
        next(error);
    }
});

// GET /api/projects/:id - Get single project with MCP config
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const projects = await getProjects();
        const project = projects.find(p => p.id === id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const mcpConfigs = await getProjectMcpConfig(project.path);

        res.json({
            ...project,
            mcpConfigs
        });
    } catch (error) {
        next(error);
    }
});

export default router;
