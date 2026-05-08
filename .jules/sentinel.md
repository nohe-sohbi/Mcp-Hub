## 2026-03-14 - Path Traversal in Backup Operations
**Vulnerability:** Path traversal vulnerability in `backend/src/services/claudeConfig.js` where user-supplied `backupId` inputs in `restoreBackup` and `deleteBackup` are directly joined using `path.join` without proper validation, allowing arbitrary file read/write/delete.
**Learning:** `path.join` does not resolve path traversal automatically to keep it safe; it normalizes the path but allows navigating up the directory tree using `..`. Direct input should be sanitized, or the joined path should be validated against the base directory.
**Prevention:** Explicitly validate file names to reject path separators (`/`, `\`) or traversal sequences (`..`), or ensure `path.resolve` stays within the expected directory constraints.

## 2026-03-28 - Path Traversal Vulnerability in MCP Servers Project Config Routes
**Vulnerability:** Path traversal possible through `scopePath` parameter and ID components in MCP servers route (`backend/src/routes/servers.js`) and base provider class (`backend/src/providers/BaseProvider.js`).
**Learning:** External user inputs used to reconstruct paths, especially URLs decoding, must be validated as absolute and free of traversal sequences (`..`) prior to path joining operations or OS system calls.
**Prevention:** Strictly enforce absolute paths (`path.isAbsolute`) and explicitly reject strings containing traversal sequences (`includes('..')`) whenever generating filesystem paths from external IDs. Ensure URL-encoded segments are decoded properly prior to validation.

## 2026-04-04 - Missing Security Headers in Express Application
**Vulnerability:** The Express backend was missing standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`) and exposed `X-Powered-By`, making it potentially susceptible to MIME sniffing, Clickjacking, and cross-site scripting attacks, while leaking technology details.
**Learning:** By default, Express does not include many essential security headers and includes the `X-Powered-By` header which leaks the server framework.
**Prevention:** Always implement a security middleware (or use libraries like `helmet`) to set standard security headers (`nosniff`, `DENY`, `1; mode=block`) and disable `x-powered-by` to implement defense in depth.

## 2025-04-05 - Missing Path Traversal Validation at Route Boundary
**Vulnerability:** The `/api/marketplace/install` route extracted `scopePath` from user input without validation at the route level. While lower layers (BaseProvider) eventually enforced absolute paths and threw errors for relative or `..` paths, the HTTP route directly passed unvalidated input down, resulting in generic 500 internal server errors (failed to install to provider) instead of proper 400 Bad Request responses.
**Learning:** Security validations for HTTP inputs must be performed as early as possible at the request boundary (route handlers), even if deeper layers have validation. This prevents invalid input from traversing the application stack and ensures consistent, expected error handling behavior across similar endpoints.
**Prevention:** Always validate all user-supplied paths right at the route controller level before handing them to services/providers. Explicitly check that paths are absolute and do not contain `..` sequences, following the established pattern from other routes like `servers.js`.
## 2026-05-08 - Prevent DoS via Payload Limit and Information Leakage via Error Handler
**Vulnerability:** The application was vulnerable to Denial of Service (DoS) attacks due to unbounded JSON body payloads and potentially leaked sensitive internal paths or stack details through raw `err.message` responses on unhandled exceptions in the global error handler.
**Learning:** Default `express.json()` middleware does not enforce payload limits, creating vectors for payload-based DoS. Global error handlers should never return raw error messages to the client.
**Prevention:** Always set an explicit `limit` (e.g., `1mb`) when using body parsers and return a generic 'Internal Server Error' message for 500 status codes, while maintaining internal logging for observability.
