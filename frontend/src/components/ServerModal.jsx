import { useState, useEffect } from 'react';
import { X, Terminal, Globe, Radio } from 'lucide-react';

function ServerModal({ server, projects, onClose, onSave, preSelectedProject }) {
    const isEditing = !!server;

    const [formData, setFormData] = useState({
        name: '',
        type: 'stdio',
        scope: preSelectedProject ? 'user-local' : 'global',
        scopePath: preSelectedProject?.path || '',
        // stdio fields
        command: '',
        args: '',
        // http/sse fields
        url: '',
        headers: '',
        // common
        env: '',
        enabled: true
    });

    useEffect(() => {
        if (server) {
            const config = server.config || {};
            setFormData({
                name: server.name || '',
                type: server.type || 'stdio',
                scope: server.scope || 'global',
                scopePath: server.scopePath || '',
                command: config.command || '',
                args: (config.args || []).join(' '),
                url: config.url || '',
                headers: config.headers ? JSON.stringify(config.headers, null, 2) : '',
                env: config.env ? JSON.stringify(config.env, null, 2) : '',
                enabled: server.enabled !== false
            });
        }
    }, [server]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Build config based on type
        let config = { enabled: formData.enabled };

        if (formData.type === 'stdio') {
            config.command = formData.command;
            config.args = formData.args.split(' ').filter(a => a.trim());
        } else {
            config.type = formData.type;
            config.url = formData.url;
            if (formData.headers.trim()) {
                try {
                    config.headers = JSON.parse(formData.headers);
                } catch (e) {
                    alert('Invalid headers JSON');
                    return;
                }
            }
        }

        // Parse env if provided
        if (formData.env.trim()) {
            try {
                config.env = JSON.parse(formData.env);
            } catch (e) {
                alert('Invalid env JSON');
                return;
            }
        }

        onSave({
            name: formData.name,
            config,
            scope: formData.scope,
            scopePath: formData.scope === 'project' ? formData.scopePath : null
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="modal-title">
                                {isEditing ? 'Edit Server' : 'Add Server'}
                            </h2>
                            <p className="modal-subtitle">
                                Configure your MCP server connection
                            </p>
                        </div>
                        <button className="btn btn-ghost btn-icon" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Name */}
                        <div className="form-group">
                            <label className="form-label">Server Name</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., filesystem, github, custom-api"
                                required
                                disabled={isEditing}
                            />
                            <p className="form-hint">Unique identifier for this server</p>
                        </div>

                        {/* Type selector */}
                        <div className="form-group">
                            <label className="form-label">Server Type</label>
                            <div className="type-selector">
                                <label className={`type-option ${formData.type === 'stdio' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        value="stdio"
                                        checked={formData.type === 'stdio'}
                                        onChange={handleChange}
                                    />
                                    <Terminal size={16} style={{ marginBottom: '0.25rem' }} />
                                    <div className="type-name">Stdio</div>
                                    <div className="type-desc">Local command</div>
                                </label>
                                <label className={`type-option ${formData.type === 'http' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        value="http"
                                        checked={formData.type === 'http'}
                                        onChange={handleChange}
                                    />
                                    <Globe size={16} style={{ marginBottom: '0.25rem' }} />
                                    <div className="type-name">HTTP</div>
                                    <div className="type-desc">REST endpoint</div>
                                </label>
                                <label className={`type-option ${formData.type === 'sse' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        value="sse"
                                        checked={formData.type === 'sse'}
                                        onChange={handleChange}
                                    />
                                    <Radio size={16} style={{ marginBottom: '0.25rem' }} />
                                    <div className="type-name">SSE</div>
                                    <div className="type-desc">Streaming</div>
                                </label>
                            </div>
                        </div>

                        {/* Scope */}
                        {!isEditing && (
                            <div className="form-group">
                                <label className="form-label">Scope</label>
                                <div className="type-selector" style={{ maxWidth: '300px' }}>
                                    <label className={`type-option ${formData.scope === 'global' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="scope"
                                            value="global"
                                            checked={formData.scope === 'global'}
                                            onChange={handleChange}
                                            disabled={!!preSelectedProject}
                                        />
                                        <div className="type-name">Global</div>
                                    </label>
                                    <label className={`type-option ${formData.scope === 'user-local' ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="scope"
                                            value="user-local"
                                            checked={formData.scope === 'user-local'}
                                            onChange={handleChange}
                                        />
                                        <div className="type-name">Project (Local)</div>
                                    </label>
                                </div>

                                {formData.scope === 'user-local' && (
                                    <select
                                        name="scopePath"
                                        className="form-select mt-md"
                                        value={formData.scopePath}
                                        onChange={handleChange}
                                        required={formData.scope === 'user-local'}
                                        disabled={!!preSelectedProject}
                                    >
                                        <option value="">Select a project...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.path}>{p.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Stdio fields */}
                        {formData.type === 'stdio' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Command</label>
                                    <input
                                        type="text"
                                        name="command"
                                        className="form-input"
                                        value={formData.command}
                                        onChange={handleChange}
                                        placeholder="e.g., npx, node, python"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Arguments</label>
                                    <input
                                        type="text"
                                        name="args"
                                        className="form-input"
                                        value={formData.args}
                                        onChange={handleChange}
                                        placeholder="e.g., -y @modelcontextprotocol/server-filesystem /home"
                                    />
                                    <p className="form-hint">Space-separated arguments</p>
                                </div>
                            </>
                        )}

                        {/* HTTP/SSE fields */}
                        {(formData.type === 'http' || formData.type === 'sse') && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">URL</label>
                                    <input
                                        type="url"
                                        name="url"
                                        className="form-input"
                                        value={formData.url}
                                        onChange={handleChange}
                                        placeholder="https://mcp.example.com/api"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Headers (JSON)</label>
                                    <textarea
                                        name="headers"
                                        className="form-textarea"
                                        value={formData.headers}
                                        onChange={handleChange}
                                        placeholder='{"Authorization": "Bearer ${API_KEY}"}'
                                    />
                                    <p className="form-hint">Use ${'{VAR_NAME}'} for environment variables</p>
                                </div>
                            </>
                        )}

                        {/* Environment variables */}
                        <div className="form-group">
                            <label className="form-label">Environment Variables (JSON)</label>
                            <textarea
                                name="env"
                                className="form-textarea"
                                value={formData.env}
                                onChange={handleChange}
                                placeholder='{"API_KEY": "your-key-here"}'
                            />
                            <p className="form-hint">Optional environment variables for this server</p>
                        </div>

                        {/* Enabled toggle */}
                        <div className="form-group">
                            <label className="flex items-center gap-md" style={{ cursor: 'pointer' }}>
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        name="enabled"
                                        checked={formData.enabled}
                                        onChange={handleChange}
                                    />
                                    <span className="toggle-track"></span>
                                    <span className="toggle-thumb"></span>
                                </label>
                                <span>Enable server</span>
                            </label>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {isEditing ? 'Save Changes' : 'Add Server'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ServerModal;
