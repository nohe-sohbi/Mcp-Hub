import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Server,
    FolderOpen,
    Store,
    Settings as SettingsIcon,
    Menu,
    X
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import Projects from './pages/Projects';
import Marketplace from './pages/Marketplace';
import Settings from './pages/Settings';
import { healthCheck } from './services/api';

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [apiStatus, setApiStatus] = useState('checking');
    const location = useLocation();

    useEffect(() => {
        // Check API health
        healthCheck()
            .then(() => setApiStatus('connected'))
            .catch(() => setApiStatus('disconnected'));
    }, []);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location]);

    return (
        <div className="app-layout">
            {/* Mobile menu toggle */}
            <button
                className="btn btn-ghost mobile-menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                    display: 'none',
                    position: 'fixed',
                    top: '1rem',
                    left: '1rem',
                    zIndex: 101
                }}
            >
                {sidebarOpen ? <X /> : <Menu />}
            </button>

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">MCP Manager</div>
                <div className="sidebar-tagline">Protocol Configuration</div>

                <div
                    className="sidebar-demo-notice"
                    title="Environnement de démonstration : les données peuvent être réinitialisées à tout moment et certaines fonctionnalités sont limitées ou instables."
                >
                    <span className="badge badge-warning">Démo</span>
                    <span className="sidebar-demo-text">
                        Aperçu de démonstration — données non persistantes, certaines fonctionnalités sont limitées.
                    </span>
                </div>

                <nav className="nav-section">
                    <div className="nav-label">Navigation</div>
                    <ul className="nav-list">
                        <li className="nav-item">
                            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <LayoutDashboard />
                                <span>Dashboard</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/servers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <Server />
                                <span>Servers</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <FolderOpen />
                                <span>Projects</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/marketplace" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <Store />
                                <span>Marketplace</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <SettingsIcon />
                                <span>Settings</span>
                            </NavLink>
                        </li>
                    </ul>
                </nav>

                <div className="nav-section" style={{ marginTop: 'auto' }}>
                    <div className="nav-label">Status</div>
                    <div className="flex items-center gap-sm" style={{ padding: '0.5rem 1rem' }}>
                        <div
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: apiStatus === 'connected' ? 'var(--color-success)' :
                                    apiStatus === 'disconnected' ? 'var(--color-error)' :
                                        'var(--color-warning)'
                            }}
                        />
                        <span className="text-sm text-muted">
                            {apiStatus === 'connected' ? 'API Connected' :
                                apiStatus === 'disconnected' ? 'API Offline' :
                                    'Checking...'}
                        </span>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/servers" element={<Servers />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
