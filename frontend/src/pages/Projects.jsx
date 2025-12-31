import { useState, useEffect } from 'react';
import { FolderOpen, Server, ChevronRight, MapPin, Plus } from 'lucide-react';
import { getProjects, getServers, toggleServer } from '../services/api';
import ServerModal from '../components/ServerModal';

function Projects() {
    const [projects, setProjects] = useState([]);
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedProject, setExpandedProject] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);

    const loadData = () => {
        setLoading(true);
        Promise.all([getProjects(), getServers()])
            .then(([projectsData, serversData]) => {
                setProjects(projectsData);
                setServers(serversData);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const getProjectServers = (projectPath) => {
        return servers.filter(s => s.scopePath === projectPath);
    };

    const handleToggle = async (serverId) => {
        try {
            await toggleServer(serverId);
            loadData();
        } catch (error) {
            console.error('Failed to toggle server:', error);
        }
    };

    const handleAddServer = (project) => {
        setSelectedProject(project);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedProject(null);
    };

    const handleModalSave = async () => {
        loadData();
        handleModalClose();
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
                    <p className="section-subtitle">Workspaces</p>
                    <h1 className="section-title">Claude Projects</h1>
                </div>

                <p className="text-lg text-muted" style={{ maxWidth: '600px' }}>
                    Each project can have its own <span className="text-accent font-serif font-italic">local MCP configuration</span>,
                    allowing context-specific integrations.
                </p>
            </section>

            {/* Projects list */}
            <section>
                {projects.length === 0 ? (
                    <div className="empty-state">
                        <FolderOpen className="empty-icon" />
                        <h3 className="empty-title">No projects found</h3>
                        <p className="empty-description">
                            Open a project in Claude to have it appear here.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-md">
                        {projects.map(project => {
                            const projectServers = getProjectServers(project.path);
                            const isExpanded = expandedProject === project.id;

                            return (
                                <div key={project.id} className="card card--editorial">
                                    <div className="card-header">
                                        <div
                                            style={{ flex: 1, cursor: 'pointer' }}
                                            onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                        >
                                            <div className="flex items-center gap-sm">
                                                <FolderOpen
                                                    size={20}
                                                    style={{ color: project.hasMcpConfig ? 'var(--color-accent)' : 'var(--color-text-light)' }}
                                                />
                                                <span className="card-title">{project.name}</span>
                                                {projectServers.length > 0 && (
                                                    <span className="badge badge-success">
                                                        {projectServers.length} server{projectServers.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-sm mt-sm text-sm text-muted">
                                                <MapPin size={12} />
                                                <code style={{ fontSize: 'var(--text-xs)' }}>{project.path}</code>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-md">
                                            <button
                                                className="btn btn-accent btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddServer(project);
                                                }}
                                            >
                                                <Plus size={14} />
                                                Add Server
                                            </button>
                                            <ChevronRight
                                                size={20}
                                                style={{
                                                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                                                    transition: 'transform var(--transition-fast)',
                                                    color: 'var(--color-text-light)',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                            />
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-lg" style={{ paddingLeft: 'var(--space-xl)' }}>
                                            {/* Config locations */}
                                            <div className="mb-lg">
                                                <h4 className="text-xs text-muted mb-sm">Configuration Locations</h4>
                                                <div className="flex flex-col gap-sm">
                                                    <div className="flex items-center gap-sm">
                                                        <span className={`badge ${project.mcpLocations?.project ? 'badge-success' : 'badge-muted'}`}>
                                                            Project .mcp.json
                                                        </span>
                                                        {project.mcpLocations?.project && (
                                                            <code className="text-xs text-light">{project.mcpLocations.project}</code>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-sm">
                                                        <span className={`badge ${project.mcpLocations?.claude ? 'badge-success' : 'badge-muted'}`}>
                                                            Claude config
                                                        </span>
                                                        {project.mcpLocations?.claude && (
                                                            <code className="text-xs text-light">{project.mcpLocations.claude}</code>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Project servers */}
                                            {projectServers.length > 0 ? (
                                                <div>
                                                    <h4 className="text-xs text-muted mb-sm">Configured Servers</h4>
                                                    <div className="flex flex-col gap-sm">
                                                        {projectServers.map(server => (
                                                            <div key={server.id} className="flex items-center gap-md" style={{
                                                                padding: 'var(--space-sm)',
                                                                background: 'var(--color-bg-alt)',
                                                                borderRadius: '4px'
                                                            }}>
                                                                <Server size={14} style={{ color: 'var(--color-text-light)' }} />
                                                                <span className="font-serif" style={{ flex: 1 }}>{server.name}</span>
                                                                <span className="server-type">{server.type}</span>
                                                                <span className={`badge ${server.enabled ? 'badge-success' : 'badge-muted'}`}>
                                                                    {server.enabled ? 'Active' : 'Inactive'}
                                                                </span>
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
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted font-italic">
                                                    No MCP servers configured for this project.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Modal */}
            {showModal && selectedProject && (
                <ServerModal
                    server={null}
                    projects={projects}
                    onClose={handleModalClose}
                    onSave={handleModalSave}
                    preSelectedProject={selectedProject}
                />
            )}
        </div>
    );
}

export default Projects;
