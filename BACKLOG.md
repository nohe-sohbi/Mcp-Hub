# BACKLOG — Audit & sprint MCP Manager

Audit réalisé sur la branche `claude/repo-audit-sprint-wb3tox`.

**État général** : le repo compile (`vite build` OK), le backend démarre et répond
sur tous ses endpoints (`/api/health`, `/providers`, `/servers`, `/marketplace`,
`/projects`, `/backups`). L'app est un **produit de démo** (React/Vite + backend
Express) avec un mode démo client-side (localStorage) qui prend le relais quand
l'API échoue. La sécurité a déjà été durcie (voir `.jules/sentinel.md`).

Le cœur du produit — gérer des serveurs MCP par provider/scope — est câblé de
bout en bout, **sauf deux flux réellement cassés** décrits ci-dessous.

---

## 🔴 À réparer

- [x] **P0-1 · [S] · Éditer un serveur crée un doublon au lieu de le mettre à jour.**
  `Servers.jsx › handleModalSave` appelle toujours `addServer(data)`, même en mode
  édition. Résultat : « Edit » sur un serveur existant en crée un nouveau (id
  différent en démo → doublon ; côté backend réel, perte du scope). Doit appeler
  `updateServer(id, config)` quand on édite.

- [x] **P0-2 · [S] · Ajouter un serveur à un projet perd toujours le chemin (scopePath).**
  `ServerModal.jsx › handleSubmit` envoie `scopePath: formData.scope === 'project' ? … : null`,
  mais les options de scope du formulaire valent `'global'` / `'user-local'` — jamais
  `'project'`. Donc `scopePath` est **toujours `null`** pour un serveur de projet
  (depuis la page Servers **et** depuis le bouton « Add Server » d'un projet). Le
  serveur retombe en global (démo) ou échoue (backend). Corriger la condition pour
  transmettre `scopePath` dès que le scope n'est pas `'global'`.

- [x] **P2-1 · [S] · Reconstruction de chemin bancale dans le fallback legacy de `listBackups`.**
  `claudeConfig.js` (~l.85) : `path.join(parts.join('/')…, parts.pop())` évalue
  `parts.join` puis `parts.pop()`, ce qui duplique le dernier segment. Chemin de
  secours rarement atteint, mais incorrect. Aligné sur la même logique que le reste.

---

## 🟡 Essentiel manquant

_Aucun._ Les parcours principaux (ajouter / éditer / activer / supprimer un serveur,
parcourir projets, installer/désinstaller depuis le marketplace, régler les
providers) sont tous accessibles et fonctionnels une fois les P0 corrigés.

---

## 🟢 Contenu à compléter / notes (hors périmètre du sprint)

- [ ] **P2-2 · API Backups sans UI.** Le backend expose `GET/POST/DELETE /api/backups`
  mais aucune page ne les consomme et `services/api.js` ne les expose même pas.
  Construire une UI de backups serait **inventer du scope** (décision produit) →
  laissé tel quel, signalé comme lacune.

- [ ] **P2-3 · `marketplace.js` TODO** « Add discovered templates from plugins later » :
  templates dynamiques non implémentés, non bloquant (les templates curatés
  suffisent au produit). Laissé en l'état.
</content>
</invoke>
