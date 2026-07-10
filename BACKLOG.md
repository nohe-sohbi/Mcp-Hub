# BACKLOG — Audit & sprint MCP Manager (v2)

Nouvel audit sur la branche `claude/repo-audit-execution-sp6os6`, après clôture du
premier sprint (PR #1 & #2 mergées).

**État général** : le repo compile (`vite build` ✅), le backend démarre et répond sur
tous ses endpoints (`/api/health`, `/providers`, `/servers`, `/marketplace`,
`/projects`, `/backups`). C'est un **produit de démo** (React/Vite + backend Express)
avec un repli client-side (`localStorage`) qui masque les défauts du backend réel dès
qu'une requête échoue. La sécurité a déjà été durcie (voir `.jules/sentinel.md`).

Le premier backlog est intégralement vidé. Cet audit repart de zéro et se concentre
sur les **incohérences réelles restantes** entre le chemin d'écriture et le chemin de
lecture côté backend réel — invisibles en mode démo, bloquantes en usage réel.

---

## 🔴 À réparer

- [x] **P0-1 · [M] · Les serveurs de portée projet sont écrits mais jamais listés (backend réel).**
  `providers/index.js › getServersFromProviders` n'interroge que
  `provider.getGlobalServers()` — jamais `getProjectServers()`. Conséquence : ajouter un
  serveur à un projet (page **Servers** scope « Project (Local) », bouton **« Add Server »**
  d'un projet, ou **installation marketplace** avec scope projet) écrit bien le
  `.mcp.json` mais le serveur **n'apparaît nulle part** :
  filtre « project » de la page Servers vide, liste des serveurs par projet vide,
  état install/désinstall du marketplace erroné, compteurs du Dashboard faux.
  _Prouvé_ : `POST /servers` (scope=project) → fichier `.mcp.json` écrit, puis
  `GET /servers` → `[]`. Le flux « chaque projet a sa config MCP locale » (mis en avant
  dans l'UI) est donc cassé de bout en bout sur le backend réel.
  **Correction** : étendre `getServersFromProviders` pour agréger aussi les serveurs de
  projet — pour chaque provider actif supportant les projets, parcourir les projets
  connus (`getProjects()` du service `claudeConfig`) et appeler
  `provider.getProjectServers(project.path)`, en renseignant `scopeName` pour l'affichage.

---

## 🟡 Essentiel manquant

_Aucun._ Une fois P0-1 corrigé, tous les parcours principaux (ajouter / éditer /
activer / supprimer un serveur global **ou projet**, parcourir les projets,
installer / désinstaller depuis le marketplace en global **ou projet**, régler les
providers, gérer les backups) sont accessibles et cohérents de bout en bout.

---

## 🟢 Contenu à compléter / nettoyage

- [ ] **P2-1 · [S] · Code mort dans `services/claudeConfig.js`.** Les fonctions CRUD
  serveur antérieures à la migration vers l'architecture « providers »
  (`getAllServers`, `addServer`, `updateServer`, `deleteServer`, `toggleServer`) ne
  sont référencées par **aucune route** — les routes passent toutes par le registre de
  providers (`providers/index.js`). Elles portent une logique de parsing d'ID
  divergente (`scope:name` au lieu de `providerId:scope:...`) qui prête à confusion.
  Non bloquant. Optionnel : les retirer (avec leur entrée dans l'export par défaut) pour
  éviter deux implémentations concurrentes.

---

## Statut

Audit terminé. **En attente de validation** avant exécution de la Phase 2.
