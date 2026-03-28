## 2026-03-14 - Path Traversal in Backup Operations
**Vulnerability:** Path traversal vulnerability in `backend/src/services/claudeConfig.js` where user-supplied `backupId` inputs in `restoreBackup` and `deleteBackup` are directly joined using `path.join` without proper validation, allowing arbitrary file read/write/delete.
**Learning:** `path.join` does not resolve path traversal automatically to keep it safe; it normalizes the path but allows navigating up the directory tree using `..`. Direct input should be sanitized, or the joined path should be validated against the base directory.
**Prevention:** Explicitly validate file names to reject path separators (`/`, `\`) or traversal sequences (`..`), or ensure `path.resolve` stays within the expected directory constraints.

## 2026-03-28 - Path Traversal Vulnerability in MCP Servers Project Config Routes
**Vulnerability:** Path traversal possible through `scopePath` parameter and ID components in MCP servers route (`backend/src/routes/servers.js`) and base provider class (`backend/src/providers/BaseProvider.js`).
**Learning:** External user inputs used to reconstruct paths, especially URLs decoding, must be validated as absolute and free of traversal sequences (`..`) prior to path joining operations or OS system calls.
**Prevention:** Strictly enforce absolute paths (`path.isAbsolute`) and explicitly reject strings containing traversal sequences (`includes('..')`) whenever generating filesystem paths from external IDs. Ensure URL-encoded segments are decoded properly prior to validation.
