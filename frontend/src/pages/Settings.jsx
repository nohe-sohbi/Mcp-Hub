import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Check, AlertCircle } from 'lucide-react';
import { getProviders, getProviderConfig, updateProviderConfig } from '../services/api';

const PROVIDER_COLORS = {
    'claude-code': '#3B82F6',
    'claude-desktop': '#8B5CF6',
    'opencode': '#10B981'
};

function Settings() {
    const [providers, setProviders] = useState([]);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [providersData, configData] = await Promise.all([
                getProviders(),
                getProviderConfig()
            ]);
            setProviders(providersData);
            setConfig(configData);
        } catch (error) {
            console.error('Failed to load settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleProvider = async (providerId) => {
        const isActive = config.activeProviders.includes(providerId);

        // Don't allow deactivating the last provider
        if (isActive && config.activeProviders.length === 1) {
            setMessage({ type: 'error', text: 'At least one provider must be active' });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        const newActiveProviders = isActive
            ? config.activeProviders.filter(id => id !== providerId)
            : [...config.activeProviders, providerId];

        // If deactivating default, set new default
        let newDefaultProvider = config.defaultProvider;
        if (isActive && config.defaultProvider === providerId) {
            newDefaultProvider = newActiveProviders[0];
        }

        await saveConfig({
            activeProviders: newActiveProviders,
            defaultProvider: newDefaultProvider
        });
    };

    const handleSetDefault = async (providerId) => {
        if (!config.activeProviders.includes(providerId)) {
            // Activate it first
            await saveConfig({
                activeProviders: [...config.activeProviders, providerId],
                defaultProvider: providerId
            });
        } else {
            await saveConfig({ defaultProvider: providerId });
        }
    };

    const handleToggleSync = async () => {
        await saveConfig({ syncOnInstall: !config.syncOnInstall });
    };

    const saveConfig = async (updates) => {
        setSaving(true);
        try {
            const newConfig = await updateProviderConfig(updates);
            setConfig(newConfig);
            setMessage({ type: 'success', text: 'Settings saved' });
            setTimeout(() => setMessage(null), 2000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
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
            <section className="section">
                <div className="section-header">
                    <p className="section-subtitle">Configure</p>
                    <h1 className="section-title">Settings</h1>
                </div>
            </section>

            {message && (
                <div
                    className={`card mb-lg`}
                    style={{
                        backgroundColor: message.type === 'error' ? '#FEE2E2' : '#DCFCE7',
                        borderColor: message.type === 'error' ? '#EF4444' : '#22C55E'
                    }}
                >
                    <div className="flex items-center gap-md">
                        {message.type === 'error' ? (
                            <AlertCircle size={18} color="#EF4444" />
                        ) : (
                            <Check size={18} color="#22C55E" />
                        )}
                        <span style={{ color: message.type === 'error' ? '#991B1B' : '#166534' }}>
                            {message.text}
                        </span>
                    </div>
                </div>
            )}

            <section className="section">
                <h2 className="heading-md font-serif mb-lg">Providers</h2>
                <p className="text-muted mb-lg">
                    Select which providers to manage. Servers will be read from and installed to active providers.
                </p>

                <div className="card">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {providers.map(provider => {
                            const isActive = config?.activeProviders?.includes(provider.id);
                            const isDefault = config?.defaultProvider === provider.id;
                            const color = PROVIDER_COLORS[provider.id] || '#6B7280';

                            return (
                                <div
                                    key={provider.id}
                                    className="flex items-center"
                                    style={{
                                        padding: 'var(--space-md)',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid var(--border)',
                                        backgroundColor: isActive ? `${color}10` : 'transparent',
                                        opacity: provider.installed ? 1 : 0.5
                                    }}
                                >
                                    <label className="flex items-center gap-md" style={{ flex: 1, cursor: provider.installed ? 'pointer' : 'not-allowed' }}>
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            onChange={() => handleToggleProvider(provider.id)}
                                            disabled={!provider.installed || saving}
                                            style={{ width: 18, height: 18 }}
                                        />
                                        <div>
                                            <div className="flex items-center gap-sm">
                                                <span
                                                    style={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        backgroundColor: color
                                                    }}
                                                />
                                                <span style={{ fontWeight: 500 }}>{provider.name}</span>
                                                {isDefault && (
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            backgroundColor: color,
                                                            color: 'white'
                                                        }}
                                                    >
                                                        Default
                                                    </span>
                                                )}
                                                {!provider.installed && (
                                                    <span className="text-xs text-muted">(not installed)</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted mt-xs">
                                                {provider.globalConfigPath}
                                            </div>
                                        </div>
                                    </label>

                                    {provider.installed && isActive && !isDefault && (
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => handleSetDefault(provider.id)}
                                            disabled={saving}
                                            style={{ fontSize: '12px' }}
                                        >
                                            Set as default
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="section">
                <h2 className="heading-md font-serif mb-lg">Installation Behavior</h2>

                <div className="card">
                    <label className="flex items-center gap-md" style={{ cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={config?.syncOnInstall || false}
                            onChange={handleToggleSync}
                            disabled={saving}
                            style={{ width: 18, height: 18 }}
                        />
                        <div>
                            <div style={{ fontWeight: 500 }}>Sync to all active providers</div>
                            <div className="text-sm text-muted">
                                When enabled, installing a server will add it to all active providers at once
                            </div>
                        </div>
                    </label>
                </div>
            </section>

            <section className="section">
                <h2 className="heading-md font-serif mb-lg">Provider Details</h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 'var(--space-lg)'
                }}>
                    {providers.map(provider => {
                        const color = PROVIDER_COLORS[provider.id] || '#6B7280';

                        return (
                            <div key={provider.id} className="card">
                                <div className="card-header">
                                    <div className="flex items-center gap-sm">
                                        <span
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                backgroundColor: color
                                            }}
                                        />
                                        <span className="card-title">{provider.name}</span>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="text-sm mb-sm">
                                        <span className="text-muted">Status: </span>
                                        <span style={{ color: provider.installed ? '#22C55E' : '#EF4444' }}>
                                            {provider.installed ? 'Installed' : 'Not installed'}
                                        </span>
                                    </div>
                                    <div className="text-sm mb-sm">
                                        <span className="text-muted">Projects: </span>
                                        {provider.supportsProjects ? 'Supported' : 'Not supported'}
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-muted">Config: </span>
                                        <code className="code-inline text-xs" style={{ wordBreak: 'break-all' }}>
                                            {provider.globalConfigPath}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

export default Settings;
