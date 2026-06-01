# Mcp-Hub

> ⚠️ **Démo / Aperçu** — Ce dépôt et l'environnement de _preview_ associé sont
> fournis **à titre de démonstration uniquement**. Les données ne sont pas
> persistantes (elles peuvent être réinitialisées à tout moment) et certaines
> fonctionnalités sont limitées ou instables. Ne l'utilisez pas en production.

MCP Manager est une interface de configuration de serveurs MCP (Model Context
Protocol). Elle comprend un backend Node.js et un frontend React/Vite.

## Lancer en local (développement)

```bash
docker compose -f docker-compose.dev.yml up
```

Le frontend est servi par Vite et le backend expose l'API consommée par
l'interface.
