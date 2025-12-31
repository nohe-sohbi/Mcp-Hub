import { Router } from 'express';
import { listBackups, restoreBackup, deleteBackup } from '../services/claudeConfig.js';

const router = Router();

/**
 * GET /api/backups
 * List all backups
 */
router.get('/', async (req, res, next) => {
    try {
        const backups = await listBackups();
        res.json(backups);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/backups/:id/restore
 * Restore a specific backup
 */
router.post('/:id/restore', async (req, res, next) => {
    try {
        const { id } = req.params;
        const restoredPath = await restoreBackup(id);
        res.json({
            success: true,
            message: 'Backup restored successfully',
            restoredPath
        });
    } catch (error) {
        if (error.message === 'Backup not found') {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
});

/**
 * DELETE /api/backups/:id
 * Delete a specific backup
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await deleteBackup(id);
        res.json({ success: true, message: 'Backup deleted' });
    } catch (error) {
        if (error.message === 'Backup not found') {
            return res.status(404).json({ error: error.message });
        }
        next(error);
    }
});

export default router;
