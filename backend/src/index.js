import express from 'express';
import cors from 'cors';
import serversRouter from './routes/servers.js';
import projectsRouter from './routes/projects.js';
import marketplaceRouter from './routes/marketplace.js';
import backupsRouter from './routes/backups.js';
import providersRouter from './routes/providers.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security Enhancements
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
// SECURITY: Enforce payload limit to prevent DoS
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/providers', providersRouter);
app.use('/api/servers', serversRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/backups', backupsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  // SECURITY: Don't leak error details to the client
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 MCP Manager API running on http://localhost:${PORT}`);
});
