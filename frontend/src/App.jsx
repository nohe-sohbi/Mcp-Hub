import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Server,
    FolderOpen,
    Store,
    Archive,
    Settings as SettingsIcon,
    Menu,
    X,
    Sparkles
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import Projects from './pages/Projects';
import Marketplace from './pages/Marketplace';
import Backups from './pages/Backups';
import Settings from './pages/Settings';
import OnboardingTour from './components/OnboardingTour';
import { healthCheck, isDemoMode } from './services/api';

const TOUR_SEEN_KEY = 'mcp-demo-tour-seen-v1';

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [apiStatus, setApiStatus] = useState('checking');
    const [tourOpen, setTourOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Check API health (transparently falls back to demo mode on failure)
        healthCheck()
            .then(() => setApiStatus(isDemoMode() ? 'demo' : 'connected'))
            .catch(() => setApiStatus('disconnected'));
    }, []);

    // Auto-launch the guided tour on the very first visit.
    useEffect(() => {
        let seen = false;
        try {
            seen = window.localStorage.getItem(TOUR_SEEN_KEY) === '1';
        } catch {
            seen = false;
        }
        if (!seen) {
            const timer = setTimeout(() => setTourOpen(true), 600);
            return () => clearTimeout(timer);
        }
    }, []);

    const closeTour = () => {
        setTourOpen(false);
        try {
            window.localStorage.setItem(TOUR_SEEN_KEY, '1');
        } catch {
            // ignore
        }
    };

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
                    data-tour="demo-notice"
                    title="Environnement de démonstration : les données sont fictives et stockées localement dans votre navigateur. Certaines fonctionnalités sont simulées."
                >
                    <span className="badge badge-warning">Démo</span>
                    <span className="sidebar-demo-text">
                        Aperçu de démonstration — données fictives (locales), certaines fonctionnalités sont simulées.
                    </span>
                    <button className="sidebar-tour-btn" onClick={() => setTourOpen(true)}>
                        <Sparkles size={14} />
                        Visite guidée
                    </button>
                </div>

                <nav className="nav-section">
                    <div className="nav-label">Navigation</div>
                    <ul className="nav-list">
                        <li className="nav-item">
                            <NavLink to="/" data-tour="nav-dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <LayoutDashboard />
                                <span>Dashboard</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/servers" data-tour="nav-servers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <Server />
                                <span>Servers</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/projects" data-tour="nav-projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <FolderOpen />
                                <span>Projects</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/marketplace" data-tour="nav-marketplace" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <Store />
                                <span>Marketplace</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/backups" data-tour="nav-backups" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                                <Archive />
                                <span>Backups</span>
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/settings" data-tour="nav-settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
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
                                apiStatus === 'demo' ? 'Mode démo' :
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
                    <Route path="/backups" element={<Backups />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </main>

            <OnboardingTour open={tourOpen} onClose={closeTour} />
        </div>
    );
}

export default App;
