## 2026-03-14 - Path Traversal in Backup Operations
**Vulnerability:** Path traversal vulnerability in `backend/src/services/claudeConfig.js` where user-supplied `backupId` inputs in `restoreBackup` and `deleteBackup` are directly joined using `path.join` without proper validation, allowing arbitrary file read/write/delete.
**Learning:** `path.join` does not resolve path traversal automatically to keep it safe; it normalizes the path but allows navigating up the directory tree using `..`. Direct input should be sanitized, or the joined path should be validated against the base directory.
**Prevention:** Explicitly validate file names to reject path separators (`/`, `\`) or traversal sequences (`..`), or ensure `path.resolve` stays within the expected directory constraints.
