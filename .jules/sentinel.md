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

## 2026-04-05 - Destructive Path Serialization in Backup Operations
**Vulnerability:** The backup mechanism in `backend/src/services/claudeConfig.js` used a destructive path serialization approach (replacing path separators with underscores `_`) to generate backup filenames. This could lead to path collisions and prevents accurate reconstruction/deserialization of original file paths if the path originally contained an underscore.
**Learning:** Reconstructing file paths by replacing serialized characters (`_` back to `/`) is prone to errors and corruption. Destructive serialization methods that lose information should never be used when accurate deserialization is required.
**Prevention:** Always use safe encoding methods like `encodeURIComponent` to securely serialize full paths into filenames without losing information, ensuring accurate deserialization with `decodeURIComponent`.

## 2026-05-08 - Prevent DoS via Payload Limit and Information Leakage via Error Handler
**Vulnerability:** The application was vulnerable to Denial of Service (DoS) attacks due to unbounded JSON body payloads and potentially leaked sensitive internal paths or stack details through raw `err.message` responses on unhandled exceptions in the global error handler.
**Learning:** Default `express.json()` middleware does not enforce payload limits, creating vectors for payload-based DoS. Global error handlers should never return raw error messages to the client.
**Prevention:** Always set an explicit `limit` (e.g., `1mb`) when using body parsers and return a generic 'Internal Server Error' message for 500 status codes, while maintaining internal logging for observability.

## 2024-05-18 - Prototype Pollution via Configuration Objects
**Vulnerability:** The application's server configuration updates (like `servers[name] = config`) in `backend/src/routes/servers.js` and `backend/src/routes/marketplace.js` were vulnerable to Prototype Pollution. An attacker could supply `__proto__`, `constructor`, or `prototype` as the server name, modifying global Object properties and potentially leading to application instability or other exploit paths.
**Learning:** Even if data is parsed from JSON, if arbitrary user-controlled keys are used to assign properties on objects, especially config objects that might be merged or assigned globally, Prototype Pollution can occur. `Object.assign` or spread syntax into objects mapped by a dynamic key can trigger this when the key is `__proto__`.
**Prevention:** Always validate user-provided keys used in object property assignments against reserved keywords (`__proto__`, `constructor`, `prototype`), or use `Map` objects or `Object.create(null)` for dictionary structures that accept arbitrary keys.
