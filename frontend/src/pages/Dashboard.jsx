import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Server, FolderOpen, Store, ArrowRight, Zap } from 'lucide-react';
import { getServers, getProjects } from '../services/api';

function Dashboard() {
    const [servers, setServers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getServers(), getProjects()])
            .then(([serversData, projectsData]) => {
                setServers(serversData);
                setProjects(projectsData);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const globalServers = servers.filter(s => s.scope === 'global');
    const projectServers = servers.filter(s => s.scope !== 'global');
    const activeServers = servers.filter(s => s.enabled);

    if (loading) {
        return (
            <div className="loading">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div>
            {/* Hero section — editorial style */}
            <section className="section">
                <div className="section-header">
                    <p className="section-subtitle">Model Context Protocol</p>
                    <h1 className="section-title">Server Configuration</h1>
                </div>

                <p className="text-lg text-muted" style={{ maxWidth: '600px', lineHeight: 1.8 }}>
                    Manage your <span className="text-accent font-serif font-italic">MCP servers</span> across
                    all projects. Add integrations, configure environments, and streamline your Claude workflow.
                </p>
            </section>

            {/* Stats grid */}
            <section className="section">
                <div className="stat-grid">
                    <div className="stat-card">
                        <div className="stat-value">{servers.length}</div>
                        <div className="stat-label">Total Servers</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{activeServers.length}</div>
                        <div className="stat-label">Active</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{globalServers.length}</div>
                        <div className="stat-label">Global</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{projects.length}</div>
                        <div className="stat-label">Projects</div>
                    </div>
                </div>
            </section>

            {/* Quick actions — asymmetric grid */}
            <section className="section">
                <div className="editorial-grid">
                    <div>
                        <h2 className="heading-lg font-serif mb-lg">Quick Actions</h2>
                        <div className="flex flex-col gap-md">
                            <Link to="/servers" className="card" style={{ textDecoration: 'none' }}>
                                <div className="card-header">
                                    <div>
                                        <div className="card-title">Manage Servers</div>
                                        <div className="card-subtitle">Configure MCP endpoints</div>
                                    </div>
                                    <Server style={{ color: 'var(--color-accent)' }} />
                                </div>
                                <div className="card-body">
                                    View, edit, and toggle all your MCP server configurations.
                                </div>
                            </Link>

                            <Link to="/projects" className="card" style={{ textDecoration: 'none' }}>
                                <div className="card-header">
                                    <div>
                                        <div className="card-title">Browse Projects</div>
                                        <div className="card-subtitle">{projects.length} Claude projects</div>
                                    </div>
                                    <FolderOpen style={{ color: 'var(--color-accent)' }} />
                                </div>
                                <div className="card-body">
                                    Manage project-specific MCP configurations.
                                </div>
                            </Link>

                            <Link to="/marketplace" className="card" style={{ textDecoration: 'none' }}>
                                <div className="card-header">
                                    <div>
                                        <div className="card-title">Marketplace</div>
                                        <div className="card-subtitle">Discover integrations</div>
                                    </div>
                                    <Store style={{ color: 'var(--color-accent)' }} />
                                </div>
                                <div className="card-body">
                                    Install pre-configured MCP servers with one click.
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h2 className="heading-lg font-serif mb-lg">Recent Servers</h2>
                        {servers.length === 0 ? (
                            <div className="empty-state">
                                <Zap className="empty-icon" />
                                <h3 className="empty-title">No servers yet</h3>
                                <p className="empty-description">
                                    Add your first MCP server to get started.
                                </p>
                                <Link to="/marketplace" className="btn btn-primary">
                                    Browse Marketplace
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-sm">
                                {servers.slice(0, 5).map(server => (
                                    <div key={server.id} className={`card server-card ${server.enabled ? 'active' : 'inactive'}`}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="card-title" style={{ fontSize: 'var(--text-lg)' }}>{server.name}</div>
                                                <span className="server-type">{server.type}</span>
                                                {server.scopeName && (
                                                    <span className="server-scope ml-sm">• {server.scopeName}</span>
                                                )}
                                            </div>
                                            <span className={`badge ${server.enabled ? 'badge-success' : 'badge-muted'}`}>
                                                {server.enabled ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {servers.length > 5 && (
                                    <Link to="/servers" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                                        View all {servers.length} servers
                                        <ArrowRight size={16} />
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Dashboard;
