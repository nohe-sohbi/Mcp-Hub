import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Terminal, Globe, Radio, FolderOpen } from 'lucide-react';
import { getServers, getProjects, getProviders, addServer, updateServer, deleteServer, toggleServer } from '../services/api';
import ServerModal from '../components/ServerModal';
import ProviderBadge from '../components/ProviderBadge';

function Servers() {
    const [servers, setServers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [providerFilter, setProviderFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingServer, setEditingServer] = useState(null);

    const loadData = () => {
        setLoading(true);
        Promise.all([getServers(), getProjects(), getProviders()])
            .then(([serversData, projectsData, providersData]) => {
                setServers(serversData);
                setProjects(projectsData);
                setProviders(providersData.filter(p => p.active));
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleToggle = async (id) => {
        try {
            await toggleServer(id);
            loadData();
        } catch (error) {
            console.error('Failed to toggle server:', error);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Delete server "${name}"? This cannot be undone.`)) {
            try {
                await deleteServer(id);
                loadData();
            } catch (error) {
                console.error('Failed to delete server:', error);
            }
        }
    };

    const handleEdit = (server) => {
        setEditingServer(server);
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditingServer(null);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setEditingServer(null);
    };

    const handleModalSave = async (data) => {
        try {
            if (editingServer) {
                await updateServer(editingServer.id, data.config);
            } else {
                await addServer(data);
            }
            loadData();
            handleModalClose();
        } catch (error) {
            console.error('Failed to save server:', error);
        }
    };

    const filteredServers = servers.filter(s => {
        // Provider filter
        if (providerFilter !== 'all' && s.provider !== providerFilter) return false;
        // Scope/status filter
        if (filter === 'all') return true;
        if (filter === 'global') return s.scope === 'global';
        if (filter === 'project') return s.scope !== 'global';
        if (filter === 'active') return s.enabled;
        if (filter === 'inactive') return !s.enabled;
        return true;
    });

    const getTypeIcon = (type) => {
        switch (type) {
            case 'stdio': return <Terminal size={14} />;
            case 'http': return <Globe size={14} />;
            case 'sse': return <Radio size={14} />;
            default: return <Terminal size={14} />;
        }
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
            {/* Header */}
            <section className="section">
                <div className="section-header">
                    <p className="section-subtitle">Configuration</p>
                    <h1 className="section-title">MCP Servers</h1>
                </div>

                <div className="flex justify-between items-center">
                    <p className="text-muted">
                        {servers.length} server{servers.length !== 1 ? 's' : ''} configured
                    </p>
                    <button className="btn btn-primary" onClick={handleAdd}>
                        <Plus size={16} />
                        Add Server
                    </button>
                </div>
            </section>

            {/* Filters */}
            <section className="mb-xl">
                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                    <div className="flex gap-sm">
                        {['all', 'global', 'project', 'active', 'inactive'].map(f => (
                            <button
                                key={f}
                                className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setFilter(f)}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    {providers.length > 1 && (
                        <div className="flex gap-sm items-center">
                            <span className="text-muted text-sm">Provider:</span>
                            <select
                                className="form-select"
                                value={providerFilter}
                                onChange={(e) => setProviderFilter(e.target.value)}
                                style={{ minWidth: '150px' }}
                            >
                                <option value="all">All providers</option>
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </section>

            {/* Server list */}
            <section>
                {filteredServers.length === 0 ? (
                    <div className="empty-state">
                        <Terminal className="empty-icon" />
                        <h3 className="empty-title">No servers found</h3>
                        <p className="empty-description">
                            {filter !== 'all'
                                ? 'Try changing your filter or add a new server.'
                                : 'Add your first MCP server to get started.'}
                        </p>
                        <button className="btn btn-primary" onClick={handleAdd}>
                            <Plus size={16} />
                            Add Server
                        </button>
                    </div>
                ) : (
                    <div className="editorial-grid--thirds" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 'var(--space-lg)'
                    }}>
                        {filteredServers.map(server => (
                            <div key={server.id} className={`card server-card ${server.enabled ? 'active' : 'inactive'}`}>
                                <div className="card-header">
                                    <div>
                                        <div className="card-title">{server.name}</div>
                                        <div className="flex items-center gap-sm mt-sm" style={{ flexWrap: 'wrap' }}>
                                            <span className="server-type">
                                                {getTypeIcon(server.type)}
                                                {server.type}
                                            </span>
                                            {server.provider && (
                                                <ProviderBadge
                                                    providerId={server.provider}
                                                    providerName={server.providerName}
                                                    small
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={server.enabled}
                                            onChange={() => handleToggle(server.id)}
                                        />
                                        <span className="toggle-track"></span>
                                        <span className="toggle-thumb"></span>
                                    </label>
                                </div>

                                <div className="card-body">
                                    {server.scope === 'global' ? (
                                        <span className="badge badge-muted">
                                            <Globe size={12} />
                                            Global
                                        </span>
                                    ) : server.scope === 'user-local' ? (
                                        <span className="badge badge-success">
                                            <FolderOpen size={12} />
                                            {server.scopeName} (Local)
                                        </span>
                                    ) : (
                                        <span className="badge badge-muted">
                                            <FolderOpen size={12} />
                                            {server.scopeName || 'Project'}
                                        </span>
                                    )}

                                    {/* Show config preview */}
                                    <div className="mt-md">
                                        {server.type === 'stdio' && server.config?.command && (
                                            <code className="code-inline">
                                                {server.config.command} {server.config.args?.slice(0, 2).join(' ')}...
                                            </code>
                                        )}
                                        {(server.type === 'http' || server.type === 'sse') && server.config?.url && (
                                            <code className="code-inline" style={{ wordBreak: 'break-all' }}>
                                                {server.config.url}
                                            </code>
                                        )}
                                    </div>
                                </div>

                                <div className="card-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(server)}>
                                        <Edit3 size={14} />
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleDelete(server.id, server.name)}
                                        style={{ color: 'var(--color-error)' }}
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Modal */}
            {showModal && (
                <ServerModal
                    server={editingServer}
                    projects={projects}
                    onClose={handleModalClose}
                    onSave={handleModalSave}
                />
            )}
        </div>
    );
}

export default Servers;
