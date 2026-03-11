# MCP Manager

Web interface for managing Model Context Protocol (MCP) servers in Claude. Configures usage contexts (global, project-specific, user) and environment variables.

## Tech Stack

*   **Frontend**: React, Vite
*   **Backend**: Express.js (Port 3001)

## Installation

```bash
git clone https://github.com/your-org/mcp-manager.git
cd mcp-manager

# Install dependencies
(cd backend && npm install)
(cd frontend && npm install)
```

## Usage

Start both services:

```bash
./start.sh
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

### Docker

```bash
docker-compose up --build
```

## Configuration

The application manages configuration in:
- `~/.claude/settings.local.json` (Global)
- `~/.claude.json` (User)
- `.mcp.json` (Project)

Backups are stored in `~/.claude/mcp-manager-backups/`.