# Mcp-Hub

> ⚠️ **Démo / Aperçu** — Ce dépôt et l'environnement de _preview_ associé sont
> fournis **à titre de démonstration uniquement**. Les données ne sont pas
> persistantes (elles peuvent être réinitialisées à tout moment) et certaines
> fonctionnalités sont limitées ou instables. Ne l'utilisez pas en production.

MCP Manager est une interface de configuration de serveurs MCP (Model Context
Protocol). Elle comprend un backend Node.js et un frontend React/Vite.

<<<<<<< Updated upstream

## Mode démo

=======

- **Frontend**: React, Vite
- **Backend**: Express.js (Port 3001)
  > > > > > > > Stashed changes

Pour que l'aperçu reste **entièrement cliquable même sans backend**, le frontend
bascule automatiquement sur un jeu de **données de démo** (servies depuis le
navigateur, persistées en `localStorage`) dès qu'une requête API échoue. Vous
pouvez ajouter/éditer/supprimer des serveurs, installer des intégrations depuis
le marketplace, basculer des providers… le tout sans serveur.

- Une **visite guidée** se lance à la première ouverture et présente chaque
  section. Vous pouvez la relancer à tout moment via le bouton **« Visite
  guidée »** dans la barre latérale.
- Contrôle explicite via la variable d'environnement de build :
  - `VITE_DEMO_MODE=true` — force le mode démo (n'appelle jamais l'API réelle) ;
  - `VITE_DEMO_MODE=false` — désactive le mode démo (backend réel uniquement) ;
  - non définie (par défaut) — backend réel, avec repli automatique sur la démo.

## Lancer en local (développement)

```bash
docker compose -f docker-compose.dev.yml up
```

<<<<<<< Updated upstream
Le frontend est servi par Vite et le backend expose l'API consommée par
l'interface.
=======

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

> > > > > > > Stashed changes
