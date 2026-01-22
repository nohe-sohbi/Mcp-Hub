import { useState, useEffect } from 'react';
import { Download, Terminal, Globe, Radio, Trash2 } from 'lucide-react';
import { getMarketplace, getProjects, getServers, installTemplate, deleteServer } from '../services/api';

function Marketplace() {
    const [templates, setTemplates] = useState([]);
    const [projects, setProjects] = useState([]);
    const [installedServers, setInstalledServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(null);
    const [uninstalling, setUninstalling] = useState(null);
    const [selectedScope, setSelectedScope] = useState('global');
    const [selectedProject, setSelectedProject] = useState('');

    // Normalize name: "Sequential Thinking" -> "sequentialthinking"
    const normalize = (name) => name?.toLowerCase().replace(/[-\s_]/g, '') || '';

    // Find installed server by template id
    const findInstalledServer = (templateId) => {
        const normalizedTemplateId = normalize(templateId);
        return installedServers.find(s => normalize(s.name) === normalizedTemplateId);
    };

    useEffect(() => {
        Promise.all([getMarketplace(), getProjects(), getServers()])
            .then(([templatesData, projectsData, serversData]) => {
                setTemplates(templatesData);
                setProjects(projectsData);
                setInstalledServers(serversData);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleInstall = async (template) => {
        setInstalling(template.id);
        try {
            const result = await installTemplate({
                templateId: template.id,
                scope: selectedScope,
                scopePath: selectedScope === 'project' ? selectedProject : null
            });
            // Add to installed servers list
            setInstalledServers(prev => [...prev, {
                id: `${selectedScope}:${result.serverName}`,
                name: result.serverName,
                scope: selectedScope
            }]);
        } catch (error) {
            console.error('Failed to install:', error);
        } finally {
            setInstalling(null);
        }
    };

    const handleUninstall = async (template) => {
        const server = findInstalledServer(template.id);
        if (!server) return;

        setUninstalling(template.id);
        try {
            await deleteServer(server.id);
            // Remove from installed servers list
            setInstalledServers(prev => prev.filter(s => s.id !== server.id));
        } catch (error) {
            console.error('Failed to uninstall:', error);
        } finally {
            setUninstalling(null);
        }
    };

    const getTypeIcon = (config) => {
        if (config?.command) return <Terminal size={14} />;
        if (config?.type === 'sse') return <Radio size={14} />;
        return <Globe size={14} />;
    };

    const getTypeName = (config) => {
        if (config?.command) return 'stdio';
        if (config?.type === 'sse') return 'sse';
        return 'http';
    };

    const categories = templates.reduce((acc, t) => {
        const cat = t.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(t);
        return acc;
    }, {});

    const categoryLabels = {
        utility: 'Utilities',
        database: 'Databases',
        integration: 'Integrations',
        external: 'External Services',
        other: 'Other'
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div>
            <section className="section">
                <div className="section-header">
                    <p className="section-subtitle">Discover</p>
                    <h1 className="section-title">Marketplace</h1>
                </div>
                <p className="text-lg text-muted" style={{ maxWidth: '600px' }}>
                    Pre-configured MCP servers ready to install. Choose a scope and click install.
                </p>
            </section>

            <section className="mb-xl">
                <div className="card" style={{ maxWidth: '500px' }}>
                    <h3 className="text-xs text-muted mb-md">Installation Scope</h3>
                    <div className="type-selector mb-md">
                        <label className={`type-option ${selectedScope === 'global' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="scope"
                                value="global"
                                checked={selectedScope === 'global'}
                                onChange={(e) => setSelectedScope(e.target.value)}
                            />
                            <div className="type-name">Global</div>
                            <div className="type-desc">All projects</div>
                        </label>
                        <label className={`type-option ${selectedScope === 'project' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="scope"
                                value="project"
                                checked={selectedScope === 'project'}
                                onChange={(e) => setSelectedScope(e.target.value)}
                            />
                            <div className="type-name">Project</div>
                            <div className="type-desc">Specific project</div>
                        </label>
                    </div>

                    {selectedScope === 'project' && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <select
                                className="form-select"
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                            >
                                <option value="">Select a project...</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.path}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </section>

            {Object.entries(categories).map(([category, tmplts]) => (
                <section key={category} className="section">
                    <h2 className="heading-md font-serif mb-lg">
                        {categoryLabels[category] || category}
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 'var(--space-lg)'
                    }}>
                        {tmplts.map(template => {
                            const isInstalled = !!findInstalledServer(template.id);
                            const isInstalling = installing === template.id;
                            const isUninstalling = uninstalling === template.id;
                            const config = template.config?.[Object.keys(template.config)[0]] || template.config;

                            return (
                                <div key={template.id} className="card">
                                    <div className="card-header">
                                        <div>
                                            <div className="card-title">{template.name}</div>
                                            <div className="flex items-center gap-sm mt-sm">
                                                <span className="server-type">
                                                    {getTypeIcon(config)}
                                                    {getTypeName(config)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        {template.description && (
                                            <p className="mb-md">{template.description}</p>
                                        )}

                                        {config?.env && Object.keys(config.env).length > 0 && (
                                            <div className="mt-md">
                                                <span className="text-xs text-muted">Requires:</span>
                                                <div className="flex gap-sm mt-sm" style={{ flexWrap: 'wrap' }}>
                                                    {Object.keys(config.env).map(key => (
                                                        <code key={key} className="code-inline text-xs">{key}</code>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {config?.headers && Object.keys(config.headers).length > 0 && (
                                            <div className="mt-md">
                                                <span className="text-xs text-muted">Auth headers needed</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-actions">
                                        {isInstalled ? (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleUninstall(template)}
                                                disabled={isUninstalling}
                                            >
                                                {isUninstalling ? (
                                                    <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                                                ) : (
                                                    <>
                                                        <Trash2 size={14} />
                                                        Uninstall
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-accent"
                                                onClick={() => handleInstall(template)}
                                                disabled={isInstalling || (selectedScope === 'project' && !selectedProject)}
                                            >
                                                {isInstalling ? (
                                                    <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                                                ) : (
                                                    <>
                                                        <Download size={14} />
                                                        Install
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}

export default Marketplace;
